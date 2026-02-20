import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 15000
export const USER_MESSAGES_DESTINATION = '/user/queue/messages'
export const USER_TYPING_DESTINATION = '/user/queue/typing'
export const USER_READ_RECEIPTS_DESTINATION = '/user/queue/read-receipts'
export const TOPIC_PRESENCE_DESTINATION = '/topic/presence'

const parseNestedJson = (value) => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return value
  const looksLikeJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  if (!looksLikeJson) return value

  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

const parsePayload = (frame) => {
  try {
    return parseNestedJson(JSON.parse(frame.body))
  } catch {
    return null
  }
}

const readStompErrorMessage = (frame) => {
  const headerMessage = frame?.headers?.message || ''
  const bodyMessage = frame?.body || ''
  return `${headerMessage} ${bodyMessage}`.trim()
}

export const shouldTreatAsFatalConnectionError = (value) => {
  const message = String(value || '').toLowerCase()
  return (
    /(^|\D)(401|403|500)(\D|$)/.test(message) ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('internal server error')
  )
}

export const isServer500Close = (event) => {
  const reason = event?.reason || ''
  return /(^|\D)500(\D|$)|internal server error/i.test(reason)
}

export const getReconnectDelayMs = (attempt) => {
  const cappedAttempt = Math.max(1, Number(attempt) || 1)
  return Math.min(BASE_RECONNECT_DELAY_MS * 2 ** (cappedAttempt - 1), MAX_RECONNECT_DELAY_MS)
}

export const createChatSocketClient = ({
  token,
  onConnect,
  onStompError,
  onWebSocketError,
  onWebSocketClose,
}) => {
  const wsBaseUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws'

  return new Client({
    webSocketFactory: () => new SockJS(wsBaseUrl),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 0,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
    onConnect: () => {
      onConnect?.()
    },
    onStompError: (frame) => {
      const message = readStompErrorMessage(frame)
      onStompError?.(frame, message || 'WebSocket STOMP error')
    },
    onWebSocketError: (event) => {
      onWebSocketError?.(event)
    },
    onWebSocketClose: (event) => {
      onWebSocketClose?.(event)
    },
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

  subscribe(USER_MESSAGES_DESTINATION, handlers.onMessage)
  subscribe(USER_TYPING_DESTINATION, handlers.onTyping)
  subscribe(USER_READ_RECEIPTS_DESTINATION, handlers.onReadReceipt)
  subscribe(TOPIC_PRESENCE_DESTINATION, handlers.onPresence)

  return () => {
    subscriptions.forEach((subscription) => subscription.unsubscribe())
  }
}
