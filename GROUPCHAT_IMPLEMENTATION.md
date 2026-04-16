# Group Chat Implementation Guide

## Overview
This document describes the complete Group Chat feature implementation for ChatConnect, including user stories, database schema, API endpoints, WebSocket events, and frontend components.

## Backend Implementation ✅

### 1. Database Schema
- **ChatRoomType Enum**: Already supports `DIRECT` and `GROUP`
- **ChatRoom Entity**: Extended to support group fields
  - `roomType`: GROUP for group chats
  - `name`: Group name
  - `admin`: User who created the group (auto-assigned creator as admin)
  - `members`: Set<User> - all group participants
  - `createdAt`, `updatedAt`: Timestamps

- **Message Entity**: Already supports both direct and group messages
  - `receivers` handled via broadcast for groups
  - `seenBy`: Set<User> for read receipts

### 2. Backend Services

#### ChatService Methods
```java
// Group Creation
public ChatRoomResponse createGroup(String email, CreateGroupRequest request)

// Member Management
public ChatRoomResponse addUsersToGroup(String email, Long chatRoomId, UpdateGroupMembersRequest request)
public ChatRoomResponse removeUserFromGroup(String email, Long chatRoomId, Long memberId)

// Group Operations
public ChatRoomResponse leaveGroup(String email, Long chatRoomId)
  - Auto-assigns new admin if admin leaves
  - Prevents user from sending messages after leaving

public ChatRoomResponse deleteGroup(String email, Long chatRoomId)
  - Admin only
  - Notifies all members of deletion
  - Deletes all messages in the group

public ChatRoomResponse assignAdmin(String email, Long chatRoomId, Long newAdminId)
  - Admin only
  - Transfers admin rights to another member
```

#### MessageService
- `sendMessage()`: Handles both direct and group messages
- `broadcastToRoom()`: Broadcasts to all members in group
- Messages in groups:
  - `receiver` is null
  - `eventType` is "groupMessage"
  - All members receive the message

### 3. REST API Endpoints

```
POST   /api/chat/groups
       Create a new group
       Request: { name, memberIds }
       Response: ChatRoomResponse

POST   /api/chat/groups/{groupId}/members
       Add members to group (admin only)
       Request: { memberIds }
       Response: ChatRoomResponse

DELETE /api/chat/groups/{groupId}/members/{memberId}
       Remove member from group (admin only)
       Response: ChatRoomResponse

POST   /api/chat/groups/{groupId}/admin
       Assign new admin (admin only)
       Request: { adminId }
       Response: ChatRoomResponse

POST   /api/chat/groups/{groupId}/leave
       Leave group (any member)
       Response: ChatRoomResponse

DELETE /api/chat/groups/{groupId}
       Delete group (admin only)
       Deletes all messages
       Response: ChatRoomResponse

GET    /api/chat/users
       Get all groups and direct chats for sidebar
       Response: List<UserChatSummaryResponse>
       Includes: GROUP rooms plus DIRECT rooms

GET    /api/chat/rooms/{groupId}/messages
       Get group chat history
       Supports pagination
       Response: MessagePageResponse
```

### 4. WebSocket Events

#### Existing Events (Already Support Groups)
- `chat.send` → broadcasts "groupMessage" for groups
- `chat.typing` → broadcasts to all group members
- `chat.delivered` → broadcasts delivery status
- `message/read` → broadcasts read receipts

#### New Event Types
- `groupCreated`: Sent to all initial members when group is created
- `groupUpdated`: Sent to all members when group info changes
- `groupDeleted`: Sent to all members when group is deleted
- `groupLeftForUser`: Sent to user who left group
- `groupRemovedForUser`: Sent to user who is removed from group

### 5. DTOs
- `CreateGroupRequest`: { name, memberIds }
- `UpdateGroupMembersRequest`: { memberIds }
- `AssignAdminRequest`: { adminId }
- `ChatRoomResponse`: Includes admin, members list for groups
- `ChatRoomMemberResponse`: Member info
- `RoomEventResponse`: For room event notifications

---

## Frontend Implementation ✅

### 1. Services (Frontend)

#### chatService.js New Methods
```javascript
// Group Management
createGroup({ name, memberIds })
addGroupMembers(chatRoomId, memberIds)
removeGroupMember(chatRoomId, memberId)
leaveGroup(chatRoomId)
deleteGroup(chatRoomId)
assignGroupAdmin(chatRoomId, adminId)
```

### 2. Context & Hooks

#### GroupContext
```javascript
// State
- groups: Group[]
- selectedGroup: Group | null
- showGroupSettings: boolean
- loading: boolean

// Actions
- setGroups, setSelectedGroup, setShowGroupSettings, setLoading
- addGroup: Add new group to state
- updateGroup: Update existing group
- removeGroup: Remove group from state
```

#### useGroup Hook
```javascript
const { groups, selectedGroup, showGroupSettings, loading, addGroup, updateGroup, removeGroup } = useGroup()
```

### 3. Components

#### CreateGroupModal
- Modal for creating new groups
- Features:
  - Group name input (max 120 chars)
  - Member selection with search
  - Shows member avatars, names, emails, online status
  - Disable "Create" until valid input

