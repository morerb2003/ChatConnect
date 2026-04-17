# WebSocket Quick Reference Guide

## 🚀 Quick Fix (5 Minutes)

### Step 1: Fix Frontend Environment
**File: `Frontend/.env.production`**

```env
# ✅ CORRECT (use https://, NOT wss://)
VITE_API_URL=https://chatconnect-production.up.railway.app/api
VITE_WS_URL=https://chatconnect-production.up.railway.app/ws
```

### Step 2: Verify Backend Configuration
**File: `chatconnecting/src/main/resources/application.properties`** (Already correct! ✅)

```properties
# Already set up correctly with https:// URLs
app.ws.allowed-origins=${APP_WS_ALLOWED_ORIGINS:http://localhost:5173,https://chat-connect-ochre.vercel.app,https://chatconnect-production.up.railway.app}
```

### Step 3: Rebuild & Deploy
```bash
# Frontend
cd Frontend
npm run build
npx vercel deploy --prod

# Backend (on Railway Dashboard)
# → Click "Redeploy"
```

### Step 4: Clear Cache
**Browser**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

### Step 5: Test
- Open: https://chat-connect-ochre.vercel.app
- Should show: ✅ "Welcome" (NOT "Reconnecting...")
- Browser DevTools → Network → WS filter: Should see `wss://` connection ✅

---

## ❌ → ✅ Before & After

### Frontend Configuration

| Before ❌ | After ✅ |
|----------|---------|
| `VITE_WS_URL=wss://chatconnect-production.up.railway.app/ws` | `VITE_WS_URL=https://chatconnect-production.up.railway.app/ws` |
| Error: "wss: is not allowed" | ✅ Works! SockJS auto-upgrades |
| SockJS rejects the URL | SockJS accepts, upgrades to wss:// |

### Why It Works

```javascript
// What happens under the hood:

// ❌ BEFORE (BROKEN)
SockJS('wss://...')  // ← SockJS says: "I only accept http:// or https://"
// Error: "wss: is not allowed"

// ✅ AFTER (WORKING)
SockJS('https://...')  // ← SockJS accepts this
// Then internally upgrades to wss:// 
// → Browser sees: wss://chatconnect-production.up.railway.app/ws ✅
```

---

## WebSocket Connection Flow

```
Frontend (React)
    ↓
VITE_WS_URL=https://... (environment variable)
    ↓
websocketService.js creates Client
    ↓
new SockJS('https://...')  ← MUST be https://
    ↓
SockJS internally upgrades protocol
    ↓
Browser makes: wss:// connection (WebSocket Secure)
    ↓
Backend receives on /ws endpoint
    ↓
✅ Connected! Real-time messages flow
```

---

## Common Issues & Quick Fixes

### Issue 1: "wss: is not allowed" Error

```
Frontend: npm run build
Frontend/.env.production: Change wss:// → https://
Frontend: npm run build (again)
Vercel: Deploy
Browser: Ctrl+Shift+R (clear cache)
```

### Issue 2: "CORS policy blocked" on WebSocket

```
Backend: application.properties → Add frontend URL to app.ws.allowed-origins
Backend: Redeploy on Railway
Wait: ~2-3 minutes for deploy to complete
Test: Refresh browser
```

### Issue 3: "404 Not Found" on /ws endpoint

```
Backend: Verify WebSocketConfig.java exists
Backend: Verify @EnableWebSocketMessageBroker is present
Backend: Verify dependency: spring-boot-starter-websocket
Backend: Redeploy
```

### Issue 4: Still Shows "Reconnecting..." UI

```
1. Clear browser cache: Ctrl+Shift+R
2. Check browser console (F12): Look for error messages
3. Check Network tab: Look for 101 Switching Protocols
4. Verify JWT token is valid: Check localStorage
5. Verify frontend URL matches backend CORS config
6. Verify backend redeploy completed (check Railway logs)
```

---

## Code Snippets

### React Hook for WebSocket Connection

```javascript
import { useEffect, useRef } from 'react'
import { createChatSocketClient, attachSubscriptions } from './services/websocketService'
import { useAuth } from './hooks/useAuth'

export function useChatSocket(handlers) {
  const { token } = useAuth()
  const clientRef = useRef(null)

  useEffect(() => {
    if (!token) return

    // Create and connect
    clientRef.current = createChatSocketClient({
      token,
      onConnect: handlers?.onConnect,
      onStompError: handlers?.onStompError,
      onWebSocketError: handlers?.onWebSocketError,
      onWebSocketClose: handlers?.onWebSocketClose,
      debug: true, // Set to false in production
    })

    // Attach subscriptions
    const unsubscribe = attachSubscriptions(clientRef.current, {
      onMessage: handlers?.onMessage || (() => {}),
      onStatus: handlers?.onStatus || (() => {}),
      onCall: handlers?.onCall || (() => {}),
      onTyping: handlers?.onTyping || (() => {}),
      onReadReceipt: handlers?.onReadReceipt || (() => {}),
      onRoomEvent: handlers?.onRoomEvent || (() => {}),
      onPresence: handlers?.onPresence || (() => {}),
    })

    clientRef.current.activate()

    return () => {
      unsubscribe?.()
      clientRef.current?.deactivate()
    }
  }, [token, handlers])

  return clientRef.current
}

// Usage
function ChatComponent() {
  const socket = useChatSocket({
    onMessage: (msg) => console.log('New message:', msg),
    onConnect: () => console.log('Connected'),
    onWebSocketClose: () => console.log('Disconnected'),
  })

  return (
    <div>
      {socket?.connected ? '✅ Connected' : '⚠️ Disconnected'}
    </div>
  )
}
```

