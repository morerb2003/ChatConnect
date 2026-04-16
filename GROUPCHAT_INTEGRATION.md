# Group Chat Frontend Integration Guide

## Step 1: Update App.jsx

Add GroupProvider to wrap your application:

```jsx
import { GroupProvider } from './context/GroupContext'

function App() {
  return (
    <GroupProvider>
      <AuthProvider>
        <ThemeProvider>
          {/* Your routes */}
        </ThemeProvider>
      </AuthProvider>
    </GroupProvider>
  )
}
```

## Step 2: Update ChatDashboard.jsx

Import and use the group components:

```jsx
import CreateGroupModal from '../components/chat/CreateGroupModal'
import GroupSettings from '../components/chat/GroupSettings'
import { useGroup } from '../hooks/useGroup'
import * as chatService from '../services/chatService'

function ChatDashboard() {
  const { selectedGroup, showGroupSettings, setShowGroupSettings } = useGroup()
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [availableUsers, setAvailableUsers] = useState([])

  // Load available users for group creation/management
  const loadAvailableUsers = async () => {
    try {
      const users = await chatService.fetchSidebarUsers()
      setAvailableUsers(users.filter(u => u.roomType !== 'GROUP'))
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  // Handle group creation
  const handleCreateGroup = async ({ name, memberIds }) => {
    try {
      setLoading(true)
      const newGroup = await chatService.createGroup({ name, memberIds })
      // Add to sidebar and open chat
      onSelectUser(newGroup)
      setIsCreateGroupOpen(false)
    } catch (error) {
      console.error('Failed to create group:', error)
      alert(error.userMessage || 'Failed to create group')
    } finally {
      setLoading(false)
    }
  }

  // Group member management handlers
  const handleAddGroupMembers = async (memberIds) => {
    try {
      setLoading(true)
      const updated = await chatService.addGroupMembers(
        selectedGroup.chatRoomId,
        memberIds
      )
      // Update group in state
      updateGroupInUI(updated)
    } catch (error) {
      console.error('Failed to add members:', error)
      alert(error.userMessage || 'Failed to add members')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveGroupMember = async (memberId) => {
    try {
      setLoading(true)
      const updated = await chatService.removeGroupMember(
        selectedGroup.chatRoomId,
        memberId
      )
      updateGroupInUI(updated)
    } catch (error) {
      console.error('Failed to remove member:', error)
      alert(error.userMessage || 'Failed to remove member')
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveGroup = async () => {
    try {
      setLoading(true)
      await chatService.leaveGroup(selectedGroup.chatRoomId)
      closeChat()
      // Refresh sidebar
      loadSidebarUsers()
    } catch (error) {
      console.error('Failed to leave group:', error)
      alert(error.userMessage || 'Failed to leave group')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    try {
      setLoading(true)
      await chatService.deleteGroup(selectedGroup.chatRoomId)
      closeChat()
      setShowGroupSettings(false)
      // Refresh sidebar
      loadSidebarUsers()
    } catch (error) {
      console.error('Failed to delete group:', error)
      alert(error.userMessage || 'Failed to delete group')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignGroupAdmin = async (memberId) => {
    try {
      setLoading(true)
      const updated = await chatService.assignGroupAdmin(
        selectedGroup.chatRoomId,
        memberId
      )
      updateGroupInUI(updated)
    } catch (error) {
      console.error('Failed to assign admin:', error)
      alert(error.userMessage || 'Failed to assign admin')
    } finally {
      setLoading(false)
    }
  }

  const updateGroupInUI = (updatedGroup) => {
    // Update selected group
    setSelectedUser(updatedGroup)
    // Update in sidebar list
    setSidebarUsers(prev => 
      prev.map(u => u.chatRoomId === updatedGroup.chatRoomId ? updatedGroup : u)
    )
  }

  return (
    <div className="chat-dashboard">
      <UserSidebar
        // ... existing props
        onCreateGroup={handleCreateGroup}
      />
      
      {/* Group Settings Panel */}
      {showGroupSettings && selectedGroup?.roomType === 'GROUP' && (
        <GroupSettings
          group={selectedGroup}
          currentUser={currentUser}
          onClose={() => setShowGroupSettings(false)}
          onAddMembers={handleAddGroupMembers}
          onRemoveMember={handleRemoveGroupMember}
          onAssignAdmin={handleAssignGroupAdmin}
          onLeaveGroup={handleLeaveGroup}
          onDeleteGroup={handleDeleteGroup}
        />
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreateGroup={handleCreateGroup}
        availableUsers={availableUsers}
        loading={loading}
      />

      <ChatWindow
        // ... existing props
        onOpenGroupSettings={() => setShowGroupSettings(true)}
      />
    </div>
  )
}
```

## Step 3: Update useChatSocket Hook

Handle group message events:

