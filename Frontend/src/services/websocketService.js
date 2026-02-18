import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const parsePayload = (frame) => {
  try {
    return JSON.parse(frame.body)
  } catch {
    return null
  }
}

export const createChatSocketClient = ({
  token,
  onConnect,
  onError,
  onDisconnect,
}) => {
  const wsBaseUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws'

  return new Client({
    webSocketFactory: () => new SockJS(`${wsBaseUrl}?token=${encodeURIComponent(token)}`),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
    onConnect: () => {
      onConnect?.()
    },
    onStompError: (frame) => {
      onError?.(frame?.headers?.message || 'WebSocket error')
    },
    onWebSocketError: () => {
      onError?.('WebSocket transport error')
    },
    onWebSocketClose: () => {
      onDisconnect?.()
    },
    beforeConnect: async () => {},
  })
}

export const attachSubscriptions = (client, handlers) => {
  const subscriptions = []
  const subscribe = (destination, callback) => {
    subscriptions.push(
      client.subscribe(destination, (frame) => {
        const data = parsePayload(frame)
        if (data) callback?.(data)
      }),
    )
  }

  subscribe('/user/queue/messages', handlers.onMessage)
  subscribe('/user/queue/typing', handlers.onTyping)
  subscribe('/user/queue/read-receipts', handlers.onReadReceipt)
  subscribe('/topic/presence', handlers.onPresence)

  return () => {
    subscriptions.forEach((subscription) => subscription.unsubscribe())
  }
}
