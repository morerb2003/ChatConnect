# Group Chat API Reference

## Base URL
```
http://localhost:8080/api/chat
```

## Authentication
All endpoints require Bearer token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## Group Management Endpoints

### Create Group
```
POST /groups
```

**Request Body:**
```json
{
  "name": "Project Team",
  "memberIds": [2, 3, 4, 5]
}
```

**Response:**
```json
{
  "chatRoomId": 101,
  "roomType": "GROUP",
  "name": "Project Team",
  "adminId": 1,
  "members": [
    {
      "userId": 1,
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "profileImageUrl": "https://example.com/alice.jpg",
      "online": true
    },
    {
      "userId": 2,
      "name": "Bob Smith",
      "email": "bob@example.com",
      "profileImageUrl": null,
      "online": false
    }
  ]
}
```

**Status Codes:**
- `200` - Group created successfully
- `400` - Validation error (missing name, invalid members, duplicate members)
- `401` - Unauthorized
- `404` - Member not found

---

### Add Members to Group
```
POST /groups/{groupId}/members
```

**Parameters:**
- `groupId` (path): ID of the group

**Request Body:**
```json
{
  "memberIds": [6, 7, 8]
}
```

**Response:**
```json
{
  "chatRoomId": 101,
  "roomType": "GROUP",
  "name": "Project Team",
  "adminId": 1,
  "members": [
    // all members including new ones
  ]
}
```

**Status Codes:**
- `200` - Members added successfully
- `400` - Validation error or duplicate members
- `401` - Unauthorized
- `403` - Forbidden (not admin)
- `404` - Group not found

---

### Remove Member from Group
```
DELETE /groups/{groupId}/members/{memberId}
```

**Parameters:**
- `groupId` (path): ID of the group
- `memberId` (path): ID of member to remove

**Response:**
```json
{
  "chatRoomId": 101,
  "roomType": "GROUP",
  "name": "Project Team",
  "adminId": 1,
  "members": [
    // members without removed user
  ]
}
```

**Status Codes:**
- `200` - Member removed successfully
- `400` - Cannot remove admin
- `401` - Unauthorized
- `403` - Forbidden (not admin)
- `404` - Group or member not found

---

### Assign New Admin
```
POST /groups/{groupId}/admin
```

**Parameters:**
- `groupId` (path): ID of the group

**Request Body:**
```json
{
  "adminId": 3
}
```

**Response:**
```json
{
  "chatRoomId": 101,
  "roomType": "GROUP",
  "name": "Project Team",
  "adminId": 3,
  "members": [
    // all members
  ]
}
```

**Status Codes:**
- `200` - Admin assigned successfully
- `400` - Invalid admin ID or not a member
- `401` - Unauthorized
- `403` - Forbidden (not current admin)
- `404` - Group not found

---

### Leave Group
```
POST /groups/{groupId}/leave
```

**Parameters:**
- `groupId` (path): ID of the group

**Response:**
```json
{
  "chatRoomId": 101,
  "roomType": "GROUP",
  "name": "Project Team",
  "adminId": 2,
  "members": [
    // members without leaving user
    // if leaving user was admin, new admin is assigned
  ]
}
```

**Status Codes:**
- `200` - Left group successfully
- `401` - Unauthorized
- `404` - Group not found

**Notes:**
- If admin leaves, a new admin is auto-assigned from remaining members
- Requires no special permissions (any member can leave)

---

### Delete Group
```
DELETE /groups/{groupId}
```

**Parameters:**
- `groupId` (path): ID of the group

**Response:**
```json
{
  "chatRoomId": 101,
  "roomType": "GROUP"
}
```

**Status Codes:**
- `200` - Group deleted successfully
- `401` - Unauthorized
- `403` - Forbidden (not admin)
- `404` - Group not found

**Notes:**
- Admin only
- Deletes all messages in group
- All members are notified via WebSocket

---

## Message Endpoints (Group-enabled)

### Get Group Chat History
```
GET /rooms/{groupId}/messages
```

**Query Parameters:**
- `page` (optional): Page number, default 0
- `size` (optional): Messages per page, default 30

**Response:**
```json
{
  "content": [
    {
      "id": 1,
      "clientMessageId": "msg-123",
      "chatRoomId": 101,
      "roomType": "GROUP",
      "roomName": "Project Team",
      "senderId": 1,
      "senderName": "Alice Johnson",
      "content": "Hello team!",
      "messageType": "text",
      "fileUrl": null,
      "fileName": null,
      "status": "DELIVERED",
      "createdAt": "2024-04-08T10:30:00Z",
      "seenBy": [2, 3, 4]
    }
  ],
  "totalElements": 150,
  "totalPages": 5,
  "currentPage": 0,
  "pageSize": 30
}
```

**Status Codes:**
- `200` - Messages retrieved
- `401` - Unauthorized
- `404` - Group not found

---

### Mark Messages as Read
```
POST /rooms/{groupId}/read
```

**Parameters:**
- `groupId` (path): ID of the group

**Response:**
```json
{
  "message": "45 messages marked as read"
}
```

**Status Codes:**
- `200` - Messages marked as read
- `401` - Unauthorized
- `404` - Group not found

---

## Chat Sidebar Endpoints

### Get Chat Users and Groups
```
GET /users
```

