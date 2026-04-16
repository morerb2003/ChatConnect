# WebSocket Signaling Protocol - WebRTC Call System

## Overview
This document describes the WebSocket message protocol for establishing and managing WebRTC calls in ChatConnect.

## Message Format

### Base Structure
```json
{
  "type": "MESSAGE_TYPE",
  "to": "recipient@email.com",
  "chatRoomId": 12345,
  "data": {
    "...": "..."
  }
}
```

### Message Types
- `OFFER` - SDP offer to start call
- `ANSWER` - SDP answer to accept call
- `ICE` / `ICE_CANDIDATE` - ICE candidate for connection
- `REJECT` - Caller rejects incoming call
- `ACCEPT` - Receiver accepts incoming call
- `END` - Terminate call
- `START` - Start group call
- `JOIN` - Join group call
- `LEAVE` - Leave group call

## Direct Call Messages

### 1. Initiate Call (Caller → Receiver)
```json
{
  "type": "OFFER",
  "to": "user@example.com",
  "data": {
    "sdp": {
      "type": "offer",
      "sdp": "v=0\r\no=appmod-ice 54400 8699 IN IP4 10.47.16.5\r\n..."
    },
    "callMode": "video|audio",
    "displayName": "John Doe"
  }
}
```

**SDP Structure:**
```
v=0                                 # Version
o=appmod-ice ... IN IP4 10.47.16.5 # Origin (identifier)
s=-                                 # Session name
t=0 0                              # Timing
a=group:BUNDLE 0 1                # Bundle audio & video
a=extmap-allow-mixed              # RTP Extension support
a=msid-semantic: WMS stream       # Media stream identity
m=audio 9 UDP/TLS/RTP/SAVPF ...   # Audio media (RTP secure)
a=rtpmap:...                      # Codec mapping
a=fmtp:...                        # Codec parameters
a=candidate:...                   # (Optional initial ICE)
m=video 9 UDP/TLS/RTP/SAVPF ...   # Video media
...
```

**Expected Response:**
- Receiver displays incoming call notification
- Receiver accepts with `ANSWER` message (see below)
- Receiver rejects with `REJECT` message

---

### 2. Accept Call (Receiver → Caller)
```json
{
  "type": "ANSWER",
  "to": "john@example.com",
  "data": {
    "sdp": {
      "type": "answer",
      "sdp": "v=0\r\no=appmod-ice 54400 8699 IN IP4 192.168.1.5\r\n..."
    },
    "displayName": "Jane Doe"
  }
}
```

**Flow:**
1. Receiver sends `ANSWER` with their SDP
2. Caller receives `ANSWER`, sets as remote description
3. Both clients process ICE candidates

---

### 3. ICE Candidates Exchange

#### Caller → Receiver
```json
{
  "type": "ICE",
  "to": "jane@example.com",
  "data": {
    "candidate": {
      "candidate": "candidate:842163 1 udp 1677729535 10.47.16.5 54327 typ srflx raddr 10.47.16.5 rport 54327 generation 0 ufrag gUix network-cost unknown",
      "sdpMLineIndex": 0,
      "sdpMid": "0",
      "usernameFragment": "gUix"
    }
  }
}
```

#### Receiver → Caller
```json
{
  "type": "ICE",
  "to": "john@example.com",
  "data": {
    "candidate": {
      "candidate": "candidate:842163 1 udp 1677729535 192.168.1.5 54328 typ srflx raddr 192.168.1.5 rport 54328 generation 0 ufrag aBcD network-cost unknown",
      "sdpMLineIndex": 0,
      "sdpMid": "0",
      "usernameFragment": "aBcD"
    }
  }
}
```

**ICE Candidate Fields:**
- `candidate`: Full candidate string (protocol, IP, port, type)
- `sdpMLineIndex`: 0=audio, 1=video
- `sdpMid`: Media section identifier
- `usernameFragment`: STUN username fragment

