import { useCallback, useEffect, useRef, useState } from 'react'
import {
  attachSubscriptions,
  buildGroupCallTopicDestination,
  buildGroupTopicDestination,
  createChatSocketClient,
  getReconnectDelayMs,
  isServer500Close,
  MAX_RECONNECT_ATTEMPTS,
  subscribeWithPayload,
  shouldTreatAsFatalConnectionError,
} from '../services/websocketService'

const normalizeGroupRoomIds = (roomIds) =>
  [...new Set((roomIds || []).map((roomId) => Number(roomId)).filter((roomId) => Number.isFinite(roomId) && roomId > 0))]
const IS_DEV = import.meta.env.DEV

function useChatSocket({
  token,
  onMessage,
  onGroupMessage,
  onStatus,
  onCall,
  onGroupCall,
  onTyping,
  onReadReceipt,
  onRoomEvent,
  onPresence,
  onAuthError,
  groupRoomIds = [],
  groupCallRoomIds = [],
}) {
  const clientRef = useRef(null)
  const unsubscribeRef = useRef(null)
  const groupSubscriptionsRef = useRef(new Map())
  const groupCallSubscriptionsRef = useRef(new Map())
  const groupRoomIdsRef = useRef(normalizeGroupRoomIds(groupRoomIds))
  const groupCallRoomIdsRef = useRef(normalizeGroupRoomIds(groupCallRoomIds))
  const reconnectTimerRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectEnabledRef = useRef(false)
  const tokenRef = useRef(token)
  const fatalErrorRef = useRef(false)
  const manualCloseRef = useRef(false)
  const handlersRef = useRef({
    onMessage,
    onGroupMessage,
    onStatus,
    onCall,
    onGroupCall,
    onTyping,
    onReadReceipt,
    onRoomEvent,
    onPresence,
    onAuthError,
  })
  const connectRef = useRef(() => {})
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    handlersRef.current = {
      onMessage,
      onGroupMessage,
      onStatus,
      onCall,
      onGroupCall,
      onTyping,
      onReadReceipt,
      onRoomEvent,
      onPresence,
      onAuthError,
    }
  }, [
    onAuthError,
    onCall,
    onGroupCall,
    onGroupMessage,
    onMessage,
    onPresence,
    onReadReceipt,
    onRoomEvent,
    onStatus,
    onTyping,
  ])

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  const clearSubscriptions = useCallback(() => {
    unsubscribeRef.current?.()
    unsubscribeRef.current = null
  }, [])

  const clearGroupSubscriptions = useCallback(() => {
    for (const subscription of groupSubscriptionsRef.current.values()) {
      try {
        subscription.unsubscribe()
      } catch {
        // ignored
      }
    }
    groupSubscriptionsRef.current.clear()
  }, [])

  const clearGroupCallSubscriptions = useCallback(() => {
    for (const subscription of groupCallSubscriptionsRef.current.values()) {
      try {
        subscription.unsubscribe()
      } catch {
        // ignored
      }
    }
    groupCallSubscriptionsRef.current.clear()
  }, [])

  const syncGroupSubscriptions = useCallback(() => {
    const client = clientRef.current
    if (!client?.connected) {
      return
    }

    const desiredRoomIds = new Set(groupRoomIdsRef.current)

    for (const [roomId, subscription] of groupSubscriptionsRef.current.entries()) {
      if (desiredRoomIds.has(roomId)) {
        continue
      }
      try {
        subscription.unsubscribe()
      } catch {
        // ignored
      }
      groupSubscriptionsRef.current.delete(roomId)
    }

    for (const roomId of desiredRoomIds) {
      if (groupSubscriptionsRef.current.has(roomId)) {
        continue
      }
      const destination = buildGroupTopicDestination(roomId)
      if (IS_DEV) {
        console.log('Subscribed to group:', roomId)
      }
      const subscription = subscribeWithPayload(client, destination, (payload) => {
        handlersRef.current.onGroupMessage?.(payload)
      })
      groupSubscriptionsRef.current.set(roomId, subscription)
    }
  }, [])

  const syncGroupCallSubscriptions = useCallback(() => {
    const client = clientRef.current
    if (!client?.connected) {
      return
    }

    const desiredRoomIds = new Set(groupCallRoomIdsRef.current)

    for (const [roomId, subscription] of groupCallSubscriptionsRef.current.entries()) {
      if (desiredRoomIds.has(roomId)) {
        continue
      }
      try {
        subscription.unsubscribe()
      } catch {
        // ignored
      }
      groupCallSubscriptionsRef.current.delete(roomId)
    }

    for (const roomId of desiredRoomIds) {
      if (groupCallSubscriptionsRef.current.has(roomId)) {
        continue
      }
      const destination = buildGroupCallTopicDestination(roomId)
      if (IS_DEV) {
        console.log('Subscribed to group call:', roomId)
      }
      const subscription = subscribeWithPayload(client, destination, (payload) => {
        handlersRef.current.onGroupCall?.(payload)
      })
      groupCallSubscriptionsRef.current.set(roomId, subscription)
    }
  }, [])

  const deactivateClient = useCallback(() => {
    manualCloseRef.current = true
    clearSubscriptions()
    clearGroupSubscriptions()
    clearGroupCallSubscriptions()
    const client = clientRef.current
    clientRef.current = null
    if (client) {
      try {
        client.deactivate()
      } catch {
        // ignored
      }
    }
  }, [clearGroupCallSubscriptions, clearGroupSubscriptions, clearSubscriptions])

  const scheduleReconnect = useCallback(() => {
    if (!reconnectEnabledRef.current || fatalErrorRef.current || !tokenRef.current) {
      return
    }
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      reconnectEnabledRef.current = false
      return
    }

    reconnectAttemptsRef.current += 1
    const delayMs = getReconnectDelayMs(reconnectAttemptsRef.current)
    clearReconnectTimer()
    reconnectTimerRef.current = setTimeout(() => {
      connectRef.current()
    }, delayMs)
  }, [clearReconnectTimer])

  const connect = useCallback(() => {
    const activeToken = tokenRef.current
    if (!activeToken || !reconnectEnabledRef.current || fatalErrorRef.current) {
      return
    }

    const existingClient = clientRef.current
    if (existingClient?.active || existingClient?.connected) {
      return
    }

    manualCloseRef.current = false

    const client = createChatSocketClient({
      token: activeToken,
      onConnect: () => {
        if (clientRef.current !== client) {
          return
        }
        reconnectAttemptsRef.current = 0
        fatalErrorRef.current = false
        setIsConnected(true)
        clearSubscriptions()
        unsubscribeRef.current = attachSubscriptions(client, handlersRef.current)
        syncGroupSubscriptions()
        syncGroupCallSubscriptions()
      },
      onStompError: (_frame, message) => {
        if (clientRef.current !== client) {
          return
        }
        const normalizedMessage = String(message || '')
        if (/401|403|unauthoriz|forbidden/i.test(normalizedMessage)) {
          reconnectEnabledRef.current = false
          fatalErrorRef.current = true
          clearReconnectTimer()
          handlersRef.current.onAuthError?.()
          return
        }

        if (shouldTreatAsFatalConnectionError(normalizedMessage)) {
          reconnectEnabledRef.current = false
          fatalErrorRef.current = true
          clearReconnectTimer()
        }
      },
      onWebSocketError: (event) => {
        if (clientRef.current !== client) {
          return
        }
        const transportMessage = `${event?.reason || ''} ${event?.message || ''}`.trim()
        if (shouldTreatAsFatalConnectionError(transportMessage)) {
          reconnectEnabledRef.current = false
          fatalErrorRef.current = true
          clearReconnectTimer()
        }
        setIsConnected(false)
      },
      onWebSocketClose: (event) => {
        if (clientRef.current !== client && !manualCloseRef.current) {
          return
        }
        clearSubscriptions()
        clearGroupSubscriptions()
        clearGroupCallSubscriptions()
        setIsConnected(false)
        clientRef.current = null

        if (manualCloseRef.current || !reconnectEnabledRef.current || fatalErrorRef.current || !tokenRef.current) {
          return
        }

        if (isServer500Close(event)) {
          reconnectEnabledRef.current = false
          fatalErrorRef.current = true
          clearReconnectTimer()
          return
        }

        scheduleReconnect()
      },
    })

    clientRef.current = client
    client.activate()
  }, [
    clearGroupCallSubscriptions,
    clearGroupSubscriptions,
    clearReconnectTimer,
    clearSubscriptions,
    scheduleReconnect,
    syncGroupCallSubscriptions,
    syncGroupSubscriptions,
  ])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    tokenRef.current = token
    if (!token) {
      reconnectEnabledRef.current = false
      reconnectAttemptsRef.current = 0
      fatalErrorRef.current = false
      clearReconnectTimer()
      deactivateClient()
      return undefined
    }

    reconnectEnabledRef.current = true
    reconnectAttemptsRef.current = 0
    fatalErrorRef.current = false
    clearReconnectTimer()
    deactivateClient()
    connectRef.current()

    return () => {
      reconnectEnabledRef.current = false
      clearReconnectTimer()
      deactivateClient()
    }
  }, [clearReconnectTimer, deactivateClient, token])

  useEffect(() => {
    groupRoomIdsRef.current = normalizeGroupRoomIds(groupRoomIds)
    syncGroupSubscriptions()
  }, [groupRoomIds, syncGroupSubscriptions])

  useEffect(() => {
    groupCallRoomIdsRef.current = normalizeGroupRoomIds(groupCallRoomIds)
    syncGroupCallSubscriptions()
  }, [groupCallRoomIds, syncGroupCallSubscriptions])

  const sendMessage = useCallback((payload) => {
    if (!clientRef.current?.connected) return false
    clientRef.current.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(payload),
    })
    return true
  }, [])

  const sendTypingEvent = useCallback((payload) => {
    if (!clientRef.current?.connected) return false
    clientRef.current.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify(payload),
    })
    return true
  }, [])

  const sendDeliveryEvent = useCallback((payload) => {
    if (!clientRef.current?.connected) return false
    clientRef.current.publish({
      destination: '/app/chat.delivered',
      body: JSON.stringify(payload),
    })
    return true
  }, [])

  const sendReadEvent = useCallback((payload) => {
    if (!clientRef.current?.connected) return false
    clientRef.current.publish({
      destination: '/app/message/read',
      body: JSON.stringify(payload),
    })
    return true
  }, [])

  const sendCallSignal = useCallback((payload) => {
    if (!clientRef.current?.connected) return false
    const type = String(payload?.type || '').toUpperCase()
    const destinationByType = {
      OFFER: '/app/call.offer',
      ANSWER: '/app/call.answer',
      ICE: '/app/call.ice',
      END: '/app/call.end',
    }
    const destination = destinationByType[type]
    if (!destination) return false
    clientRef.current.publish({
      destination,
      body: JSON.stringify({ ...payload, type }),
    })
    return true
  }, [])

  const sendGroupCallSignal = useCallback((payload) => {
    if (!clientRef.current?.connected) return false
    const type = String(payload?.type || '').toUpperCase()
    const destinationByType = {
      START: '/app/group-call.start',
      JOIN: '/app/group-call.join',
      OFFER: '/app/group-call.offer',
      ANSWER: '/app/group-call.answer',
      ICE_CANDIDATE: '/app/group-call.ice-candidate',
      END: '/app/group-call.end',
    }
    const destination = destinationByType[type]
    if (!destination) return false
    clientRef.current.publish({
      destination,
      body: JSON.stringify({ ...payload, type }),
    })
    return true
  }, [])

  return {
    isConnected,
    sendMessage,
    sendTypingEvent,
    sendDeliveryEvent,
    sendReadEvent,
    sendCallSignal,
    sendGroupCallSignal,
  }
}

export default useChatSocket
