# Firebase Cloud Messaging Setup Guide

This guide will help you set up push notifications in ChatConnect using Firebase Cloud Messaging (FCM).

## Prerequisites

- Firebase project created at [Firebase Console](https://console.firebase.google.com)
- Node.js and npm installed
- Maven installed for backend

## Backend Setup

### 1. Generate Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click ⚙️ (Settings) → Project Settings
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the JSON file to your project:
   ```
   chatconnecting/firebase-service-account.json
   ```

### 2. Configure Backend Environment

Create or update your `.env` file in the backend root:

```bash
FIREBASE_CONFIG_PATH=./firebase-service-account.json
```

Or set it in `application.properties`:

```properties
firebase.config.path=./firebase-service-account.json
```

### 3. Build Backend

```bash
cd chatconnecting
mvn clean install
```

## Frontend Setup

### 1. Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **Project Settings** (⚙️)
4. Under "Your apps", find or add a Web app
5. Copy the configuration object

### 2. Generate VAPID Key

1. In Firebase Console, go to **Project Settings** → **Cloud Messaging**
2. Under "Web Push certificates", click **Generate Key Pair**
3. Copy the Public key (VAPID key)

### 3. Configure Frontend Environment

Create a `.env` file in the frontend root:

```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=http://localhost:8080/ws

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_public_vapid_key
```

### 4. Install Dependencies

```bash
cd Frontend
npm install
# or
yarn install
```

### 5. Update Main App Component

Add the `NotificationSetup` component to your main App component (e.g., `App.jsx`):

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

export default App
```

## How It Works

### Backend

1. **Device Token Registration** (`POST /api/notifications/device-token`)
   - Clients register their FCM tokens
   - Tokens are stored in the `device_tokens` table
   - One user can have multiple device tokens (different devices/browsers)

2. **Notification Sending** (Automatic)
   - When a message is sent via WebSocket
   - System checks if recipient is offline (using `PresenceService`)
   - If offline, sends FCM notification with:
     - Sender name
     - Message preview (truncated to 100 chars)
     - Message type
   - Notification is sent to all active device tokens for that user

3. **Token Lifecycle Management**
   - Tokens are marked active when registered
   - Failed tokens are deactivated (invalid/expired)
   - All tokens deactivated on logout (`DELETE /api/notifications/device-tokens/all`)

### Frontend

1. **Initialization**
   - `firebaseService.js` initializes Firebase SDK
   - Requests browser notification permission
   - Service worker (`firebase-messaging-sw.js`) is registered

2. **Token Registration**
   - FCM token is obtained from Firebase
   - Token is registered with backend via `notificationService.js`
   - Device name and type are included

3. **Notification Handling**
   - Background: Service Worker shows native notifications
   - Foreground: `setupMessageListener` displays in-app notification
   - Click: Native notification opens the app

## API Endpoints

### Register Device Token
```
POST /api/notifications/device-token
Content-Type: application/json
Authorization: Bearer <token>

{
  "token": "fcm_token_here",
  "deviceName": "Chrome Browser",
  "deviceType": "WEB"
}
```

### Deactivate Device Token
```
DELETE /api/notifications/device-token?token=fcm_token_here
Authorization: Bearer <token>
```

### Deactivate All Device Tokens
```
DELETE /api/notifications/device-tokens/all
Authorization: Bearer <token>
```

## Database Schema

The `device_tokens` table stores:
- `id`: Primary key
- `user_id`: Reference to users table
- `token`: FCM token (unique per user)
- `is_active`: Whether token is active
- `device_name`: User-friendly device name
- `device_type`: WEB, MOBILE, or DESKTOP
- `created_at`: Registration timestamp
- `updated_at`: Last update timestamp
- `last_used_at`: Last time token was used

## Troubleshooting

### Notifications Not Sending

1. **Check Firebase Config**
   - Verify all environment variables are set correctly
   - Ensure Firebase project credentials are valid

2. **Check Browser Permissions**
   - User must grant notification permission
   - Chrome DevTools → Application → Manifest → Check permissions

3. **Service Worker Issues**
   - Verify service worker is registered: `chrome://serviceworker-internals/`
   - Check browser console for errors

4. **Backend Issues**
   - Verify Firebase service account JSON is accessible
   - Check application logs for FCM errors
   - Ensure database migrations have run

### Tokens Marked Invalid

- Invalid/expired tokens are automatically deactivated
- User can re-register by opening the app again
- Each browser/device gets its own token

## Testing

### Manual Testing

1. Open app in two browser tabs/windows
2. Login with two different users in each
3. Set one user offline (close WebSocket connection without logging out)
4. Send a message to the offline user in another tab
5. Should receive a native notification

### Testing in Incognito

- Each Incognito window gets a separate token
- Good for testing multi-device scenarios

## Production Considerations

1. **Security**
   - Never commit Firebase credentials to git
   - Store service account JSON securely
   - Rotate credentials periodically

2. **Performance**
   - Token cleanup: implement job to remove old inactive tokens
   - Consider rate limiting for token registration

3. **Analytics**
   - Monitor notification delivery rates
   - Log failed deliveries for debugging

4. **HTTPS Requirement**
   - Push notifications require HTTPS in production
   - Service workers only work over HTTPS (except localhost)

## References

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
