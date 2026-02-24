import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import CallModal from '../components/chat/CallModal'
import ChatWindow from '../components/chat/ChatWindow'
import UserSidebar from '../components/chat/UserSidebar'
import { CallProvider } from '../context/CallContext'
import useAuth from '../hooks/useAuth'
import useChatSocket from '../hooks/useChatSocket'
import useDebouncedCallback from '../hooks/useDebouncedCallback'
import { fetchMyProfile, fetchRoomMessages, fetchSidebarUsers, getOrCreateRoom, markRoomAsRead } from '../services/chatService'

const PAGE_SIZE = 30

const sortUsers = (users) =>
  [...users].sort((left, right) => {
    if (!left.lastMessageAt && !right.lastMessageAt) {
      return left.name.localeCompare(right.name)
    }
    if (!left.lastMessageAt) return 1
    if (!right.lastMessageAt) return -1
    return new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime()
  })

const shortenPreview = (text) => {
  if (!text) return ''
  return text.length > 60 ? `${text.slice(0, 60)}...` : text
}

const dedupeMessages = (messages) => {
  const seen = new Set()
  return messages.filter((message) => {
    const key = message.id ? `id:${message.id}` : `client:${message.clientMessageId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function ChatDashboard() {
  const { user, token, logout } = useAuth()
  const [users, setUsers] = useState([])
  const [activeUserId, setActiveUserId] = useState(null)
  const [messagesByRoom, setMessagesByRoom] = useState({})
  const [historyByRoom, setHistoryByRoom] = useState({})
  const [draft, setDraft] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [typingUserId, setTypingUserId] = useState(null)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [currentUserProfile, setCurrentUserProfile] = useState(null)
  const [mobileView, setMobileView] = useState('list')
  const messageEndRef = useRef(null)
  const activeUserIdRef = useRef(null)
  const activeRoomIdRef = useRef(null)
  const shouldAutoScrollRef = useRef(true)
  const openingConversationRef = useRef(new Set())
  const readAckedMessageIdsRef = useRef(new Set())
  const activeMessagesRef = useRef([])
  const callSignalHandlerRef = useRef(() => {})

  useEffect(() => {
    activeUserIdRef.current = activeUserId
  }, [activeUserId])

  const activeUser = useMemo(() => users.find((chatUser) => chatUser.userId === activeUserId) || null, [users, activeUserId])
  const activeRoomId = activeUser?.chatRoomId || null

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId
  }, [activeRoomId])

  const activeMessages = useMemo(() => {
    if (!activeRoomId) return []
    return messagesByRoom[activeRoomId] || []
  }, [activeRoomId, messagesByRoom])

  useEffect(() => {
    activeMessagesRef.current = activeMessages
  }, [activeMessages])

  useEffect(() => {
    setCurrentUserProfile((prev) => ({
      id: prev?.id || user?.userId,
      name: user?.name || prev?.name || '',
      email: user?.email || prev?.email || '',
      profileImageUrl: prev?.profileImageUrl || null,
    }))
  }, [user?.email, user?.name, user?.userId])

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return users
    return users.filter((chatUser) => {
      return chatUser.name.toLowerCase().includes(query) || chatUser.email.toLowerCase().includes(query)
    })
  }, [searchTerm, users])

  const scrollToBottom = useCallback(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [])

  const updateSidebarForMessage = useCallback(
    (payload) => {
      const otherUserId = payload.senderId === user.userId ? payload.receiverId : payload.senderId
      const isIncoming = payload.senderId !== user.userId

      setUsers((prevUsers) =>
        sortUsers(
          prevUsers.map((chatUser) => {
            if (chatUser.userId !== otherUserId) return chatUser

            const shouldIncreaseUnread =
              isIncoming &&
              !(activeUserIdRef.current === chatUser.userId && activeRoomIdRef.current === payload.chatRoomId)

            return {
              ...chatUser,
              chatRoomId: payload.chatRoomId,
              lastMessagePreview: shortenPreview(payload.content),
              lastMessageAt: payload.timestamp,
              unreadCount: shouldIncreaseUnread ? (chatUser.unreadCount || 0) + 1 : 0,
            }
          }),
        ),
      )
    },
    [user.userId],
  )

  const handleIncomingMessage = useCallback(
    async (payload) => {
      if (!payload?.chatRoomId) return

      const mappedMessage = {
        ...payload,
        isOwn: payload.senderId === user.userId,
        timestamp: payload.timestamp || new Date().toISOString(),
      }

      setMessagesByRoom((prev) => {
        const roomMessages = prev[payload.chatRoomId] || []
        const optimisticIndex = roomMessages.findIndex(
          (message) => message.clientMessageId && message.clientMessageId === payload.clientMessageId,
        )

        let nextMessages
        if (optimisticIndex >= 0) {
          nextMessages = [...roomMessages]
          nextMessages[optimisticIndex] = mappedMessage
        } else if (roomMessages.some((message) => message.id && message.id === payload.id)) {
          nextMessages = roomMessages
        } else {
          nextMessages = [...roomMessages, mappedMessage]
        }

        return {
          ...prev,
          [payload.chatRoomId]: dedupeMessages(nextMessages),
        }
      })

      updateSidebarForMessage(payload)

      if (payload.senderId !== user.userId && activeRoomIdRef.current === payload.chatRoomId) {
        try {
          await markRoomAsRead(payload.chatRoomId)
          if (payload.id) {
            sendReadEventRef.current({
              messageId: payload.id,
              senderId: payload.senderId,
              receiverId: user.userId,
            })
            readAckedMessageIdsRef.current.add(payload.id)
          }
        } catch {
          // ignore transient read-receipt failures
        }
      } else if (payload.senderId !== user.userId && payload.id) {
        sendDeliveryEventRef.current({ messageId: payload.id })
      }

      shouldAutoScrollRef.current = activeRoomIdRef.current === payload.chatRoomId
    },
    [updateSidebarForMessage, user.userId],
  )

  const sendDeliveryEventRef = useRef(() => false)
  const sendReadEventRef = useRef(() => false)

  const handleStatusEvent = useCallback((payload) => {
    if (!payload?.id) return
    setMessagesByRoom((prev) => {
      const next = { ...prev }
      let changed = false
      Object.keys(next).forEach((roomKey) => {
        const roomMessages = next[roomKey] || []
        const updated = roomMessages.map((message) => {
          if (message.id !== payload.id) return message
          changed = true
          return {
            ...message,
            status: payload.status || message.status,
            deliveredAt: payload.deliveredAt ?? message.deliveredAt,
            readAt: payload.readAt ?? message.readAt,
          }
        })
        next[roomKey] = updated
      })
      return changed ? next : prev
    })
  }, [])

  const handleTypingEvent = useCallback((payload) => {
    if (!payload?.senderId) return

    if (
      payload.typing &&
      payload.senderId === activeUserIdRef.current &&
      payload.chatRoomId === activeRoomIdRef.current
    ) {
      setTypingUserId(payload.senderId)
      return
    }

    if (!payload.typing) {
      setTypingUserId((current) => (current === payload.senderId ? null : current))
    }
  }, [])

  const handleReadReceipt = useCallback(
    (payload) => {
      if (!payload?.chatRoomId) return
      setMessagesByRoom((prev) => {
        const roomMessages = prev[payload.chatRoomId]
        if (!roomMessages) return prev

        const updated = roomMessages.map((message) => {
          if (message.senderId === user.userId) {
            return { ...message, status: 'READ', readAt: payload.readAt }
          }
          return message
        })

        return { ...prev, [payload.chatRoomId]: updated }
      })
    },
    [user.userId],
  )

  const handlePresenceEvent = useCallback((payload) => {
    if (!payload?.userId) return
    setUsers((prevUsers) =>
      prevUsers.map((chatUser) =>
        chatUser.userId === payload.userId ? { ...chatUser, online: payload.online } : chatUser,
      ),
    )
  }, [])

  const handleCallEvent = useCallback((payload) => {
    callSignalHandlerRef.current?.(payload)
  }, [])

  const { isConnected, sendMessage, sendTypingEvent, sendDeliveryEvent, sendReadEvent, sendCallSignal } = useChatSocket({
    token,
    onMessage: handleIncomingMessage,
    onStatus: handleStatusEvent,
    onCall: handleCallEvent,
    onTyping: handleTypingEvent,
    onReadReceipt: handleReadReceipt,
    onPresence: handlePresenceEvent,
    onAuthError: () => logout({ notify: true }),
  })

  useEffect(() => {
    sendDeliveryEventRef.current = sendDeliveryEvent
  }, [sendDeliveryEvent])

  useEffect(() => {
    sendReadEventRef.current = sendReadEvent
  }, [sendReadEvent])

  const registerCallSignalHandler = useCallback((handler) => {
    callSignalHandlerRef.current = handler || (() => {})
  }, [])

  const { debounced: sendStopTyping } = useDebouncedCallback(() => {
    if (!activeUser || !activeRoomId) return
    sendTypingEvent({
      chatRoomId: activeRoomId,
      receiverId: activeUser.userId,
      typing: false,
    })
  }, 450)

  const loadRoomHistory = useCallback(
    async (chatRoomId, page, replace = false) => {
      const pageData = await fetchRoomMessages(chatRoomId, page, PAGE_SIZE)
      const mappedMessages = pageData.messages.map((message) => ({
        ...message,
        isOwn: message.senderId === user.userId,
      }))

      setMessagesByRoom((prev) => {
        const existing = prev[chatRoomId] || []
        const merged = replace ? mappedMessages : [...mappedMessages, ...existing]
        return {
          ...prev,
          [chatRoomId]: dedupeMessages(merged),
        }
      })

      setHistoryByRoom((prev) => ({
        ...prev,
        [chatRoomId]: {
          nextPage: page + 1,
          last: pageData.last,
          loaded: true,
        },
      }))

      if (replace) {
        shouldAutoScrollRef.current = true
      }
    },
    [user.userId],
  )

  const openConversation = useCallback(
    async (chatUser, switchToChatView = true) => {
      if (!chatUser?.userId) return
      if (openingConversationRef.current.has(chatUser.userId)) {
        return
      }
      openingConversationRef.current.add(chatUser.userId)

      try {
        setTypingUserId(null)
        setActiveUserId(chatUser.userId)
        if (switchToChatView) {
          setMobileView('chat')
        }

        const room = await getOrCreateRoom(chatUser.userId)
        setUsers((prevUsers) =>
          prevUsers.map((item) =>
            item.userId === chatUser.userId ? { ...item, chatRoomId: room.chatRoomId, unreadCount: 0 } : item,
          ),
        )

        await loadRoomHistory(room.chatRoomId, 0, true)
        await markRoomAsRead(room.chatRoomId)
      } catch (error) {
        toast.error(error?.userMessage || error?.response?.data?.message || 'Failed to open conversation')
      } finally {
        openingConversationRef.current.delete(chatUser.userId)
      }
    },
    [loadRoomHistory],
  )

  const loadUsers = useCallback(async () => {
    try {
      setLoadingUsers(true)
      const [usersResult, profileResult] = await Promise.allSettled([fetchSidebarUsers(), fetchMyProfile()])
      const sidebarUsers = usersResult.status === 'fulfilled' ? usersResult.value : []
      const sortedUsers = sortUsers(sidebarUsers)
      setUsers(sortedUsers)
      if (profileResult.status === 'fulfilled') {
        setCurrentUserProfile(profileResult.value)
      }
      if (sortedUsers.length > 0) {
        setActiveUserId((current) => current ?? sortedUsers[0].userId)
      }
    } catch (error) {
      toast.error(error?.userMessage || error?.response?.data?.message || 'Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    if (!activeUser) {
      setMobileView('list')
    }
  }, [activeUser])

  useEffect(() => {
    if (!activeUser) return
    if (!activeUser.chatRoomId) {
      openConversation(activeUser, false)
      return
    }
    if (!historyByRoom[activeUser.chatRoomId]?.loaded) {
      loadRoomHistory(activeUser.chatRoomId, 0, true)
        .then(() => markRoomAsRead(activeUser.chatRoomId))
        .catch(() => {})
    }
  }, [activeUser, historyByRoom, loadRoomHistory, openConversation])

  useEffect(() => {
    if (!activeUser || !activeRoomId || !user?.userId) return
    const roomMessages = activeMessagesRef.current
    roomMessages.forEach((message) => {
      if (message.senderId === user.userId) return
      if (!message.id || message.status === 'READ') return
      if (readAckedMessageIdsRef.current.has(message.id)) return
      const published = sendReadEventRef.current({
        messageId: message.id,
        senderId: message.senderId,
        receiverId: user.userId,
      })
      if (published) {
        readAckedMessageIdsRef.current.add(message.id)
      }
    })
  }, [activeRoomId, activeUser, user?.userId])

  useEffect(() => {
    if (!activeRoomId) return
    if (shouldAutoScrollRef.current) {
      scrollToBottom()
    }
    shouldAutoScrollRef.current = true
  }, [activeMessages.length, activeRoomId, scrollToBottom])

  const handleDraftChange = (value) => {
    setDraft(value)
    if (!activeUser || !activeRoomId || !value.trim()) return

    sendTypingEvent({
      chatRoomId: activeRoomId,
      receiverId: activeUser.userId,
      typing: true,
    })
    sendStopTyping()
  }

  const handleSendMessage = async (event) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !activeUser || !activeRoomId) return
    if (!isConnected) {
      toast.error('Waiting for live connection. Please try again.')
      return
    }

    const clientMessageId = `client-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const published = sendMessage({
      chatRoomId: activeRoomId,
      receiverId: activeUser.userId,
      content,
      clientMessageId,
    })

    if (!published) {
      toast.error('Connection lost. Message not sent.')
      return
    }

    const optimisticMessage = {
      id: null,
      clientMessageId,
      chatRoomId: activeRoomId,
      senderId: user.userId,
      receiverId: activeUser.userId,
      content,
      status: 'SENT',
      timestamp: new Date().toISOString(),
      isOwn: true,
    }

    setMessagesByRoom((prev) => ({
      ...prev,
      [activeRoomId]: [...(prev[activeRoomId] || []), optimisticMessage],
    }))
    setUsers((prevUsers) =>
      sortUsers(
        prevUsers.map((chatUser) =>
          chatUser.userId === activeUser.userId
            ? {
                ...chatUser,
                lastMessagePreview: shortenPreview(content),
                lastMessageAt: optimisticMessage.timestamp,
                unreadCount: 0,
              }
            : chatUser,
        ),
      ),
    )

    shouldAutoScrollRef.current = true
    setDraft('')

    sendTypingEvent({
      chatRoomId: activeRoomId,
      receiverId: activeUser.userId,
      typing: false,
    })
  }

  const loadOlderMessages = async () => {
    if (!activeRoomId) return
    const roomHistory = historyByRoom[activeRoomId]
    if (!roomHistory || roomHistory.last) return

    shouldAutoScrollRef.current = false
    try {
      await loadRoomHistory(activeRoomId, roomHistory.nextPage, false)
    } catch (error) {
      toast.error(error?.userMessage || error?.response?.data?.message || 'Failed to load older messages')
      shouldAutoScrollRef.current = true
    }
  }

  if (loadingUsers) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <p className="text-sm font-medium text-slate-700">Loading conversations...</p>
      </main>
    )
  }

  return (
    <CallProvider
      currentUser={currentUserProfile || user}
      activeUser={activeUser}
      isSocketConnected={isConnected}
      sendCallSignal={sendCallSignal}
      registerSignalHandler={registerCallSignalHandler}
    >
      <main className="mx-auto min-h-screen max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        <section className="grid h-[calc(100vh-2rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_30px_rgba(2,20,20,0.12)] md:grid-cols-[320px_1fr] md:rounded-[28px]">
          <UserSidebar
            className={mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
            users={filteredUsers}
            activeUserId={activeUserId}
            onSelectUser={openConversation}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            connected={isConnected}
            currentUserName={currentUserProfile?.name || user?.name || user?.email || 'User'}
            currentUserEmail={currentUserProfile?.email || user?.email || ''}
            currentUserProfileImage={currentUserProfile?.profileImageUrl}
            onProfileUpdated={(profile) => setCurrentUserProfile(profile)}
            onLogout={() => logout()}
          />
          <ChatWindow
            className={mobileView === 'list' ? 'hidden md:grid' : 'grid'}
            activeUser={activeUser}
            messages={activeMessages}
            draft={draft}
            isConnected={isConnected}
            onDraftChange={handleDraftChange}
            onSend={handleSendMessage}
            onLoadOlder={loadOlderMessages}
            hasMoreHistory={Boolean(activeRoomId && historyByRoom[activeRoomId] && !historyByRoom[activeRoomId].last)}
            typing={typingUserId === activeUserId}
            messageEndRef={messageEndRef}
            onBack={() => setMobileView('list')}
          />
        </section>
      </main>
      <CallModal activeUser={activeUser} />
    </CallProvider>
  )
}

export default ChatDashboard
