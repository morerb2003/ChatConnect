# WebSocket wss:// vs https:// Technical Deep Dive

## The Problem Explained

### What SockJS Does

SockJS is a **JavaScript library that provides a WebSocket emulation layer** with fallback support. It's designed to:

1. Start with HTTP-based connections (which are standard and widely supported)
2. Attempt to upgrade to WebSocket if available
3. Fall back to long-polling or other techniques if WebSocket isn't available

### Why SockJS Rejects wss://

```javascript
// ❌ BROKEN: When you do this
new SockJS('wss://chatconnect-production.up.railway.app/ws')

// SockJS internally validates the URL
if (!url.startsWith('http://') && !url.startsWith('https://')) {
  throw new Error("The URL's scheme must be either 'http:' or 'https:'. 'wss:' is not allowed.")
}
// Because SockJS expects to START with HTTP and handle the upgrade itself
```

**The key insight:** SockJS is responsible for deciding **when and how** to upgrade to WebSocket. If you pre-upgrade to `wss://`, you bypass SockJS's protocol negotiation logic, and it correctly rejects this.

---

## How HTTPS Auto-Upgrades to WSS

### Step-by-Step Process

```
1. Browser Page Context
   └─ URL: https://chat-connect-ochre.vercel.app
   └─ Protocol: HTTPS
   └─ Port: 443 (implicit)

2. Frontend JavaScript
   └─ VITE_WS_URL: 'https://chatconnect-production.up.railway.app/ws'
   └─ Calls: new SockJS('https://...')

3. SockJS Library (Browser)
   ├─ Detects: HTTPS URL
   └─ Decides: "This is secure. I should use WSS for WebSocket"

4. Transport Selection
   ├─ Available Transports: [websocket, xhr-streaming, xhr-polling]
   ├─ Attempts WebSocket First:
   │   └─ Browser sees: https://...
   │   └─ Auto-upgrades to: wss://... (same port 443)
   │   └─ Success: 101 Switching Protocols ✅
   ├─ If WebSocket fails:
   │   └─ Falls back to: XHR (long-polling)
   │   └─ Uses: https:// (same as original)

5. Network Layer
   └─ Browser sends: wss://chatconnect-production.up.railway.app/ws
   └─ Server receives: Secure WebSocket connection
   └─ Application: Sees real-time message flow ✅
```

### The CORS Perspective

**Critical concept:** WebSocket CORS works differently from HTTP:

```javascript
// HTTP Request (from browser)
GET https://chat-connect-ochre.vercel.app
  Origin: https://chat-connect-ochre.vercel.app
  
// Backend receives and matches:
// "Is https://chat-connect-ochre.vercel.app in my allowed origins?"

// WebSocket Handshake (from browser)
GET /ws HTTP/1.1
Upgrade: websocket
Origin: https://chat-connect-ochre.vercel.app  // ← NOT wss://!
  
// Backend receives and matches:
// "Is https://chat-connect-ochre.vercel.app in my WebSocket allowed origins?"
```

**Key Point:** The `Origin` header in WebSocket handshake is **HTTPS**, not WSS. Your backend CORS config must use HTTPS URLs.

---

## Technical Architecture

### SockJS/STOMP Stack

```
┌─────────────────────────────────────────────────────────┐
│ Browser (React Frontend)                                 │
│ ┌───────────────────────────────────────────────────┐   │
│ │ WebSocket Service (.js)                           │   │
│ │ ┌─────────────────────────────────────────────┐   │   │
│ │ │ @stomp/stompjs (Protocol Layer)             │   │   │
│ │ │ - STOMP message framing                     │   │   │
│ │ │ - Destination subscriptions                 │   │   │
│ │ │ - Header management                         │   │   │
│ │ └──────────┬──────────────────────────────────┘   │   │
│ │            │                                       │   │
│ │ ┌──────────▼──────────────────────────────────┐   │   │
│ │ │ SockJS (Transport Layer)                    │   │   │
│ │ │ - Protocol negotiation                      │   │   │
│ │ │ - Fallback handling                         │   │   │
│ │ │ - URL: https://... (START HERE)             │   │   │
│ │ │ - Auto-upgrades to wss://                   │   │   │
│ │ │ - Fallback to: long-polling                 │   │   │
│ │ └──────────┬──────────────────────────────────┘   │   │
│ │            │                                       │   │
│ │ ┌──────────▼──────────────────────────────────┐   │   │
│ │ │ Browser WebSocket API                       │   │   │
│ │ │ - Native WebSocket implementation            │   │   │
│ │ │ - Handles wss:// protocol                    │   │   │
│ │ │ - CORS validation at this level              │   │   │
│ │ └──────────┬──────────────────────────────────┘   │   │
│ │            │                                       │   │
│ └────────────┼───────────────────────────────────────┘   │
│              │ (Secure Connection)                       │
│              │ Protocol: wss:// (WebSocket Secure)       │
│              │ Port: 443 (implicit)                      │
│              │                                           │
└──────────────┼─────────────────────────────────────────────┘
               │ (TLS/SSL Encrypted)
               │
     ┌─────────▼──────────┐
     │ Internet/Network   │
     └─────────┬──────────┘
               │
     ┌─────────▼──────────────────────┐
     │ Backend (Spring Boot)          │
     │ ┌──────────────────────────┐   │
     │ │ Spring WebSocket Config  │   │
     │ │ - Allowed Origins        │   │
     │ │ - JWT Interceptor        │   │
     │ │ - STOMP Endpoints        │   │
     │ └──────────────────────────┘   │
     │ ┌──────────────────────────┐   │
     │ │ Message Broker           │   │
     │ │ - Simple Broker          │   │
     │ │ - Topic: /topic/*        │   │
     │ │ - Queue: /user/queue/*   │   │
     │ └──────────────────────────┘   │
     └───────────────────────────────┘
```

