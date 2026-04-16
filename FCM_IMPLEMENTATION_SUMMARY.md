# Firebase Cloud Messaging Implementation Summary

## Overview

This document summarizes the push notification feature implementation using Firebase Cloud Messaging (FCM) for ChatConnect.

## Requirements Met

✅ Send notification when user is offline
✅ Include sender name + message preview
✅ Trigger on new message event
✅ Integrate with Spring Boot backend
✅ React frontend receives and displays notifications

## Backend Implementation

### New Files Created

1. **Entity & Repository**
   - `notification/DeviceToken.java` - JPA entity for storing device tokens
   - `notification/DeviceTokenRepository.java` - Repository with custom queries

2. **DTOs**
   - `notification/dto/RegisterDeviceTokenRequest.java` - Request DTO for token registration

3. **Services**
   - `notification/service/NotificationService.java` - FCM notification service
     - `sendOfflineNotification()` - Sends notifications to offline users
     - `registerDeviceToken()` - Registers device tokens
     - `deactivateToken()` - Invalidates tokens
     - `deactivateAllUserTokens()` - Cleanup on logout

4. **Configuration**
   - `notification/config/FirebaseConfig.java` - Firebase initialization

5. **Controller**
   - `notification/NotificationController.java` - REST endpoints for token management
     - `POST /api/notifications/device-token` - Register token
     - `DELETE /api/notifications/device-token` - Deactivate token
     - `DELETE /api/notifications/device-tokens/all` - Logout cleanup

### Modified Files

1. **pom.xml**
   - Added Firebase Admin SDK dependency (`com.google.firebase:firebase-admin`)

2. **application.properties**
   - Added `firebase.config.path` configuration

3. **MessageService.java**
   - Added `NotificationService` dependency
   - Modified `sendMessage()` to trigger notifications for offline users
   - Checks user presence and sends FCM notification if offline

4. **Database Schema**
   - New `device_tokens` table with indexes for performance

## Frontend Implementation

### New Files Created

1. **Services**
   - `services/firebaseService.js` - Firebase initialization and messaging setup
     - `initializeFirebase()` - Initializes Firebase app
     - `requestNotificationPermission()` - Asks browser for permission
     - `setupMessageListener()` - Listens for foreground messages
     - `getTokenFromFirebase()` - Retrieves FCM token

   - `services/notificationService.js` - Device token management
     - `registerDeviceToken()` - Registers token with backend
     - `deactivateDeviceToken()` - Deactivates single token
     - `deactivateAllDeviceTokens()` - Logout cleanup
     - `getDeviceName()` - Detects device name from user agent

2. **Hooks**
   - `hooks/useNotification.js` - React hook for notification setup
     - Initializes Firebase on mount
     - Registers device tokens
     - Sets up message listener
     - Cleanup on logout

3. **Components**
   - `components/NotificationSetup.jsx` - Component wrapper for notification setup
     - Should be added to main App component

4. **Service Worker**
   - `public/firebase-messaging-sw.js` - Handles background notifications
     - Receives push messages when app is closed
     - Shows native notifications
     - Handles notification clicks

5. **Configuration**
   - `.env.example` - Updated with Firebase configuration variables

### Modified Files

1. **package.json**
   - Added Firebase dependency (`firebase`)

## Key Features

### 1. Offline Detection
- Uses existing `PresenceService` to check if user is online
- Only sends notifications when recipient is truly offline
- Prevents duplicate messages (one via WebSocket, one via notification)

### 2. Message Preview
- Truncates message to 100 characters for preview
- Shows sender name in notification title
- Displays message content as notification body

### 3. Multi-Device Support
- Users can be registered on multiple devices/browsers
- Each device gets unique FCM token
- Notifications sent to all active tokens

### 4. Token Management
- Tokens stored in `device_tokens` table
- Automatic cleanup of invalid tokens
- Manual cleanup on logout
- Tracks device name and type

### 5. Graceful Degradation
- If Firebase not configured, app starts without FCM
- Push notifications are optional feature
- Doesn't block app functionality if disabled

## Database Changes

### New Table: device_tokens

```sql
CREATE TABLE device_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token LONGTEXT NOT NULL,
  is_active BOOLEAN,
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  last_used_at TIMESTAMP,
  UNIQUE (user_id, token),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Configuration Files

### Backend - application.properties

```properties
firebase.config.path=${FIREBASE_CONFIG_PATH:}
```

### Frontend - .env

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

## Integration Steps

1. **Backend**
   - Place Firebase service account JSON at configured path
   - Run migrations or let Hibernate create tables
   - Build and run backend

2. **Frontend**
   - Install dependencies: `npm install`
   - Configure `.env` with Firebase credentials
   - Add `<NotificationSetup />` to App component
   - Build and run frontend

## API Endpoints

### Device Token Management

**Register Token**
```
POST /api/notifications/device-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "fcm_token",
  "deviceName": "Chrome Browser",
  "deviceType": "WEB"
}
```

**Deactivate Token**
```
DELETE /api/notifications/device-token?token=fcm_token
Authorization: Bearer <token>
```

**Deactivate All Tokens (Logout)**
```
DELETE /api/notifications/device-tokens/all
Authorization: Bearer <token>
```

## Notification Flow

1. **User 1 sends message to User 2**
   - Message saved to database
   - Message broadcast via WebSocket
   - If User 2 is offline, FCM notification triggered

2. **User 2 is offline**
   - FCM sends push notification to all registered devices
   - Native notification appears on browser/device
   - Notification shows sender name + message preview

3. **User 2 clicks notification**
   - App opens/focuses
   - User eventually sees message via WebSocket (if reconnected)

## Testing Recommendations

1. **Unit Tests** - NotificationService logic
2. **Integration Tests** - Token registration endpoints
3. **Manual Testing** - End-to-end notification flow
4. **Multi-device Testing** - Register multiple tokens per user

## Performance Considerations

- Device tokens are indexed by user_id and is_active
- FCM sends are async and non-blocking
- Invalid tokens cleaned up automatically
- Each user typically has 1-3 active tokens

## Security Considerations

- Firebase credentials only in environment variables
- Service account JSON never committed to git
- Device tokens are unique per browser/device
- Token deactivation on logout prevents reuse
- All endpoints require authentication

## Future Enhancements

1. Notification preferences per user (mute notifications)
2. Multiple notification channels (direct messages, group chats, etc.)
3. Notification statistics and analytics
4. Sound/vibration customization
5. Action buttons in notifications (quick reply, mute conversation)
6. Notification deduplication within time window

## Dependencies

### Backend
- Firebase Admin SDK 9.2.0
- Spring Boot 4.0.2
- Spring Data JPA

### Frontend
- Firebase (Compat) 10.8.1
- React 19.2.0
- Axios (for API calls)

## Documentation

See `FIREBASE_SETUP_GUIDE.md` for detailed setup instructions.
