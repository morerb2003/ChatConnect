import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import CallModal from '../components/chat/CallModal'
import ChatWindow from '../components/chat/ChatWindow'
import UserSidebar from '../components/chat/UserSidebar'
import { CallProvider } from '../context/CallContext'
import useAuth from '../hooks/useAuth'
import useChatSocket from '../hooks/useChatSocket'
import useDebouncedCallback from '../hooks/useDebouncedCallback'
<<<<<<< Updated upstream
import {
  deleteMessageForMe,
  deleteMessageForEveryone,
  editMessage,
  fetchMyProfile,
  fetchRoomMessages,
  fetchSidebarUsers,
  forwardMessageToUsers,
  getOrCreateRoom,
  markRoomAsRead,
  searchRoomMessages,
  uploadChatAttachment,
} from '../services/chatService'
import { buildStoredMessageContent, parseStoredMessageContent } from '../utils/messageContent'
=======
import { fetchMyProfile, fetchRoomMessages, fetchSidebarUsers, getOrCreateRoom, markRoomAsRead } from '../services/chatService'
import { parseChatContent } from '../utils/chatContent'
>>>>>>> Stashed changes

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

const resolveAssetUrl = (url) => {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
  const serverBase = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase
  return `${serverBase}${url.startsWith('/') ? '' : '/'}${url}`
}