**Response:**
```json
[
  {
    "userId": 1,
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "profileImageUrl": "https://example.com/alice.jpg",
    "online": true,
    "unreadCount": 0,
    "lastMessagePreview": "Hello!",
    "lastMessageAt": "2024-04-08T10:30:00Z",
    "chatRoomId": 50,
    "roomType": "DIRECT"
  },
  {
    "userId": -101,
    "name": "Project Team",
    "email": null,
    "profileImageUrl": null,
    "online": true,
    "unreadCount": 3,
    "lastMessagePreview": "See you tomorrow",
    "lastMessageAt": "2024-04-08T09:15:00Z",
    "chatRoomId": 101,
    "roomType": "GROUP",
    "adminId": 1,
    "memberCount": 4,
    "memberIds": [1, 2, 3, 4],
    "memberNames": ["Alice", "Bob", "Carol", "Dave"],
    "members": [
      {
        "userId": 1,
        "name": "Alice Johnson",
        "email": "alice@example.com",
        "profileImageUrl": "https://example.com/alice.jpg",
        "online": true
      }
    ],
    "canManageMembers": true
  }
]
```

**Status Codes:**
- `200` - Sidebar data retrieved
- `401` - Unauthorized

**Notes:**
- Returns both direct chats and groups
- Sorted by most recent message
- Group userId is negative (negated chatRoomId)
- `canManageMembers` is true if current user is group admin

---

## WebSocket Events (STOMP)

### Subscribe to Room Events
```
SUBSCRIBE /user/queue/rooms
```

**Received Events:**

#### Group Created
```json
{
  "eventType": "groupCreated",
  "chatRoomId": 101,
  "affectedUserId": null,
  "room": { /* full ChatRoomResponse */ }
}
```

#### Group Updated
Sent when members added/removed or admin changed
```json
{
  "eventType": "groupUpdated",
  "chatRoomId": 101,
  "affectedUserId": 2,
  "room": { /* full ChatRoomResponse */ }
}
```

#### Group Deleted
```json
{
  "eventType": "groupDeleted",
  "chatRoomId": 101,
  "affectedUserId": null,
  "room": null
}
```

#### Group Left by User
Sent to the user who left
```json
{
  "eventType": "groupLeftForUser",
  "chatRoomId": 101,
  "affectedUserId": 1,
  "room": null
}
```

#### Group Removed User
Sent to removed user
```json
{
  "eventType": "groupRemovedForUser",
  "chatRoomId": 101,
  "affectedUserId": 2,
  "room": null
}
```

---

### Subscribe to Group Messages
```
SUBSCRIBE /user/queue/messages
```

**Received Messages:**

#### Group Message
```json
{
  "id": 1,
  "clientMessageId": "msg-123",
  "chatRoomId": 101,
  "roomType": "GROUP",
  "roomName": "Project Team",
  "senderId": 1,
  "senderName": "Alice Johnson",
  "receiverId": null,
  "content": "Hello team!",
  "messageType": "text",
  "fileUrl": null,
  "fileName": null,
  "fileContentType": null,
  "eventType": "groupMessage",
  "status": "SENT",
  "createdAt": "2024-04-08T10:30:00Z",
  "seenBy": []
}
```

---

### Send Group Message
```
SEND /app/chat.send
```

**Message Body:**
```json
{
  "chatRoomId": 101,
  "receiverId": null,
  "content": "Hello team!",
  "clientMessageId": "msg-123"
}
```

---

### Subscribe to Typing Events
```
SUBSCRIBE /user/queue/typing
```

**Received Events:**
```json
{
  "chatRoomId": 101,
  "senderId": 1,
  "senderName": "Alice Johnson",
  "isTyping": true
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "timestamp": "2024-04-08T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Group name is required",
  "path": "/api/chat/groups"
}
```

### 401 Unauthorized
```json
{
  "timestamp": "2024-04-08T10:30:00Z",
  "status": 401,
  "error": "Unauthorized",
  "message": "Full authentication is required",
  "path": "/api/chat/groups"
}
```

### 403 Forbidden
```json
{
  "timestamp": "2024-04-08T10:30:00Z",
  "status": 403,
  "error": "Forbidden",
  "message": "Only the group admin can manage members",
  "path": "/api/chat/groups/101/members"
}
```

### 404 Not Found
```json
{
  "timestamp": "2024-04-08T10:30:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Group not found",
  "path": "/api/chat/groups/999/members"
}
```

---

## Rate Limiting & Performance

- Message pagination: max 100 per request (default 30)
- Group size: no limit (tested with 1000+ members)
- WebSocket broadcasts: broadcast to all members (implemented efficiently)
- Message queries: indexed on chatRoomId and createdAt

---

## Example cURL Commands

### Create Group
```bash
curl -X POST http://localhost:8080/api/chat/groups \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Development Team",
    "memberIds": [2, 3, 4]
  }'
```

### Add Members
```bash
curl -X POST http://localhost:8080/api/chat/groups/101/members \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"memberIds": [5, 6]}'
```

### Remove Member
```bash
curl -X DELETE http://localhost:8080/api/chat/groups/101/members/3 \
  -H "Authorization: Bearer <token>"
```

### Leave Group
```bash
curl -X POST http://localhost:8080/api/chat/groups/101/leave \
  -H "Authorization: Bearer <token>"
```

### Get Messages
```bash
curl -X GET "http://localhost:8080/api/chat/rooms/101/messages?page=0&size=50" \
  -H "Authorization: Bearer <token>"
```
