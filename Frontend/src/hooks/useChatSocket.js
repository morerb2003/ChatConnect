import { useCallback, useEffect, useRef, useState } from 'react'
import {
  attachSubscriptions,
  createChatSocketClient,
  getReconnectDelayMs,
  isServer500Close,
  MAX_RECONNECT_ATTEMPTS,
  shouldTreatAsFatalConnectionError,
} from '../services/websocketService'

function useChatSocket({ token, onMessage, onTyping, onReadReceipt, onPresence, onAuthError }) {
  const clientRef = useRef(null)
  const unsubscribeRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectEnabledRef = useRef(false)
  const tokenRef = useRef(token)
  const fatalErrorRef = useRef(false)
  const manualCloseRef = useRef(false)
  const handlersRef = useRef({
    onMessage,
    onTyping,
    onReadReceipt,
    onPresence,
    onAuthError,
  })
  const connectRef = useRef(() => {})
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    handlersRef.current = {
      onMessage,
      onTyping,
      onReadReceipt,
      onPresence,
      onAuthError,
    }
  }, [onAuthError, onMessage, onPresence, onReadReceipt, onTyping])

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

  const deactivateClient = useCallback(() => {
    manualCloseRef.current = true
    clearSubscriptions()
    const client = clientRef.current
    clientRef.current = null
    if (client) {
      try {
        client.deactivate()
      } catch {
        // ignored
      }
    }
  }, [clearSubscriptions])

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
  }, [clearReconnectTimer, clearSubscriptions, scheduleReconnect])

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

  return { isConnected, sendMessage, sendTypingEvent }
}

export default useChatSocket