**Candidate Types:**
- `host` - Local IP (LAN)
- `srflx` - Server reflexive (public IP via STUN)
- `prflx` - Peer reflexive (discovered from peer)
- `relay` - TURN server (for symmetric NAT)

---

### 4. Reject Call (Receiver → Caller)
```json
{
  "type": "REJECT",
  "to": "john@example.com",
  "data": {
    "reason": "busy|declined|timeout"
  }
}
```

---

### 5. End Call
```json
{
  "type": "END",
  "to": "peer@example.com",
  "data": {
    "reason": "ended|rejected|busy|timeout"
  }
}
```

---

## Group Call Messages

### 1. Start Group Call (Creator)
```json
{
  "type": "START",
  "chatRoomId": 12345,
  "data": {
    "callMode": "video|audio",
    "roomName": "Project Discussion",
    "displayName": "John Doe",
    "initiator": "john@example.com"
  }
}
```

**Broadcast Destination:** All users in chat room

---

### 2. Join Group Call (Participant)
```json
{
  "type": "JOIN",
  "chatRoomId": 12345,
  "data": {
    "callMode": "video|audio",
    "displayName": "Jane Doe",
    "joinerEmail": "jane@example.com"
  }
}
```

**Flow:**
1. Creator receives `JOIN` message
2. Creator sends `OFFER` to new joiner
3. New joiner responds with `ANSWER`
4. Joiner sends `OFFER` to creator for bidirectional connection

---

### 3. Exchange Offers/Answers in Group
```json
{
  "type": "OFFER",
  "chatRoomId": 12345,
  "to": "peer@example.com",
  "data": {
    "sdp": {
      "type": "offer",
      "sdp": "v=0\r\no=..."
    },
    "displayName": "John Doe",
    "callMode": "video"
  }
}
```

```json
{
  "type": "ANSWER",
  "chatRoomId": 12345,
  "to": "john@example.com",
  "data": {
    "sdp": {
      "type": "answer",
      "sdp": "v=0\r\no=..."
    },
    "displayName": "Jane Doe"
  }
}
```

---

### 4. Exchange ICE Candidates in Group
```json
{
  "type": "ICE_CANDIDATE",
  "chatRoomId": 12345,
  "to": "peer@example.com",
  "data": {
    "candidate": {
      "candidate": "candidate:842163...",
      "sdpMLineIndex": 0,
      "sdpMid": "0"
    },
    "displayName": "John Doe"
  }
}
```

---

### 5. Leave Group Call
```json
{
  "type": "END",
  "chatRoomId": 12345,
  "data": {
    "scope": "leave|all",
    "displayName": "John Doe"
  }
}
```

**Scope:**
- `leave` - Current user leaves (call continues for others)
- `all` - Caller ends group call (for everyone)

---

## Message Routing

### Backend Processing (Spring STOMP)

**Direct Calls:**
```java
@MessageMapping("/chat/call/offer")
@SendTo("user/{to}") // Sends to specific user queue
public CallSignalMessage handleCallOffer(CallSignalMessage message) { ... }

@MessageMapping("/chat/call/answer")
@SendTo("user/{to}")
public CallSignalMessage handleCallAnswer(CallSignalMessage message) { ... }

@MessageMapping("/chat/call/ice")
@SendTo("user/{to}")
public CallSignalMessage handleIceCandidate(CallSignalMessage message) { ... }
```

**Group Calls:**
```java
@MessageMapping("/chat/group/{chatRoomId}/offer")
@SendToUser("queue/groupCall") // Sends to group
public CallSignalMessage handleGroupOffer(CallSignalMessage msg) { ... }

@MessageMapping("/chat/group/{chatRoomId}/ice")
@SendToUser("queue/groupCall")
public CallSignalMessage handleGroupIce(CallSignalMessage msg) { ... }
```

---

## Frontend Implementation

### Subscribe to Incoming Signals
```javascript
// Subscribe to direct call signals
stompClient.subscribe('/user/queue/directCall', (message) => {
  const signal = JSON.parse(message.body)
  handleCallSignal(signal)
})

// Subscribe to group call signals  
stompClient.subscribe('/app/chat/group/' + chatRoomId + '/call', (message) => {
  const signal = JSON.parse(message.body)
  handleGroupSignal(signal)
})
```

