# WebRTC Quick Reference Card

## 🚀 Quick Start (30 seconds)

```bash
# 1. Swap files
cd d:\FroentEnd\ChatConnect\Frontend\src\context
cp CallContext_FIXED.jsx CallContext.jsx

# 2. Start dev server
npm run dev

# 3. Test in browser
# Open two browser windows
# Start a call
# Check console for WebRTC logs
```

## 📍 File Locations

```
webrtcUtils.js       → Frontend/src/services/webrtcUtils.js (234 lines)
CallContext.jsx      → Frontend/src/context/CallContext.jsx (965 lines)
Original backup      → Frontend/src/context/CallContext.jsx.backup.* (saved)
```

## 🎯 Common Tasks

### Enable Debug Logging
```javascript
// In App.jsx or main.jsx
import { WebRTCLogger } from './services/webrtcUtils'
WebRTCLogger.level = WebRTCLogger.DEBUG  // 0 = DEBUG
```

### Disable Debug Logging (Production)
```javascript
WebRTCLogger.level = WebRTCLogger.WARN  // 2 = WARN
```

### Check Browser Capabilities
```javascript
import { BrowserCompat } from './services/webrtcUtils'
const browser = BrowserCompat.getBrowserType()      // Chrome, Edge, Safari, etc.
const platform = BrowserCompat.getPlatformType()    // Windows, macOS, iOS, etc.
const supported = BrowserCompat.checkWebRTCCapabilities()
console.log(browser, platform, supported)
```

### Get STUN Servers
```javascript
import { BrowserCompat } from './services/webrtcUtils'
const servers = BrowserCompat.getIceServers()
// Returns: [{urls: 'stun:...', {...}, {...}]
```

### Get RTCConfiguration
```javascript
import { BrowserCompat } from './services/webrtcUtils'
const config = BrowserCompat.getRTCConfiguration()
// { iceServers: [...], iceTransportPolicy: 'all', bundlePolicy: 'max-bundle' }
```

### Retry Operations with Backoff
```javascript
import { RetryManager } from './services/webrtcUtils'

await RetryManager.executeWithRetry(
  async () => {
    // Your operation here
    return await someAsyncOperation()
  },
  {
    maxAttempts: 3,
    initialDelayMs: 500,
    backoffMultiplier: 2,
    label: 'Operation Name'
  }
)
```

## 📊 Log Levels

| Level | Value | Usage |
|-------|-------|-------|
| DEBUG | 0 | Development, detailed trace |
| INFO | 1 | General flow, safe to log |
| WARN | 2 | Potential issues (PRODUCTION) |
| ERROR | 3 | Critical failures only |

## 🔴 Common Errors & Quick Fixes

### "Unable to accept call"
→ Check console for [WebRTC:*] error logs  
→ Enable DEBUG logging: `WebRTCLogger.level = 0`  
→ Check browser permissions (camera/mic)

### No Video Appears
→ Check for `RemoteTrackReceived` log  
→ Check video element is visible (not `display:none`)  
→ Check stream attached: `videoElement.srcObject !== null`

### Chrome ↔ Firefox Fails
→ Multiple STUN servers configured (should work)  
→ Add TURN server for symmetric NAT  
→ Check firewall allows UDP

### Connection Timeout
→ Check STUN server accessibility  
→ Add TURN server configuration  
→ Check network latency

## 📱 Browser Support

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome 90+ | ✅ Works | Google STUN optimal |
| Edge 90+ | ✅ Works | Chromium-based |
| Firefox 78+ | ✅ Works | Mozilla STUN optimal |
| Safari 11+ | ⚠️ Limited | Needs fallback |
| Mobile Chrome | ✅ Works | Full support |
| Mobile Safari | ⚠️ Limited | iOS WebRTC limited |

## 🧪 Quick Test

### Same Browser (Baseline)
1. Open Chrome + Chrome (two windows)
2. Login as User A and User B
3. A calls B → Accept
4. **Expected:** Video appears in both

### Cross-Browser (Real Test)
1. Open Chrome and Edge
2. Login different users
3. Chrome calls Edge → Accept
4. **Expected:** Video appears in both

### Check Logs
```
[WebRTC:CallContext:BrowserDetection] browser: Chrome | Edge | Firefox
[WebRTC:PeerConnection:StateChange] new → connecting → connected
[WebRTC:RemoteStream:TrackReceived] kind: video | audio
```

## 💻 DevTools Commands

