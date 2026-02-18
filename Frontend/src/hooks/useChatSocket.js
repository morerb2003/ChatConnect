import { useCallback, useEffect, useRef, useState } from 'react'
import { attachSubscriptions, createChatSocketClient } from '../services/websocketService'

function useChatSocket({ token, onMessage, onTyping, onReadReceipt, onPresence, onAuthError }) {
  const clientRef = useRef(null)
  const unsubscribeRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)

  const cleanup = useCallback(() => {
    unsubscribeRef.current?.()
    unsubscribeRef.current = null

    if (clientRef.current) {
      try {
        clientRef.current.deactivate()
      } catch {
        // ignored
      }
      clientRef.current = null
    }
    setIsConnected(false)
  }, [])

  useEffect(() => {
    if (!token) {
      return undefined
    }

    const client = createChatSocketClient({
      token,
      onConnect: () => {
        unsubscribeRef.current?.()
        unsubscribeRef.current = attachSubscriptions(client, {
          onMessage,
          onTyping,
          onReadReceipt,
          onPresence,
        })
        setIsConnected(true)
      },
      onDisconnect: () => {
        setIsConnected(false)
      },
      onError: (message) => {
        if (/401|unauthoriz/i.test(message || '')) {
          onAuthError?.()
        }
      },
    })

    clientRef.current = client
    client.activate()

    return cleanup
  }, [cleanup, onAuthError, onMessage, onPresence, onReadReceipt, onTyping, token])

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