```javascript
export const useChatSocket = (currentEmail, onMessageReceived, onTypingReceived) => {
  const stompClient = useRef(null)
  const connected = useRef(false)

  const handleRoomEvent = (event) => {
    const { eventType, room, chatRoomId, affectedUserId } = event.body

    switch (eventType) {
      case 'groupCreated':
      case 'groupUpdated':
        // Refresh sidebar or update group
        onGroupUpdated?.(room)
        break

      case 'groupDeleted':
        // Close chat and remove from sidebar
        onGroupDeleted?.(chatRoomId)
        break

      case 'groupLeftForUser':
      case 'groupRemovedForUser':
        // Close chat for this user
        onGroupClosed?.(chatRoomId)
        break

      default:
        break
    }
  }

  // Subscribe to group events
  const subscribeToGroupEvents = () => {
    if (stompClient.current?.connected) {
      stompClient.current.subscribe('/user/queue/rooms', handleRoomEvent)
    }
  }

  return {
    connected: connected.current,
    sendMessage,
    subscribeToRoom,
    subscribeToGroupEvents,
    // ... other exports
  }
}
```

## Step 4: Update ChatWebSocketController Handling

Handle incoming group messages in MessageBubble or ChatWindow:

```jsx
function ChatWindow() {
  const handleMessageReceived = (message) => {
    if (message.eventType === 'groupMessage') {
      // Show sender name for group messages
      displayMessage({
        ...message,
        showSender: true,
        senderName: message.senderName,
      })
    } else {
      // Direct message handling
      displayMessage(message)
    }
  }
  // ...
}
```

## Step 5: Update User/ChatRoom Display Logic

Handle GROUP vs DIRECT type display:

```javascript
const isGroup = user?.roomType === 'GROUP'

// Sidebar display
<div className={`chat-item ${isGroup ? 'group-chat' : 'direct-chat'}`}>
  {isGroup ? (
    <>
      <h4>{user.name} <span className="group-badge">Group</span></h4>
      <p>{user.memberCount} members</p>
    </>
  ) : (
    <>
      <h4>{user.name}</h4>
      <p>{user.online ? 'Online' : 'Offline'}</p>
    </>
  )}
</div>

// Chat header display
isGroup ? (
  <>
    <h2>{room.name}</h2>
    <p>{room.memberCount} members: {room.members.map(m => m.name).join(', ')}</p>
  </>
) : (
  <>
    <h2>{user.name}</h2>
    <p>{user.online ? 'Online' : 'Offline'}</p>
  </>
)
```

## CSS Classes to Add

Add to your main stylesheet or create `GroupChat.css`:

```css
/* Group badges and indicators */
.group-badge {
  display: inline-block;
  background: #e5e5e5;
  color: #666;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 4px;
}

.group-chat {
  /* Style for group chat items in sidebar */
}

.direct-chat {
  /* Style for direct chat items in sidebar */
}

/* Group settings styles - already in GroupSettings.css */
```

## WebSocket Message Flow

### Sending Group Message
```
Client → /app/chat.send
  {
    chatRoomId: 123,
    content: "Hello group",
    receiverId: null  // null for group
  }

Server broadcasts to /queue/messages for all members
  {
    eventType: "groupMessage",
    chatRoomId: 123,
    content: "Hello group",
    senderId: 1,
    senderName: "Alice",
    ...
  }
```

### Group Event
```
Server sends to /user/queue/rooms when group changes
  {
    eventType: "groupUpdated" | "groupDeleted" | etc,
    chatRoomId: 123,
    room: { ... updated room ... },
    affectedUserId: null | userId
  }
```

## Notification System (Optional)

Add notifications for group events:

```javascript
const showNotification = (message, type = 'info') => {
  // Use your toast/notification library
  notificationService.show({
    message,
    type, // 'success', 'error', 'info', 'warning'
    duration: 4000
  })
}

// Usage
handleGroupCreated = (group) => {
  showNotification(`Group "${group.name}" created`)
}

handleGroupDeleted = (groupName) => {
  showNotification(`Group "${groupName}" was deleted`, 'warning')
}

handleRemovedFromGroup = (groupName) => {
  showNotification(`You were removed from "${groupName}"`, 'warning')
}
```

## Component Hierarchy

```
App
├── GroupProvider
│   └── ChatDashboard
│       ├── UserSidebar
│       │   └── CreateGroupModal
│       ├── ChatWindow
│       │   └── MessageBubble (handles groupMessage events)
│       └── GroupSettings (when admin opens settings)
```

## State Management Flow

1. User creates group → calls `chatService.createGroup()`
2. Backend creates group and returns ChatRoomResponse
3. ChatDashboard adds to sidebar list and opens chat
4. All members receive `groupCreated` event via WebSocket
5. They receive updates via real-time message broadcasting
6. Admin changes → `groupUpdated` event
7. Member removed → `groupRemovedForUser` event for that user, `groupUpdated` for others
8. Group deleted → `groupDeleted` event for all

## Error Handling

```javascript
try {
  await chatService.createGroup({ name, memberIds })
} catch (error) {
  // error.userMessage contains user-friendly message
  // error.response.status contains HTTP status code
  // Handle based on status:
  // 400 - Validation error (invalid name, no members, etc)
  // 401 - Unauthorized (not logged in)
  // 403 - Forbidden (not admin, etc)
  // 404 - Room not found
  // 500 - Server error
}
```
