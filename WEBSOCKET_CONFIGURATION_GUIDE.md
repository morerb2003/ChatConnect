# WebSocket Configuration Guide - Production Ready

## 🚨 The Critical Issue: wss:// vs https://

### ❌ What's Wrong (The Error)
```javascript
// ❌ WRONG - Causes: "The URL's scheme must be either 'http:' or 'https:'. 'wss:' is not allowed."
VITE_WS_URL=wss://chatconnect-production.up.railway.app/ws

const client = new Client({
  webSocketFactory: () => new SockJS(wsBaseUrl)  // SockJS rejects wss://!
})
```

### ✅ What's Correct
```javascript
// ✅ CORRECT - SockJS handles the protocol upgrade automatically
VITE_WS_URL=https://chatconnect-production.up.railway.app/ws

const client = new Client({
  webSocketFactory: () => new SockJS(wsBaseUrl)  // SockJS accepts https://
})
```

---

## Why SockJS Rejects wss://

### How WebSocket Protocols Work

```
Browser             SockJS                  Backend
(Web Page)          (JavaScript Library)    (Spring Boot)

https://example.com
   ↓
   └─→ Browser Origin: https://example.com
        ↓
        └─→ SockJS processes the URL parameter
             Can only accept: http:// or https://
             ↓
             ✅ https:// → SockJS upgrades to wss://
             ❌ wss:// → SockJS throws error "not allowed"
```

### Why This Design?