### Send Call Signals
```javascript
// Send offer
stompClient.send(
  '/app/chat/call/offer',
  {},
  JSON.stringify({
    type: 'OFFER',
    to: 'recipient@email.com',
    data: {
      sdp: peerConnection.localDescription,
      callMode: 'video',
      displayName: currentUser.name
    }
  })
)

// Send ICE candidate
stompClient.send(
  '/app/chat/call/ice',
  {},
  JSON.stringify({
    type: 'ICE',
    to: 'recipient@email.com',
    data: {
      candidate: iceCandidate
    }
  })
)
```

---

## Error Handling

### Invalid Message
```json
{
  "type": "ERROR",
  "error": "Invalid SDP format",
  "messageId": "uuid-of-failed-message"
}
```

### Call Timeout
```json
{
  "type": "TIMEOUT",
  "reason": "No response after 30 seconds"
}
```

### Connection Lost
```
WebSocket connection closed
→ Cleanup peer connections
→ Inform user: "Connection lost"
→ Attempt reconnection
```

---

## Timing & Constraints

| Event | Timeout | Status |
|-------|---------|--------|
| Offer sent | 30s | Wait for answer |
| Answer sent | 15s | Expect ICE candidates |
| ICE gathering timeout | 5s | Proceed with partial candidates |
| Connection timeout | 45s | Fail and cleanup |
| Signaling timeout | 10s | Retry or abort |

---

## SDP Negotiation States

```
[Initial]
    ↓
startDirectCall() creates RTCPeerConnection
    ↓ setPeerConnection.signalingState = 'stable'
    ↓
createOffer() → 'have-local-offer'
    ↓
setLocalDescription(offer) → changes state to 'have-local-offer'
    ↓
send OFFER via WebSocket
    ↓
[Receiver] receives OFFER
    ↓
setRemoteDescription(offer) → 'have-remote-offer'
    ↓
createAnswer() → generates SDP
    ↓
setLocalDescription(answer) → 'stable' (signaling complete!)
    ↓
send ANSWER via WebSocket
    ↓
[Sender] receives ANSWER
    ↓
setRemoteDescription(answer) → 'stable'
    ↓
[Connected] ICE candidates flow both ways
    ↓
connectionState → 'connected'
    ↓
[Call Active] ontrack events fire
```

---

## Browser Compatibility

| Browser | WebRTC | STUN Support | Notes |
|---------|--------|--------------|-------|
| Chrome | ✅ | ✅ | Full support, uses Google STUN |
| Edge | ✅ | ✅ | Chromium-based, similar to Chrome |
| Firefox | ✅ | ✅ | Uses Mozilla STUN, good support |
| Safari | ⚠️ | ⚠️ | Limited, use fallback STUN |
| Opera | ✅ | ✅ | Chromium-based |
| IE 11 | ❌ | ❌ | Not supported |

---

## Security Notes

1. **DTLS-SRTP**: All media protected with DTLS (Datagram TLS)
2. **ICE Consent**: Verify ICE consent checks before sending media
3. **SDP Validation**: Always validate SDP before setting
4. **Token Validation**: Backend should validate calling user permissions
5. **HTTPS Required**: WebRTC requires secure context (HTTPS/WSS)

---

## Debugging WebSocket Messages

### Enable STOMP Debug Logging
```javascript
// In websocket initialization
stompClient.debug = (msg) => {
  console.log('[WEBSOCKET]', msg)
}
```

### Monitor Network Traffic
1. Open DevTools → Network tab
2. Filter: `WS` (WebSocket)
3. Click the WS connection
4. View "Messages" tab
5. See all WebSocket frames

### Check WebRTC Connection
```javascript
// In browser console
peerConnection.getStats().then(stats => {
  stats.forEach(report => {
    console.log(report.type, report)
  })
})
```

