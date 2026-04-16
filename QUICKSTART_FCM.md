# Firebase Cloud Messaging - Quick Start

## What's Been Implemented

A complete push notification system for ChatConnect using Firebase Cloud Messaging:

✅ **Offline Detection** - Notifications only sent when recipient is offline
✅ **Sender Info** - Shows sender name in notification title
✅ **Message Preview** - Displays message preview in notification body (truncated to 100 chars)
✅ **Backend Integration** - Spring Boot service for FCM management
✅ **Frontend Integration** - React components and hooks for notification setup
✅ **Multi-Device Support** - Users can receive notifications on multiple devices
✅ **Token Management** - Automatic registration, cleanup, and invalidation

---

## Quick Start (5 Steps)

### 1️⃣ Backend Setup

**Set Firebase Credentials Path:**
```bash
# Linux/Mac
export FIREBASE_CONFIG_PATH=./firebase-service-account.json

# Windows PowerShell
$env:FIREBASE_CONFIG_PATH = "./firebase-service-account.json"
```

**Download Firebase Service Account Key:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → Project Settings (⚙️)
3. Cloud Messaging tab → Generate Key Pair
4. Save as `firebase-service-account.json` in backend root

**Build Backend:**
```bash
cd chatconnecting
mvn clean install
```

### 2️⃣ Frontend Dependencies

```bash
cd Frontend
npm install
```

### 3️⃣ Frontend Configuration

Create `.env` file in Frontend directory:
```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=http://localhost:8080/ws
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key
```

Get these values from Firebase Console → Project Settings → Your apps section.

### 4️⃣ Add Notification Component

In `Frontend/src/App.jsx`:
```jsx
import NotificationSetup from './components/NotificationSetup'

function App() {
  return (
    <>
      <NotificationSetup />
      {/* Rest of your app */}
    </>
  )
}
```

### 5️⃣ Run the Application

**Backend:**
```bash
cd chatconnecting
mvn spring-boot:run
```

**Frontend:**
```bash
cd Frontend
npm run dev
```

---

## How It Works

```
User A sends message to User B
     ↓
Message saved to database
     ↓
Message broadcast via WebSocket
     ↓
Is User B online?
     ├─ YES → Message delivered via WebSocket
     └─ NO → Send FCM notification to all of User B's devices
         ↓
         Native browser notification appears
         ↓
         User B clicks notification
         ↓
         App opens and shows message
```

---

## What Changed

### Backend Files (New)
- `notification/DeviceToken.java`
- `notification/DeviceTokenRepository.java`
- `notification/DeviceTokenController.java`
- `notification/service/NotificationService.java`
- `notification/config/FirebaseConfig.java`
- `notification/dto/RegisterDeviceTokenRequest.java`

### Backend Files (Modified)
- `pom.xml` - Added Firebase Admin SDK
- `application.properties` - Added firebase.config.path
- `message/service/MessageService.java` - Added FCM integration
- Database - New device_tokens table

### Frontend Files (New)
- `services/firebaseService.js` - Firebase initialization
- `services/notificationService.js` - Token management
- `hooks/useNotification.js` - React hook for setup
- `components/NotificationSetup.jsx` - Component wrapper
- `public/firebase-messaging-sw.js` - Service Worker
- `.env.example` - Updated with Firebase config

### Frontend Files (Modified)
- `package.json` - Added Firebase dependency

---

## API Endpoints

```
Register Device Token
POST /api/notifications/device-token
{
  "token": "fcm_token",
  "deviceName": "Chrome Browser",
  "deviceType": "WEB"
}

Deactivate Token
DELETE /api/notifications/device-token?token=fcm_token

Logout (Deactivate All)
DELETE /api/notifications/device-tokens/all
```

---

## Testing Push Notifications

1. **Open two browser windows/tabs**
2. **Login with different users** in each
3. **Close/minimize one user's window** (they become "offline")
4. **Send message** from the other user
5. **See background notification** in the offline user's browser
6. **Click notification** to open the app

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Notifications not showing | Check browser permissions - allow notifications |
| Firebase not initializing | Verify .env variables are set correctly |
| Endpoint errors | Ensure Firebase service account JSON exists and is readable |
| Service worker errors | Check browser DevTools → Application → Service Workers |

---

## Documentation Files

- **FIREBASE_SETUP_GUIDE.md** - Detailed setup instructions
- **FCM_IMPLEMENTATION_SUMMARY.md** - Technical implementation details

---

## Database Table

```sql
device_tokens {
  id: Long (PK)
  user_id: Long (FK)
  token: String (unique per user)
  is_active: Boolean
  device_name: String
  device_type: String (WEB/MOBILE/DESKTOP)
  created_at: Timestamp
  updated_at: Timestamp
  last_used_at: Timestamp
}
```

---

## Production Checklist

- [ ] Use HTTPS (required for service workers)
- [ ] Store Firebase credentials securely
- [ ] Never commit .env with real credentials
- [ ] Test on real devices and browsers
- [ ] Monitor FCM delivery rates
- [ ] Set up error logging for failed notifications
- [ ] Implement token refresh job
- [ ] Configure CORS properly

---

## Need Help?

See `FIREBASE_SETUP_GUIDE.md` for:
- Detailed step-by-step setup
- Firebase Console configuration
- Environment variable details
- Advanced troubleshooting