SockJS is a **HTTP-based fallback library** that:
1. Starts with **http:// or https://** (standard protocols)
2. Attempts **WebSocket upgrade** (ws:// or wss://)
3. Falls back to **long-polling** if WebSocket unavailable
4. This is why it rejects pre-upgraded URLs (wss://)

---

## Correct Environment Configuration

### Frontend Environment Files

**`.env.development`** (Local development)
```env
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=http://localhost:8080/ws
```

**`.env.production`** (Vercel deployment)
```env
VITE_API_URL=https://chatconnect-production.up.railway.app/api
VITE_WS_URL=https://chatconnect-production.up.railway.app/ws
```

### Key Rules

| Rule | Correct | Wrong |
|------|---------|-------|
| **Scheme** | `https://` | ~~`wss://`~~ |
| **Scheme** | `http://` | ~~`ws://`~~ |
| **Host** | `chatconnect-production.up.railway.app` | ~~`chatconnect-production.wss.railway.app`~~ |
| **Port** | (default HTTPS port) | ~~`:443`~~ (don't add) |
| **Path** | `/ws` | ~~`/ws/` (no trailing slash)~~ |
| **No Query** | `https://example.com/ws` | ~~`?token=xyz`~~ (use headers) |

---

## Frontend WebSocket Connection Code

### Basic Setup (Recommended)

```javascript
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

// Get URL from environment (NEVER hardcode!)
const wsBaseUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws'

// Create STOMP client with SockJS
const client = new Client({
  // ✅ CORRECT: Use http:// or https://
  webSocketFactory: () => new SockJS(wsBaseUrl),
  
  connectHeaders: {
    Authorization: `Bearer ${jwtToken}`
  },
  
  // Reconnection
  reconnectDelay: 0,  // Auto-reconnect with exponential backoff
  
  // Heartbeat
  heartbeatIncoming: 10000,
  heartbeatOutgoing: 10000,
  
  // Event handlers
  onConnect: () => console.log('✅ Connected'),
  onError: (error) => console.error('❌ Error:', error),
  onWebSocketClose: () => console.log('⚠️ Disconnected'),
})

// Activate client
client.activate()

// Cleanup when done
client.deactivate()
```

### Production-Ready Setup (With Error Handling)

```javascript
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getToken } from './auth'

/**
 * Production WebSocket Client
 * - Automatic reconnection with exponential backoff
 * - JWT authentication
 * - Graceful error handling
 * - Connection status tracking
 */
class ChatWebSocketClient {
  constructor() {
    this.client = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.isConnected = false
  }

  connect() {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws'
    const token = getToken()

    if (!token) {
      console.error('❌ No authentication token available')
      return
    }

    // Validate URL format
    if (!wsUrl.startsWith('http://') && !wsUrl.startsWith('https://')) {
      console.error(`❌ Invalid WebSocket URL: ${wsUrl}`)
      return
    }

    this.client = new Client({
      webSocketFactory: () => {
        console.log(`🔌 Connecting to: ${wsUrl}`)
        return new SockJS(wsUrl, null, {
          transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
        })
      },

      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      reconnectDelay: 0,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      connectionTimeout: 10000,

      onConnect: (frame) => {
        console.log('✅ WebSocket Connected!')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.onConnected?.()
      },

      onStompError: (frame) => {
        console.error('❌ STOMP Error:', frame)
        this.onError?.(frame)
      },

      onWebSocketError: (event) => {
        console.error('❌ WebSocket Error:', event)
        this.onWebSocketError?.(event)
      },

      onWebSocketClose: (event) => {
        console.warn('⚠️ WebSocket Closed')
        this.isConnected = false
        this.onDisconnected?.(event)
      },

      debug: (msg) => console.log('[STOMP]', msg),
    })

    this.client.activate()
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate()
      this.isConnected = false
    }
  }

  subscribe(destination, callback) {
    if (!this.client?.connected) {
      console.error('❌ Not connected to WebSocket')
      return null
    }
    return this.client.subscribe(destination, callback)
  }

  send(destination, body) {
    if (!this.client?.connected) {
      console.error('❌ Not connected to WebSocket')
      return
    }
    this.client.publish({
      destination,
      body: JSON.stringify(body),
    })
  }

  // Callbacks
  onConnected = null
  onDisconnected = null
  onError = null
  onWebSocketError = null
}

export default new ChatWebSocketClient()
```

### Usage Example

```javascript
import chatClient from './services/ChatWebSocketClient'

// Connect when user logs in
function onUserLogin(token) {
  chatClient.onConnected = () => {
    console.log('Ready to send/receive messages')
  }

  chatClient.onError = (frame) => {
    console.error('WebSocket error:', frame)
  }

  chatClient.connect()
}

// Subscribe to messages
chatClient.subscribe('/user/queue/messages', (message) => {
  const data = JSON.parse(message.body)
  console.log('New message:', data)
})

// Send message
function sendMessage(text) {
  chatClient.send('/app/chat.send', {
    content: text,
    roomId: 123,
  })
}

// Disconnect when user logs out
function onUserLogout() {
  chatClient.disconnect()
}
```

---

## Backend Spring Boot Configuration

### Verify WebSocketConfig

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.ws.allowed-origins:http://localhost:5173}")
    private String wsAllowedOrigins;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // ✅ CORRECT: Allow frontend origins (use https://, not wss://)
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(parseOrigins(wsAllowedOrigins))
                .setHandshakeHandler(stompPrincipalHandshakeHandler())
                .addInterceptors(jwtHandshakeInterceptor)
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    private String[] parseOrigins(String rawOrigins) {
        return Arrays.stream(rawOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toArray(String[]::new);
    }
}
```

### Backend application.properties

```properties
# ✅ CORRECT: Use https:// for allowed origins (NOT wss://)
app.ws.allowed-origins=${APP_WS_ALLOWED_ORIGINS:http://localhost:5173,https://chat-connect-ochre.vercel.app,https://chatconnect-production.up.railway.app}
```

---

## Testing WebSocket Connection

### Browser DevTools Method

```javascript
// Open browser DevTools (F12) → Console and paste:

// 1. Check environment variable
console.log("VITE_WS_URL:", import.meta.env.VITE_WS_URL)
// Expected: https://chatconnect-production.up.railway.app/ws

// 2. Check if URL is valid
const url = import.meta.env.VITE_WS_URL
console.log("Valid?", url.startsWith('http://') || url.startsWith('https://'))
// Expected: true

// 3. Check WebSocket connection
// Open DevTools → Network tab
// Filter by "ws" type
// Connect to WebSocket
// Should see: wss://chatconnect-production.up.railway.app/ws
// Status: 101 Switching Protocols ✅
```

### curl Test (From Backend)

```bash
# Test WebSocket endpoint
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://chatconnect-production.up.railway.app/ws

# Should return 101 Switching Protocols
```

---

## Common Errors & Solutions

### Error 1: "wss: is not allowed"

```
❌ SYMPTOM:
SyntaxError: The URL's scheme must be either 'http:' or 'https:'. 'wss:' is not allowed.

✅ FIX:
Change VITE_WS_URL from: wss://... 
                     to: https://...
```

### Error 2: CORS Policy Blocked

```
❌ SYMPTOM:
Access to XMLHttpRequest... CORS policy: No 'Access-Control-Allow-Origin'

✅ FIX:
1. Add frontend URL to backend's allowed origins
2. Use https:// (not wss://) in CORS config
3. Restart backend
```

### Error 3: 404 on WebSocket Endpoint

```
❌ SYMPTOM:
Failed to load resource: the server responded with a status of 404

✅ FIX:
1. Verify backend /ws endpoint exists
2. Check WebSocketConfig is registered
3. Verify Spring Boot dependency: spring-boot-starter-websocket
```

### Error 4: Connection Timeout

```
❌ SYMPTOM:
Connection times out after 10 seconds

✅ FIX:
1. Check backend is running and accessible
2. Check firewall/networking
3. Increase connectionTimeout in client config
4. Check JWT token is valid (use getToken())
```

---

## Production Checklist

- [ ] ✅ `VITE_WS_URL` uses `https://` (not `wss://`)
- [ ] ✅ Backend allowed origins use `https://` (not `wss://`)
- [ ] ✅ Frontend URL matches backend CORS configuration
- [ ] ✅ JWT token is included in connection headers
- [ ] ✅ Backend has `withSockJS()` enabled
- [ ] ✅ Frontend has `sockjs-client` installed
- [ ] ✅ Frontend has `@stomp/stompjs` installed
- [ ] ✅ Environment variables are set correctly
- [ ] ✅ HTTPS certificates are valid
- [ ] ✅ Backend is redeployed after config changes
- [ ] ✅ Browser cache is cleared after frontend redeploy
- [ ] ✅ Tested on actual production URLs (not localhost)

---

## Environment Variables Summary

### Development (`vite` dev server)

```env
# .env.development
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=http://localhost:8080/ws
```

### Production (Vercel)

```env
# .env.production
VITE_API_URL=https://chatconnect-production.up.railway.app/api
VITE_WS_URL=https://chatconnect-production.up.railway.app/ws
```

### Backend (application.properties)

```properties
# Local
app.cors.allowed-origins=http://localhost:5173,http://localhost:3000
app.ws.allowed-origins=http://localhost:5173,http://localhost:3000

# Production
app.cors.allowed-origins=https://chat-connect-ochre.vercel.app,https://chatconnect-production.up.railway.app
app.ws.allowed-origins=https://chat-connect-ochre.vercel.app,https://chatconnect-production.up.railway.app
```

---

## Summary

| Aspect | Development | Production |
|--------|-------------|-----------|
| **Frontend WS URL** | `http://localhost:8080/ws` | `https://chatconnect-production.up.railway.app/ws` |
| **Protocol Scheme** | `http://` | `https://` |
| **Auto-Upgrade** | http:// → ws:// | https:// → wss:// |
| **Backend Allowed** | `http://localhost:5173` | `https://chat-connect-ochre.vercel.app` |
| **HTTPS Required** | No | Yes |
| **SockJS Fallback** | Available | Uses long-polling if needed |

---

## Key Takeaways

1. **NEVER use `wss://` in environment variables** - Use `https://`
2. **SockJS auto-upgrades protocols** - No manual intervention needed
3. **Frontend URL must match backend CORS config** - Exact match required
4. **Always use JWT token** - Include in `Authorization` header
5. **Clear browser cache after redeploy** - Old cached code causes issues
6. **Redeploy backend after config changes** - Changes don't take effect until redeployed

---

## Additional Resources

- [SockJS Documentation](https://github.com/sockjs/sockjs-client)
- [STOMP Protocol](https://stomp.github.io/)
- [Spring Boot WebSocket Docs](https://spring.io/guides/gs/messaging-stomp-websocket/)
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