### Sending Messages

```javascript
// Subscribe to messages
socket.subscribe('/user/queue/messages', (frame) => {
  const message = JSON.parse(frame.body)
  console.log('Received:', message)
})

// Send message to backend
socket.publish({
  destination: '/app/chat.send',
  body: JSON.stringify({
    content: 'Hello!',
    roomId: 123
  })
})
```

---

## Environment Variables (All Environments)

### Local Development

```env
# Frontend/.env.development
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=http://localhost:8080/ws
```

### Production (Vercel)

```env
# Frontend/.env.production
VITE_API_URL=https://chatconnect-production.up.railway.app/api
VITE_WS_URL=https://chatconnect-production.up.railway.app/ws
```

### Backend (application.properties)

```properties
# Default for local development
app.ws.allowed-origins=http://localhost:5173

# Production (set via Railway environment variables)
APP_WS_ALLOWED_ORIGINS=http://localhost:5173,https://chat-connect-ochre.vercel.app,https://chatconnect-production.up.railway.app
```

---

## Testing Checklist

- [ ] ✅ Frontend `.env.production` uses `https://` (not `wss://`)
- [ ] ✅ Backend `app.ws.allowed-origins` includes frontend URL
- [ ] ✅ Backend has been redeployed after config changes
- [ ] ✅ Frontend has been rebuilt and redeployed
- [ ] ✅ Browser cache cleared (`Ctrl+Shift+R`)
- [ ] ✅ Browser DevTools → Network shows `wss://` connection
- [ ] ✅ Browser DevTools → Network → Status is `101 Switching Protocols`
- [ ] ✅ No errors in browser console (F12)
- [ ] ✅ UI shows "Welcome" not "Reconnecting..."
- [ ] ✅ Can send/receive messages in real-time
- [ ] ✅ User presence updates instantly

---

## Deployment Order (Important!)

**ALWAYS follow this order:**

1. **Backend Deploy First** ← Deploy to Railway
2. **Wait** ← 2-3 minutes for Railway build
3. **Frontend Deploy** ← Deploy to Vercel
4. **Clear Cache** ← Browser `Ctrl+Shift+R`
5. **Test** ← Send a message

**Why this order?** Frontend connects to backend, so backend must be ready first.

---

## Key Differences: wss:// vs https://

| Aspect | wss:// | https:// |
|--------|--------|---------|
| **SockJS Support** | ❌ Rejected | ✅ Accepted |
| **Protocol Type** | WebSocket specific | HTTP standard |
| **SockJS Fallback** | N/A | Available (long-polling) |
| **When to Use** | Never (with SockJS) | Always (with SockJS) |
| **Auto-Upgrade** | N/A | http → ws, https → wss |

---

## Further Reading

- **Updated Service File**: [websocketService.js](Frontend/src/services/websocketService.js)
- **Full Guide**: [WEBSOCKET_CONFIGURATION_GUIDE.md](WEBSOCKET_CONFIGURATION_GUIDE.md)
- **Backend Config**: [application.properties](chatconnecting/src/main/resources/application.properties)
- **Backend WebSocket**: [WebSocketConfig.java](chatconnecting/src/main/java/com/chatconnecting/chatconnecting/websocket/WebSocketConfig.java)

---

## Summary

| Item | Status | Notes |
|------|--------|-------|
| **Frontend `.env.production`** | ✅ Ready | Uses `https://`, not `wss://` |
| **Backend `application.properties`** | ✅ Ready | Has correct CORS origins |
| **Backend `WebSocketConfig.java`** | ✅ Ready | Has `withSockJS()` enabled |
| **websocketService.js** | ✅ Updated | Production-ready with validation |
| **Deployment Status** | ⏳ Pending | Need to redeploy to production |

---

## Next Steps

1. **Push changes to GitHub**
   ```bash
   git add -A
   git commit -m "Fix: WebSocket configuration - use https:// instead of wss://"
   git push origin main
   ```

2. **Redeploy backend on Railway**
   - Go to railway.app dashboard
   - Click "Redeploy" on Spring Boot service
   - Wait for green ✅ status

3. **Rebuild frontend**
   ```bash
   cd Frontend
   npm run build
   npx vercel deploy --prod
   ```

4. **Verify in production**
   - Open https://chat-connect-ochre.vercel.app
   - Check for ✅ "Welcome" status
   - Send test message
   - Verify instant delivery

✅ **Done! Real-time chat should work perfectly.**