const toViewMessage = (message, currentUserId) => {
  const parsed = parseStoredMessageContent(message.content)
  return {
    ...message,
    isOwn: message.senderId === currentUserId,
    timestamp: message.timestamp || new Date().toISOString(),
    displayContent: parsed.text,
    replyTo: parsed.replyTo,
    forwarded: parsed.forwarded,
    attachment: parsed.attachment
      ? {
          ...parsed.attachment,
          url: resolveAssetUrl(parsed.attachment.url),
        }
      : null,
    deletedForEveryone: parsed.deletedForEveryone,
    editedAt: parsed.editedAt,
  }
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
  const [replyTarget, setReplyTarget] = useState(null)
  const [forwardTarget, setForwardTarget] = useState(null)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [attachmentDraft, setAttachmentDraft] = useState(null)
  const [chatSearchTerm, setChatSearchTerm] = useState('')
  const [searchMatches, setSearchMatches] = useState([])
  const [highlightedMessageIds, setHighlightedMessageIds] = useState(new Set())
  const [hiddenMessageKeysByRoom, setHiddenMessageKeysByRoom] = useState({})
  const messageEndRef = useRef(null)
  const activeUserIdRef = useRef(null)
  const activeRoomIdRef = useRef(null)
  const shouldAutoScrollRef = useRef(true)
  const openingConversationRef = useRef(new Set())
  const readAckedMessageIdsRef = useRef(new Set())
  const activeMessagesRef = useRef([])
  const callSignalHandlerRef = useRef(() => {})
  const previewUrlRef = useRef(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

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

  const visibleMessages = useMemo(() => {
    if (!activeRoomId) return activeMessages
    const hiddenKeys = new Set(hiddenMessageKeysByRoom[activeRoomId] || [])
    return activeMessages.filter((message) => {
      const key = String(message.id || message.clientMessageId)
      return !hiddenKeys.has(key)
    }).map((message) => ({
      ...message,
      highlighted: highlightedMessageIds.has(String(message.id || message.clientMessageId)),
    }))
  }, [activeMessages, activeRoomId, hiddenMessageKeysByRoom, highlightedMessageIds])

  const editingMessage = useMemo(() => {
    if (!editingMessageId) return null
    return activeMessages.find((message) => message.id === editingMessageId) || null
  }, [activeMessages, editingMessageId])

  const filteredChatMessages = visibleMessages

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
      const contentSummary = parseChatContent(payload.content).summary

      setUsers((prevUsers) =>
        sortUsers(
          prevUsers.map((chatUser) => {
            if (chatUser.userId !== otherUserId) return chatUser

            const shouldIncreaseUnread =
              isIncoming &&
              !(activeUserIdRef.current === chatUser.userId && activeRoomIdRef.current === payload.chatRoomId)

            const parsedContent = parseStoredMessageContent(payload.content)

            return {
              ...chatUser,
              chatRoomId: payload.chatRoomId,
<<<<<<< Updated upstream
              lastMessagePreview: shortenPreview(parsedContent.text || (parsedContent.attachment?.name ? `Attachment: ${parsedContent.attachment.name}` : '')),
=======
              lastMessagePreview: shortenPreview(contentSummary),
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
      const mappedMessage = toViewMessage(payload, user.userId)
=======
      const parsedContent = parseChatContent(payload.content)
      const mappedMessageBase = {
        ...payload,
        isOwn: payload.senderId === user.userId,
        timestamp: payload.timestamp || new Date().toISOString(),
        displayText: parsedContent.summary,
        attachment: parsedContent.attachment,
        meta: parsedContent.meta,
      }
>>>>>>> Stashed changes

      setMessagesByRoom((prev) => {
        const roomMessages = prev[payload.chatRoomId] || []
        const optimisticIndex = roomMessages.findIndex(
          (message) => message.clientMessageId && message.clientMessageId === payload.clientMessageId,
        )

        let nextMessages
        if (optimisticIndex >= 0) {
          nextMessages = [...roomMessages]
<<<<<<< Updated upstream
          nextMessages[optimisticIndex] = mappedMessage
        } else {
          const existingIndex = roomMessages.findIndex((message) => message.id && message.id === payload.id)
          if (existingIndex >= 0) {
            nextMessages = [...roomMessages]
            nextMessages[existingIndex] = {
              ...roomMessages[existingIndex],
              ...mappedMessage,
            }
          } else {
            nextMessages = [...roomMessages, mappedMessage]
          }
=======
          nextMessages[optimisticIndex] = { ...mappedMessageBase, animateIn: false }
        } else if (roomMessages.some((message) => message.id && message.id === payload.id)) {
          nextMessages = roomMessages
        } else {
          nextMessages = [...roomMessages, { ...mappedMessageBase, animateIn: true }]
>>>>>>> Stashed changes
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

      if (payload.senderId !== user.userId && activeRoomIdRef.current === payload.chatRoomId && payload.id) {
        const key = String(payload.id)
        setHighlightedMessageIds((current) => new Set([...current, key]))
        setTimeout(() => {
          setHighlightedMessageIds((current) => {
            const next = new Set(current)
            next.delete(key)
            return next
          })
        }, 2200)
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
<<<<<<< Updated upstream
      const mappedMessages = pageData.messages.map((message) => toViewMessage(message, user.userId))
=======
      const mappedMessages = pageData.messages.map((message) => {
        const parsedContent = parseChatContent(message.content)

        return {
          ...message,
          isOwn: message.senderId === user.userId,
          displayText: parsedContent.summary,
          attachment: parsedContent.attachment,
          meta: parsedContent.meta,
          animateIn: false,
        }
      })
>>>>>>> Stashed changes

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
    if (chatSearchTerm.trim()) return
    setSearchMatches([])
    setHighlightedMessageIds(new Set())
  }, [chatSearchTerm])

  useEffect(() => {
    setReplyTarget(null)
    setForwardTarget(null)
    setEditingMessageId(null)
    setChatSearchTerm('')
    setSearchMatches([])
    setHighlightedMessageIds(new Set())
    setDraft('')
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setAttachmentDraft(null)
  }, [activeRoomId])

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
    if (forwardTarget) {
      setForwardTarget(null)
    }
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
    if (!activeUser || !activeRoomId) return
    if (!isConnected) {
      toast.error('Waiting for live connection. Please try again.')
      return
    }

    if (editingMessageId) {
      if (!content) return
      try {
        const existing = activeMessages.find((message) => message.id === editingMessageId)
        if (!existing) return

        const updatedContent = buildStoredMessageContent({
          text: content,
          replyTo: existing.replyTo,
          forwarded: existing.forwarded,
          attachment: existing.attachment,
          deletedForEveryone: false,
          editedAt: new Date().toISOString(),
        })

        const updated = await editMessage(editingMessageId, updatedContent)
        const mappedUpdated = toViewMessage(updated, user.userId)
        setMessagesByRoom((prev) => ({
          ...prev,
          [activeRoomId]: (prev[activeRoomId] || []).map((message) =>
            message.id === editingMessageId ? { ...message, ...mappedUpdated } : message,
          ),
        }))
        setEditingMessageId(null)
        setDraft('')
      } catch (error) {
        toast.error(error?.userMessage || error?.response?.data?.message || 'Failed to edit message')
      }
      return
    }

    if (!content && !attachmentDraft && !forwardTarget) return

    let attachmentMeta = forwardTarget?.attachment || null
    if (attachmentDraft?.file) {
      try {
        const uploaded = await uploadChatAttachment(attachmentDraft.file)
        attachmentMeta = {
          url: uploaded.url,
          name: uploaded.fileName,
          size: uploaded.size,
          contentType: uploaded.contentType,
          kind: uploaded.kind,
        }
      } catch (error) {
        toast.error(error?.userMessage || error?.response?.data?.message || 'Failed to upload attachment')
        return
      }
    }

    const storedContent = buildStoredMessageContent({
      text: content || forwardTarget?.displayContent || '',
      replyTo: replyTarget
        ? {
            id: replyTarget.id || null,
            senderName: replyTarget.senderName || 'User',
            text: replyTarget.text || '',
          }
        : null,
      forwarded: Boolean(forwardTarget),
      attachment: attachmentMeta,
      deletedForEveryone: false,
      editedAt: null,
    })

    const clientMessageId = `client-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const published = sendMessage({
      chatRoomId: activeRoomId,
      receiverId: activeUser.userId,
      content: storedContent,
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
      content: storedContent,
      status: 'SENT',
      timestamp: new Date().toISOString(),
<<<<<<< Updated upstream
=======
      isOwn: true,
      animateIn: true,
>>>>>>> Stashed changes
    }
    const mappedOptimistic = toViewMessage(optimisticMessage, user.userId)

    setMessagesByRoom((prev) => ({
      ...prev,
      [activeRoomId]: [...(prev[activeRoomId] || []), mappedOptimistic],
    }))
    setUsers((prevUsers) =>
      sortUsers(
        prevUsers.map((chatUser) =>
          chatUser.userId === activeUser.userId
            ? {
                ...chatUser,
                lastMessagePreview: shortenPreview(mappedOptimistic.displayContent || attachmentMeta?.name || ''),
                lastMessageAt: mappedOptimistic.timestamp,
                unreadCount: 0,
              }
            : chatUser,
        ),
      ),
    )

    shouldAutoScrollRef.current = true
    setDraft('')
    setReplyTarget(null)
    setForwardTarget(null)
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setAttachmentDraft(null)

    sendTypingEvent({
      chatRoomId: activeRoomId,
      receiverId: activeUser.userId,
      typing: false,
    })
  }

  const handleReplyMessage = (message) => {
    if (!message) return
    setEditingMessageId(null)
    setForwardTarget(null)
    setReplyTarget({
      id: message.id || message.clientMessageId,
      senderName: message.isOwn ? 'You' : activeUser?.name || 'User',
      text: message.displayContent || message.attachment?.name || 'Attachment',
    })
  }

  const handleForwardMessage = (message) => {
    if (!message) return
    setReplyTarget(null)
    setEditingMessageId(null)
    setForwardTarget(message)
    setDraft('')
  }

  const handleEditMessage = (message) => {
    if (!message?.id || !message.isOwn || message.deletedForEveryone) return
    setReplyTarget(null)
    setForwardTarget(null)
    setEditingMessageId(message.id)
    setDraft(message.displayContent || '')
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setDraft('')
  }

  const handleDeleteForMe = async (message) => {
    if (!message || !activeRoomId) return
    if (message.id) {
      try {
        await deleteMessageForMe(message.id)
      } catch (error) {
        toast.error(error?.userMessage || error?.response?.data?.message || 'Failed to hide message')
        return
      }
    }
    const key = String(message.id || message.clientMessageId)
    setHiddenMessageKeysByRoom((prev) => ({
      ...prev,
      [activeRoomId]: [...new Set([...(prev[activeRoomId] || []), key])],
    }))
  }

  const handleDeleteForEveryone = async (message) => {
    if (!message?.id || !message.isOwn || !activeRoomId) return
    try {
      const updated = await deleteMessageForEveryone(message.id)
      const mappedUpdated = toViewMessage(updated, user.userId)
      setMessagesByRoom((prev) => ({
        ...prev,
        [activeRoomId]: (prev[activeRoomId] || []).map((item) => (item.id === message.id ? { ...item, ...mappedUpdated } : item)),
      }))
    } catch (error) {
      toast.error(error?.userMessage || error?.response?.data?.message || 'Failed to delete message')
    }
  }

  const handleEmojiPick = (emoji) => {
    setDraft((current) => `${current}${emoji}`)
  }

  const handleAttachmentPick = (file) => {
    if (!file) return
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ]

    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, image, and video files are supported')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be 20MB or less')
      return
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }

    let previewUrl = null
    if (file.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(file)
      previewUrlRef.current = previewUrl
    }

    setAttachmentDraft({
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      previewUrl,
    })
  }

  const handleAttachmentRemove = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setAttachmentDraft(null)
  }

  const handleSearchSubmit = async () => {
    if (!activeRoomId || !chatSearchTerm.trim()) {
      setSearchMatches([])
      return
    }

    try {
      const result = await searchRoomMessages(activeRoomId, chatSearchTerm.trim(), 0, 100)
      const matches = (result?.messages || []).map((message) => ({
        id: message.id,
        timestamp: message.timestamp,
      }))
      setSearchMatches(matches)
      if (matches.length > 0) {
        const firstId = String(matches[0].id)
        setHighlightedMessageIds(new Set([firstId]))
      }
    } catch (error) {
      toast.error(error?.userMessage || error?.response?.data?.message || 'Failed to search messages')
    }
  }

  const handleSearchJump = (messageId) => {
    if (!messageId) return
    const key = String(messageId)
    setHighlightedMessageIds((current) => new Set([...current, key]))
    setTimeout(() => {
      setHighlightedMessageIds((current) => {
        const next = new Set(current)
        next.delete(key)
        return next
      })
    }, 2500)
  }

  const handleForwardToUsers = async (targetUserIds, selectedMessages = null) => {
    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) return
    const sourceMessages = Array.isArray(selectedMessages) && selectedMessages.length > 0
      ? selectedMessages.filter((message) => message?.id)
      : forwardTarget?.id
        ? [forwardTarget]
        : []
    if (sourceMessages.length === 0) return

    try {
      await Promise.all(sourceMessages.map((message) => forwardMessageToUsers(message.id, targetUserIds)))
      setForwardTarget(null)
      setDraft('')
      toast.success('Message forwarded')
    } catch (error) {
      toast.error(error?.userMessage || error?.response?.data?.message || 'Failed to forward message')
    }
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
      <main className="grid min-h-screen supports-[height:100dvh]:min-h-[100dvh] place-items-center px-4">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Loading conversations...</p>
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
<<<<<<< Updated upstream
      <main className="mx-auto min-h-screen max-w-7xl px-2 py-2 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <section className="grid h-[calc(100dvh-1rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_30px_rgba(2,20,20,0.12)] sm:h-[calc(100dvh-2rem)] sm:rounded-3xl md:grid-cols-[280px_1fr] md:h-[calc(100dvh-2.5rem)] md:rounded-[28px] lg:grid-cols-[340px_1fr] lg:h-[calc(100dvh-3rem)]">
=======
      <main className="mx-auto min-h-screen supports-[height:100dvh]:min-h-[100dvh] max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        <section className="grid min-h-0 h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)] supports-[height:100dvh]:h-[calc(100dvh-2rem)] sm:supports-[height:100dvh]:h-[calc(100dvh-3rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_14px_30px_rgba(2,20,20,0.12)] md:grid-cols-[320px_1fr] md:rounded-[28px] dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-[0_14px_30px_rgba(0,0,0,0.55)]">
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
            className={mobileView === 'list' ? 'hidden min-h-0 md:grid' : 'grid min-h-0'}
=======
            className={mobileView === 'list' ? 'hidden md:flex' : 'flex'}
>>>>>>> Stashed changes
            activeUser={activeUser}
            messages={filteredChatMessages}
            draft={draft}
            isConnected={isConnected}
            onDraftChange={handleDraftChange}
            onSend={handleSendMessage}
            onLoadOlder={loadOlderMessages}
            hasMoreHistory={Boolean(activeRoomId && historyByRoom[activeRoomId] && !historyByRoom[activeRoomId].last)}
            typing={typingUserId === activeUserId}
            messageEndRef={messageEndRef}
            onBack={() => setMobileView('list')}
            searchTerm={chatSearchTerm}
            onSearchChange={setChatSearchTerm}
            searchMatches={searchMatches}
            onSearchSubmit={handleSearchSubmit}
            onSearchJump={handleSearchJump}
            replyTarget={replyTarget}
            forwardTarget={forwardTarget}
            editingMessage={editingMessage}
            attachmentDraft={attachmentDraft}
            allUsers={users.filter((item) => item.userId !== user.userId)}
            onClearReply={() => setReplyTarget(null)}
            onClearForward={() => setForwardTarget(null)}
            onCancelEdit={handleCancelEdit}
            onAttachmentPick={handleAttachmentPick}
            onAttachmentRemove={handleAttachmentRemove}
            onEmojiPick={handleEmojiPick}
            onReplyMessage={handleReplyMessage}
            onForwardMessage={handleForwardMessage}
            onEditMessage={handleEditMessage}
            onDeleteForMe={handleDeleteForMe}
            onDeleteForEveryone={handleDeleteForEveryone}
            onForwardToUsers={handleForwardToUsers}
          />
        </section>
      </main>
      <CallModal activeUser={activeUser} />
    </CallProvider>
  )
}

export default ChatDashboard
