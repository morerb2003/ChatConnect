# Firebase Cloud Messaging - Architecture & Flow

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHATCONNECT                               │
└─────────────────────────────────────────────────────────────────┘

                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
    ┌────────────┐                         ┌──────────────┐
    │  Frontend  │                         │   Backend    │
    │  (React)   │                         │ (Spring Boot)│
    └────────────┘                         └──────────────┘
        │                                       │
        ├─ NotificationSetup                   ├─ NotificationService
        │  Component                           │  (FCM Logic)
        ├─ firebaseService.js                  ├─ NotificationController
        │  (Firebase Init)                     │  (REST Endpoints)
        ├─ useNotification                     ├─ DeviceTokenRepository
        │  Hook                                │  (Token Storage)
        ├─ notificationService.js              ├─ MessageService
        │  (Token Registration)                │  (Modified for FCM)
        └─ Service Worker                      └─ FirebaseConfig
           (Background Notifications)              (Firebase Init)
               │                                   │
               │                                   │
               └───────────────┬───────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
            ┌─────────────────┐   ┌──────────────┐
            │  Firebase Cloud │   │   Database   │
            │    Messaging    │   │    MySQL     │
            │     (Google)    │   │              │
            └─────────────────┘   └──────────────┘
                    │                     │
                    │              ┌──────┴──────┐
                    │              │             │
                    │              ▼             ▼
                    │          device_tokens  messages
                    │          (FCM tokens)   (Chat)
                    │
                    └──→ Push Notifications
                         (Browser/Device)
```

## Message Sending Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User A: Sends Message "Hello"                                    │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Message received by Backend   │
        │  ChatWebSocketController       │
        └───────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  MessageService.sendMessage() │
        │  1. Save to database          │
        │  2. Broadcast via WebSocket   │
        └───────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │  Check User B Status          │
        │  PresenceService.isOnline()   │
        └───────────────────────────────┘
                        │
                ┌───────┴────────┐
                │                │
         ONLINE │                │ OFFLINE
                ▼                ▼
        ┌──────────────┐  ┌─────────────────────┐
        │ Message sent │  │ NotificationService │
        │ via STOMP    │  │ .sendOfflineNotif() │
        │ (WebSocket)  │  │ 1. Get device tokens│
        └──────────────┘  │ 2. Send FCM message │
                          │ 3. Update metadata  │
                          └─────────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │ Firebase Cloud   │
                          │ Messaging        │
                          └──────────────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
            FOREGROUND                       BACKGROUND
                (App Open)                    (App Closed)
                    │                                │
                    ▼                                ▼
            ┌──────────────────┐          ┌──────────────────┐
            │ setupMessageListener│        │ Service Worker   │
            │ Shows In-App      │          │ Shows Native     │
            │ Notification      │          │ Notification     │
            └──────────────────┘          └──────────────────┘
                    │                                │
                    └────────────┬───────────────────┘
                                 ▼
                        ┌──────────────────┐
                        │ User B sees      │
                        │ Notification:    │
                        │ "User A: Hello"  │
                        └──────────────────┘
```

## Component Interaction Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    React App (App.jsx)                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │       NotificationSetup Component               │   │
│  │  (Runs once on app load)                        │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ useNotification Hook                            │   │
│  │  ├─ Calls initializeFirebase()                  │   │
│  │  ├─ Calls requestNotificationPermission()       │   │
│  │  ├─ Registers Service Worker                    │   │
│  │  ├─ Gets FCM Token from Firebase                │   │
│  │  ├─ Calls notificationService.registerToken()   │   │
│  │  └─ Sets up message listener                    │   │
│  └─────────────────────────────────────────────────┘   │
│             │                                           │
│             ▼                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │    NotificationService (notificationService.js) │   │
│  │                                                 │   │
│  │ • registerDeviceToken()                         │   │
│  │   Calls: POST /api/notifications/device-token   │   │
│  │                                                 │   │
│  │ • deactivateDeviceToken()                       │   │
│  │   Calls: DELETE /api/notifications/device-token │   │
│  │                                                 │   │
│  │ • getDeviceName()                               │   │
│  │   Gets device info from user agent              │   │
│  └─────────────────────────────────────────────────┘   │
│             │                                           │
│             ▼                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │   FirebaseService (firebaseService.js)          │   │
│  │                                                 │   │
│  │ • initializeFirebase()                          │   │
│  │ • requestNotificationPermission()               │   │
│  │ • setupMessageListener()                        │   │
│  │ • getTokenFromFirebase()                        │   │
│  └─────────────────────────────────────────────────┘   │
│             │                                           │
│             ▼                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │   Firebase SDK (firebase-app-compat.js)         │   │
│  │                                                 │   │
│  │ Communicates with Google Firebase servers       │   │
│  │ • Token generation                              │   │
│  │ • Message subscription                          │   │
│  │ • Token refresh                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└──────────────────────────────────────────────────────────┘

                        │
                        ▼