---

## Configuration Chain

### Configuration Layers (Top to Bottom)

#### Layer 1: Frontend Environment
```
VITE_WS_URL=https://chatconnect-production.up.railway.app/ws
              ↓
              Used by: import.meta.env.VITE_WS_URL
              Passed to: createChatSocketClient()
```

#### Layer 2: Frontend Service
```javascript
const wsBaseUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws'
                  ↓
                  Passed to: SockJS constructor
```

#### Layer 3: SockJS Transport
```javascript
new SockJS(wsBaseUrl, null, {
  transports: ['websocket', 'xhr-streaming', 'xhr-polling']
})
                  ↓
                  If https:// → upgrades to wss://
                  If http:// → upgrades to ws://
```

#### Layer 4: Browser Network
```
Browser WebSocket API
   ↓
   Sends: wss://chatconnect-production.up.railway.app/ws
   With Header: Origin: https://chat-connect-ochre.vercel.app
```

#### Layer 5: Backend CORS
```
Spring Security CORS Filter
   ↓
   Receives: Origin: https://chat-connect-ochre.vercel.app
   Checks: Is this in app.ws.allowed-origins?
   Config: app.ws.allowed-origins=https://chat-connect-ochre.vercel.app
   Result: ✅ ALLOWED
```

---

## Error Scenarios

### Scenario 1: Using wss:// in Frontend

```
VITE_WS_URL=wss://chatconnect-production.up.railway.app/ws
                  ↓
                  SockJS validation:
                  if (!url.startsWith('http://') && 
                      !url.startsWith('https://')) {
                    throw Error("wss: is not allowed")
                  }
                  ↓
                  ❌ Runtime Error: "The URL's scheme must be either..."
```

**Why?** SockJS assumes you're passing an HTTP URL that IT will upgrade. Pre-upgrading breaks its protocol negotiation.

---

### Scenario 2: Wrong Origin in Backend CORS

```
Frontend: https://chat-connect-ochre.vercel.app
   ↓
   Sends WebSocket handshake with Origin header

Backend: app.ws.allowed-origins=wss://chat-connect-ochre.vercel.app
            ↓
            Receives: Origin: https://chat-connect-ochre.vercel.app
            Checks: Is this in my config?
            Config: wss://... (but Origin is https://...)
            Result: ❌ MISMATCH - CORS BLOCKED
```

**Why?** Origin header is always HTTPS/HTTP, never WSS/WS.

---

### Scenario 3: Backend Not Redeployed

```
Old Code (Before Fix):
   app.ws.allowed-origins=wss://chat-connect-ochre.vercel.app

New Code (After Fix):
   app.ws.allowed-origins=https://chat-connect-ochre.vercel.app

But Backend Not Redeployed...
   ↓
   Production Still Running Old Code:
   app.ws.allowed-origins=wss://...
   
   ❌ CORS Blocked - Configuration not updated
```

**Solution:** Always redeploy backend after config changes.

---

## Production Best Practices

### 1. Environment Variable Isolation

```javascript
// ✅ GOOD: Read from environment
const wsBaseUrl = import.meta.env.VITE_WS_URL

// ❌ BAD: Hardcoded
const wsBaseUrl = 'wss://chatconnect-production.up.railway.app/ws'
```

**Why?** Different environments need different URLs (localhost, staging, production).

---

### 2. Graceful Fallback

```javascript
// ✅ GOOD: Fallback to localhost
const wsBaseUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws'

// ❌ BAD: Fail if env var missing
const wsBaseUrl = import.meta.env.VITE_WS_URL
```