### Chrome DevTools Console
```javascript
// Get current peer connection
const pc = window.__callContext?.peerConnections?.get('user@email.com')

// Check connection state
console.log('State:', pc.connectionState)
console.log('ICE State:', pc.iceConnectionState)

// Get connection stats
const stats = await pc.getStats()
stats.forEach(r => {
  if (r.type === 'inbound-rtp') {
    console.log('Bytes:', r.bytesReceived)
    console.log('Lost:', r.packetsLost)
  }
})

// List all candidates
const stats = await pc.getStats()
stats.forEach(r => {
  if (r.type === 'candidate-pair' && r.state === 'succeeded') {
    console.log(`${r.localCandidate.address} → ${r.remoteCandidate.address}`)
  }
})
```

### View WebRTC Internals
1. Open `chrome://webrtc-internals/`
2. Select call session
3. View stats, candidates, timing

### Monitor WebSocket Messages
1. DevTools → Network tab
2. Filter: `WS`
3. Select connection
4. View "Messages" tab
5. See OFFER/ANSWER/ICE messages

## 📋 Configuration Checklist

### Development
- [ ] `WebRTCLogger.level = 0` (DEBUG)
- [ ] Multiple STUN servers configured
- [ ] Browser detection working
- [ ] Logging shows messages

### Production
- [ ] `WebRTCLogger.level = 2` (WARN)
- [ ] TURN server configured (for NAT)
- [ ] HTTPS enabled (required)
- [ ] Error monitoring active
- [ ] Performance tested

## 🔧 Integration Points

### Import in App.jsx
```javascript
import { WebRTCLogger, BrowserCompat } from './services/webrtcUtils'
import CallContext from './context/CallContext'

// Or use the hook directly in components
const { state, actions } = useCallContext()
```

### Use CallContext Hook
```javascript
function MyComponent() {
  const { state, initiateCall, endCall } = useCallContext()
  
  const handleCall = () => {
    initiateCall('recipient@email.com', 'video')
  }
  
  return <button onClick={handleCall}>Call</button>
}
```

## 📞 Troubleshooting Flow

```
Call Fails?
  ↓
Enable DEBUG logging
  ↓
Check [WebRTC:*] console logs
  ↓
Look for error message
  ↓
NotAllowedError?
  → Check camera permission
  → Grant permission + retry
  ↓
Connection Failed?
  → Check STUN servers
  → Add TURN server
  → Check firewall
  ↓
No Video?
  → Check ontrack logs
  → Check video element
  → Check stream attached
```

## 🛠️ Advanced: Add TURN Server

In `webrtcUtils.js` `getIceServers()`:

```javascript
export const getIceServers = () => [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.stunprotocol.org:3478' },
  { urls: 'stun:stun.services.mozilla.com:3478' },
  
  // Add TURN for production
  {
    urls: [
      'turn:your-server.com:3478',
      'turn:your-server.com:3479?transport=tcp'
    ],
    username: process.env.TURN_USERNAME,
    credential: process.env.TURN_PASSWORD,
  }
]
```

## 🔍 Monitoring in Production

### Key Metrics to Track
- Call success rate (target: >98%)
- Average connection time (target: <5s)
- Connection failure rate (by browser)
- Audio/video quality (bitrate, packet loss)

### Logging Connection Stats
```javascript
// After successful connection
const stats = await peerConnection.getStats()
let videoBitrate = 0
stats.forEach(report => {
  if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
    videoBitrate = report.bytesReceived
    console.log('Video bitrate:', videoBitrate, 'bytes')
  }
})
```

## 📖 Documentation References

| Document | Purpose |
|----------|---------|
| WEBRTC_FIX_GUIDE.md | Complete implementation guide |
| WEBSOCKET_PROTOCOL.md | Message format reference |
| INTEGRATION_GUIDE.md | Step-by-step integration |
| WEBRTC_IMPLEMENTATION_SUMMARY.md | High-level overview |

## ✅ Deployment Checklist (5 min)

- [ ] Backup original: `cp CallContext.jsx CallContext.jsx.backup`
- [ ] Deploy fixed version: Already in place
- [ ] Start dev server: `npm run dev`
- [ ] Check for errors: No console errors
- [ ] Test same browser: Both windows can see video
- [ ] Test cross-browser: Chrome ↔ Edge works
- [ ] Enable WARN logging: `WebRTCLogger.level = 2`
- [ ] Push to production

## 🚨 Emergency Rollback

```bash
# If issues occur, rollback immediately
cd Frontend/src/context
cp CallContext.jsx.backup CallContext.jsx
npm run dev
```

## 📞 Need Help?

1. Check console for [WebRTC:*] logs
2. Review troubleshooting section above
3. Check DevTools WebSocket messages
4. Monitor in `chrome://webrtc-internals/`
5. Read full guides in documentation

---

**Last Updated:** 2024-04-15  
**Version:** 1.0  
**Status:** Production Ready ✅