┌──────────────────────────────────────────────────────────┐
│              SERVICE WORKER (In background)              │
│        firebase-messaging-sw.js                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ • Listens for 'push' events                             │
│ • Receives FCM messages when page is closed             │
│ • Shows native browser notifications                    │
│ • Handles notification clicks                           │
│ • Opens app when user clicks notification               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Backend Notification Service Flow

```
┌──────────────────────────────────────────────────────┐
│  MessageService.sendMessage()                        │
│  (New Message Event)                                 │
├──────────────────────────────────────────────────────┤
│                                                      │
│ 1. Save message to database                         │
│ 2. Broadcast via WebSocket                          │
│ 3. Check if receiver is offline:                    │
│    presenceService.isUserOnline(email)              │
│                                                      │
│    ┌──────────────────────────────────────┐        │
│    │ If Offline:                          │        │
│    ├──────────────────────────────────────┤        │
│    │ notificationService.               │        │
│    │ sendOfflineNotification(            │        │
│    │   receiver,                         │        │
│    │   senderName,                       │        │
│    │   messageContent,                   │        │
│    │   "newMessage"                      │        │
│    │ )                                   │        │
│    └──────────────────────────────────────┘        │
│                  │                                  │
│                  ▼                                  │
│    ┌─────────────────────────────────────┐        │
│    │  Get active device tokens for user  │        │
│    │  deviceTokenRepository.             │        │
│    │  findByUserAndIsActiveTrue()         │        │
│    └─────────────────────────────────────┘        │
│                  │                                  │
│                  ▼                                  │
│    ┌─────────────────────────────────────┐        │
│    │  For each device token:             │        │
│    │  FirebaseMessaging.getInstance()    │        │
│    │  .send(message)                     │        │
│    │                                     │        │
│    │  Notification includes:             │        │
│    │  • Title: Sender Name               │        │
│    │  • Body: Message Preview (100 chars)│        │
│    │  • Type: newMessage                 │        │
│    │  • Timestamp                        │        │
│    └─────────────────────────────────────┘        │
│                  │                                  │
│                  ▼                                  │
│    ┌─────────────────────────────────────┐        │
│    │  Firebase Cloud Messaging           │        │
│    │  (Sends to client devices)          │        │
│    └─────────────────────────────────────┘        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Database Schema

```
┌─────────────────────────────────┐
│       USERS TABLE               │
├─────────────────────────────────┤
│ id: Long (PK)                   │
│ email: String (UNIQUE)          │
│ name: String                    │
│ password: String                │
│ profileImageUrl: String         │
│ role: Enum                      │
│ createdAt: Timestamp            │
└─────────────────────────────────┘
          │
          │ (1:N)
          │
          ▼
┌─────────────────────────────────┐
│   DEVICE_TOKENS TABLE (NEW)     │
├─────────────────────────────────┤
│ id: Long (PK)                   │
│ user_id: Long (FK) ──┐          │
│ token: String        │          │
│ is_active: Boolean   │          │
│ device_name: String  │          │
│ device_type: String  │          │
│ created_at: Timestamp│          │
│ updated_at: Timestamp│          │
│ last_used_at: Timestamp         │
├─────────────────────────────────┤
│ UNIQUE(user_id, token)          │
│ INDEX(user_id, is_active)       │
└─────────────────────────────────┘
          │
          │ (N:1)
          └─→ relates to USERS
```

## Timeline: Message to Notification

```
Timeline (Example):
─────────────────────────────────────────────────────────

0ms     User A sends message
         │
10ms    Message saved to DB
         │
20ms    Message broadcast via WebSocket
         │
25ms    System checks: Is User B online?
         │
30ms    ❌ User B is OFFLINE
         │
35ms    Get active device tokens for User B
         │ (Query: 2 devices found)
         │
40ms    Send FCM message to Firebase
         │ FCM Message #1: Token A
         │ FCM Message #2: Token B
         │
50ms    Firebase routes to devices
         │
100ms   Device A: Native notification appears
         │ "User A: Hello there!"
         │
105ms   Device B: Native notification appears
         │ "User A: Hello there!"
         │
user clicks notification on Device A
         │
150ms   App opens/focuses
         │
160ms   User B now online (WebSocket reconnects)
         │
170ms   Message delivered via WebSocket
         │
180ms   Message displayed in chat UI

Total: ~180ms from send to display
```

## Error Handling Flow

```
┌──────────────────────────────────┐
│  Invalid/Expired Token Detected  │
│  (FCM returns error)              │
└──────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────┐
│  NotificationService catches     │
│  FirebaseMessagingException      │
└──────────────────────────────────┘
                │
       ┌────────┴────────┐
       │                 │
       ▼                 ▼
   INVALID_TOKEN    OTHER_ERROR
       │                 │
       ▼                 ▼
  Mark as inactive    Log error
  (is_active=false)   Continue
       │
       ▼
  Next message won't
  use this token
  (auto-filtered)
```

---

This architecture ensures:
- ✅ Reliable offline detection
- ✅ Multi-device support
- ✅ Graceful error handling
- ✅ Automatic cleanup
- ✅ Minimal performance impact