#### GroupSettings
- Detailed group management panel
- Features:
  - Display group info (name, member count, admin)
  - List all members with online indicators
  - Add members (admin only)
  - Remove members (admin only)
  - Assign new admin (admin only)
  - Leave group button (non-admin)
  - Delete group button (admin only)
  - Confirm dialogs for destructive actions

#### ChatHeader (Enhanced)
- Already supports group display
- Shows:
  - Group name
  - Member count
  - Member list (first few names)
- Manage button (admin only) opens group settings
- Video/Audio calls disabled for groups

#### UserSidebar (Enhanced)
- Already supports group creation
- Shows:
  - "New group" button
  - Create group modal integrated
  - Displays groups in chat list with GROUP badge
  - Shows member count for groups

### 4. WebSocket Integration

#### Message Handling
- Group messages received via "/queue/messages"
- Event type "groupMessage" triggers group UI update
- Read receipts broadcast to all members

#### Room Events
- Subscribe to "/queue/rooms" for group updates
- Handle events:
  - `groupCreated`: Add to group list
  - `groupUpdated`: Refresh group info
  - `groupDeleted`: Remove from list, show notification
  - `groupLeftForUser`: Close chat if viewing deleted group
  - `groupRemovedForUser`: Close chat if user was removed

### 5. Key Features in UI

#### Sidebar
- ✅ Group list with last message previews
- ✅ Unread message count
- ✅ Group badges to distinguish from direct chats
- ✅ Create group button

#### Chat Window
- ✅ Group name and member info display
- ✅ Message history for group
- ✅ Real-time messages via WebSocket
- ✅ Message status indicators (sent, delivered, seen)
- ✅ Typing indicators for group members

#### Group Settings
- ✅ Member list with online status
- ✅ Add/Remove members (admin)
- ✅ Assign admin (admin)
- ✅ Leave group (any member)
- ✅ Delete group (admin only)

---

## Edge Cases Handled ✅

1. **Admin Leaves Group**
   - Backend auto-assigns new admin from remaining members
   - All members notified of admin change

2. **Prevent Duplicate Members**
   - Backend uses Set<User> for members
   - Duplicate additions ignored automatically

3. **Unauthorized Message Sending**
   - Backend checks user is group member
   - RejectsForbiddenOperationException if not member

4. **Group Deleted**
   - All members notified via WebSocket
   - Group removed from sidebar
   - Chat window closed if viewing deleted group
   - All messages deleted

5. **Member Removed**
   - User notified via groupRemovedForUser event
   - User removed from member list
   - User cannot send further messages

6. **User Leaves Manually**
   - groupLeftForUser event sent to user
   - groupUpdated event sent to remaining members
   - User removed from members list

---

## Permissions & Authorization

| Action | Permission |
|--------|-----------|
| Create group | Any authenticated user |
| Add member | Admin only |
| Remove member | Admin only |
| Change group name/icon | Admin only |
| Assign admin | Admin only |
| Send message | Group member only |
| Leave group | Group member (any) |
| Delete group | Admin only |

---

## Real-time Features

### WebSocket Events
- Group messages updated in real-time to all members
- Typing indicators broadcast to all members
- Read receipts (✔✔) computed from `seenBy` set
- Member online status tracked per user
- Group updates (member add/remove) broadcast immediately

### Presence Service
- Tracks online/offline status per user
- Used to show member online indicators
- Updated via WebSocket presence events

---

## Testing Scenarios

### Happy Path
1. User A creates group with Users B, C
2. All three see group in sidebar with 3 members
3. User A sends message - all receive in real-time
4. User B goes offline - online indicator updates
5. User C sends message - appears with ✔✔ when all read
6. User A assigns User B as admin
7. User A leaves group - User B becomes admin
8. User B removes User C
9. User B deletes group - all notified

### Error Cases
1. Member not in group tries to send message → Forbidden
2. Non-admin tries to remove member → Forbidden
3. Non-admin tries to delete group → Forbidden
4. Duplicate member add → Ignored
5. Already-selected member in add dialog → Unchecked

---

## Implementation Checklist

### Backend ✅
- [x] ChatService methods (create, add, remove, leave, delete, assignAdmin)
- [x] ChatController endpoints
- [x] MessageRepository delete method
- [x] AssignAdminRequest DTO
- [x] WebSocket event broadcasting
- [x] Permission checks

### Frontend ✅
- [x] chatService.js group methods
- [x] GroupContext & useGroup hook
- [x] CreateGroupModal component
- [x] GroupSettings component
- [x] Chat UI enhancements
- [x] WebSocket event handlers
- [x] Sidebar updates with groups

### Integration Needed
- [ ] Wire GroupProvider in App.jsx
- [ ] Import and use GroupContext in ChatDashboard
- [ ] Handle WebSocket room events in useChatSocket
- [ ] Show notifications on group events
- [ ] Test pagination for large groups

---

## Future Enhancements

1. **Group Icons/Avatar**
   - Upload group image
   - Display in sidebar and chat header

2. **Group Descriptions**
   - Add description field
   - Display in group info

3. **Message Search**
   - Full-text search in group messages
   - Filter by sender/date

4. **Read Receipts Improvements**
   - Show who read message when
   - Typing indicators per member

5. **Notifications**
   - Browser notifications for group messages
   - Muted groups option

6. **Group Rules**
   - Message retention policies
   - Member approval for joins