**Why?** Development still works even if env var not set.

---

### 3. Transport Flexibility

```javascript
// ✅ GOOD: Specify fallback transports
new SockJS(wsBaseUrl, null, {
  transports: ['websocket', 'xhr-streaming', 'xhr-polling']
})

// ⚠️ PARTIAL: Accept default transports
new SockJS(wsBaseUrl)
```

**Why?** Some networks block WebSocket. Having HTTP fallback ensures connectivity.

---

### 4. Connection Timeout

```javascript
// ✅ GOOD: Set timeout
const client = new Client({
  connectionTimeout: 10000,
  reconnectDelay: 0,
})

// ❌ BAD: No timeout (waits forever)
const client = new Client({
  reconnectDelay: 0,
})
```

**Why?** Prevents hanging connections if backend is down.

---

### 5. Automatic Reconnection

```javascript
// ✅ GOOD: Auto-reconnect with exponential backoff
reconnectDelay: 0  // Uses exponential backoff
heartbeatIncoming: 10000
heartbeatOutgoing: 10000

// ❌ BAD: Manual reconnection required
// (requires user to reload page or click reconnect)
```

**Why?** Provides seamless experience when network drops.

---

## Testing & Debugging

### Browser Console Commands

```javascript
// 1. Check environment variable
console.log(import.meta.env.VITE_WS_URL)
// Expected: https://chatconnect-production.up.railway.app/ws

// 2. Check if URL format is valid
const url = import.meta.env.VITE_WS_URL
const isValid = url.startsWith('http://') || url.startsWith('https://')
console.log('Valid URL format?', isValid)
// Expected: true

// 3. Watch SockJS upgrade
// DevTools → Network → Filter "ws"
// Should see: wss://chatconnect-production.up.railway.app/ws
// Status: 101 Switching Protocols ✅
```

### Backend Logs

```
[WebSocketConfig] Registering STOMP endpoint /ws with allowed origins=https://chat-connect-ochre.vercel.app
[JwtHandshakeInterceptor] Valid JWT token received for user: user123
[StompMessage] Message received on /app/chat.send
[MessagePublisher] Publishing to /topic/chat-room-123
```

### Network Analysis

```
WebSocket Upgrade Request:
  GET /ws HTTP/1.1
  Upgrade: websocket
  Connection: Upgrade
  Origin: https://chat-connect-ochre.vercel.app  ← THIS is what backend checks

WebSocket Upgrade Response:
  HTTP/1.1 101 Switching Protocols
  Upgrade: websocket
  Connection: Upgrade
  
✅ Connection Established
  Protocol: wss:// (secure)
```

---

## Migration Guide

### From wss:// to https://

**Step 1: Identify all wss:// occurrences**
```bash
grep -r "wss://" Frontend/
grep -r "wss://" chatconnecting/
```

**Step 2: Replace with https://**
```bash
# Frontend
sed -i 's/wss:\/\//https:\/\//g' Frontend/.env.production
sed -i 's/wss:\/\//https:\/\//g' Frontend/src/services/*.js

# Backend
sed -i 's/wss:\/\//https:\/\//g' chatconnecting/src/main/resources/application.properties
```

**Step 3: Verify replacements**
```bash
grep -r "wss://" Frontend/
grep -r "wss://" chatconnecting/
# Should return no results
```

**Step 4: Test and deploy**
```bash
git diff  # Review changes
npm run build
npx vercel deploy --prod
# Backend redeploy on Railway
```

---

## Summary Table

| Aspect | wss:// | https:// |
|--------|--------|----------|
| **URL Scheme** | WebSocket Secure | HTTPS |
| **Used in** | Final connection | Initial connection |
| **SockJS Support** | ❌ Rejected | ✅ Accepted |
| **Auto-Upgrade** | N/A | https:// → wss:// |
| **Fallback Support** | N/A | Yes (long-polling) |
| **CORS Origin** | N/A | https:// (NOT wss://) |
| **CORS Config** | ❌ CORS Fails | ✅ CORS Works |
| **When to Use** | Never (with SockJS) | Always (with SockJS) |
| **Browser Sends** | Final Protocol | Upgraded by SockJS |

---

## Conclusion

**Key Takeaways:**

1. **SockJS manages protocol upgrades** - Don't do it manually
2. **Always start with http:// or https://** - SockJS handles the rest
3. **CORS checks the Origin header** - Which is always HTTPS, not WSS
4. **Backend must match frontend URL** - Exact origin matching required
5. **Redeploy after config changes** - Changes don't take effect without redeployment

**The Golden Rule:** 
> "Use `https://` in your configuration. Let SockJS upgrade to `wss://`. Let CORS match the Origin header (HTTPS)."
