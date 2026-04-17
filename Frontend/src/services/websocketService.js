import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

/**
 * WebSocket Configuration for Production
 * 
 * CRITICAL: Use https:// or http:// URLs (NOT wss:// or ws://)
 * SockJS automatically handles the protocol upgrade:
 * - https://... → wss:// (secure)
 * - http://... → ws:// (insecure, dev only)
 */

// Reconnection configuration
export const MAX_RECONNECT_ATTEMPTS = 10
const BASE_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30000

// WebSocket destinations
export const USER_MESSAGES_DESTINATION = '/user/queue/messages'
export const USER_STATUS_DESTINATION = '/user/queue/status'
export const USER_CALL_DESTINATION = '/user/queue/call'
export const USER_TYPING_DESTINATION = '/user/queue/typing'
export const USER_READ_RECEIPTS_DESTINATION = '/user/queue/read-receipts'
export const USER_ROOMS_DESTINATION = '/user/queue/rooms'
export const TOPIC_PRESENCE_DESTINATION = '/topic/presence'
const GROUP_TOPIC_PREFIX = '/topic/group/'
const GROUP_CALL_TOPIC_PREFIX = '/topic/group-call/'

/**
 * Parse nested JSON strings in message payloads
 */
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

/**
 * Parse STOMP message payload
 */
const parsePayload = (frame) => {
  try {
    return parseNestedJson(JSON.parse(frame.body))
  } catch {
    return null
  }
}

/**
 * Extract error message from STOMP frame
 */
const readStompErrorMessage = (frame) => {
  const headerMessage = frame?.headers?.message || ''
  const bodyMessage = frame?.body || ''
  return `${headerMessage} ${bodyMessage}`.trim()
}

/**
 * Determine if error is fatal (requires manual reconnection)
 */
export const shouldTreatAsFatalConnectionError = (value) => {
  const message = String(value || '').toLowerCase()
  return (
    /(^|\D)(401|403|500)(\D|$)/.test(message) ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('internal server error')
  )
}

/**
 * Check if error is a server 500 error
 */
export const isServer500Close = (event) => {
  const reason = event?.reason || ''
  return /(^|\D)500(\D|$)|internal server error/i.test(reason)
}

/**
 * Calculate exponential backoff delay for reconnection
 * Prevents overwhelming the server with reconnection attempts
 */
export const getReconnectDelayMs = (attempt) => {
  const cappedAttempt = Math.max(1, Number(attempt) || 1)
  const delay = Math.min(
    BASE_RECONNECT_DELAY_MS * 2 ** (cappedAttempt - 1),
    MAX_RECONNECT_DELAY_MS
  )
  return delay
}

/**
 * Build topic destination for group chat
 */
export const buildGroupTopicDestination = (chatRoomId) => `${GROUP_TOPIC_PREFIX}${chatRoomId}`

/**
 * Build topic destination for group call signaling
 */
export const buildGroupCallTopicDestination = (chatRoomId) => `${GROUP_CALL_TOPIC_PREFIX}${chatRoomId}`

/**
 * Create STOMP/WebSocket client with SockJS transport
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.token - JWT authentication token
 * @param {Function} config.onConnect - Callback when connected
 * @param {Function} config.onStompError - Callback on STOMP error
 * @param {Function} config.onWebSocketError - Callback on WebSocket error
 * @param {Function} config.onWebSocketClose - Callback when WebSocket closes
 * @param {boolean} config.debug - Enable debug logging (default: false)
 * 
 * @returns {Client} STOMP client instance
 * 
 * IMPORTANT: NEVER use wss:// or ws:// URLs!
 * Always use https:// or http://
 * SockJS handles the protocol upgrade automatically.
 */
export const createChatSocketClient = ({
  token,
  onConnect,
  onStompError,
  onWebSocketError,
  onWebSocketClose,
  debug = false,
}) => {
  // Get WebSocket URL from environment or use localhost fallback
  const wsBaseUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws'
  
  // Validate URL format (must be http:// or https://, NOT wss://)
  if (!wsBaseUrl.startsWith('http://') && !wsBaseUrl.startsWith('https://')) {
    console.error(`❌ INVALID WebSocket URL: ${wsBaseUrl}`)
    console.error('✅ CORRECT format: https://example.com/ws (NOT wss://)')
    throw new Error(`WebSocket URL must start with http:// or https://. Got: ${wsBaseUrl}`)
  }

  if (debug) {
    console.log(`🔌 [WebSocket] Configuring SockJS connection`)
    console.log(`   URL: ${wsBaseUrl}`)
    console.log(`   Auth: JWT Bearer token (${token ? 'present' : 'missing'})`)
  }

  return new Client({
    // CRITICAL: SockJS only accepts http:// or https:// URLs
    // It automatically upgrades to wss:// when needed
    webSocketFactory: () => {
      if (debug) console.log(`🔌 [WebSocket] Creating SockJS transport...`)
      return new SockJS(wsBaseUrl, null, {
        // Disable some transport methods for better compatibility
        transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
      })
    },

    // STOMP configuration
    connectHeaders: {
      // Send JWT token in Authorization header
      Authorization: `Bearer ${token}`,
      // Optionally set login (some backends require it)
      // login: 'guest',
      // passcode: 'guest',
    },

    // Reconnection configuration
    // reconnectDelay: 0 means auto-reconnect with exponential backoff
    reconnectDelay: 0,
    // HeartBeat configuration (in milliseconds)
    // Server → Client heartbeat every 10 seconds
    // Client → Server heartbeat every 10 seconds
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    // Disable debug output (can be spammy in production)
    debug: debug
      ? (str) => console.log(`[STOMP]`, str)
      : () => {},

    // Connection event handlers
    onConnect: (frame) => {
      if (debug) console.log('✅ [WebSocket] STOMP Connected!', frame)
      onConnect?.(frame)
    },

    onStompError: (frame) => {
      const message = readStompErrorMessage(frame)
      console.error('❌ [STOMP Error]', message)
      onStompError?.(frame, message || 'WebSocket STOMP error')
    },

    onWebSocketError: (event) => {
      console.error('❌ [WebSocket Error]', event)
      onWebSocketError?.(event)
    },

    onWebSocketClose: (event) => {
      if (debug) console.log('⚠️ [WebSocket] Connection closed', event)
      onWebSocketClose?.(event)
    },

    // Connection timeout (10 seconds)
    connectionTimeout: 10000,

    // Auto-reconnect after connection loss
    // This is handled by the CLIENT's internal logic
    // combined with reconnectDelay: 0
  })
}

/**
 * Subscribe to a destination and parse payload
 */
export const subscribeWithPayload = (client, destination, callback) => {
  return client.subscribe(destination, (frame) => {
    const data = parsePayload(frame)
    if (data) {
      callback?.(data)
    }
  })
}

/**
 * Attach all standard subscriptions to the STOMP client
 * 
 * @param {Client} client - STOMP client instance
 * @param {Object} handlers - Event handlers
 * @returns {Function} Unsubscribe function to clean up all subscriptions
 */
export const attachSubscriptions = (client, handlers) => {
  const subscriptions = []
  
  const subscribe = (destination, callback) => {
    subscriptions.push(subscribeWithPayload(client, destination, callback))
  }

  // Subscribe to all message queues
  subscribe(USER_MESSAGES_DESTINATION, handlers.onMessage)
  subscribe(USER_STATUS_DESTINATION, handlers.onStatus)
  subscribe(USER_CALL_DESTINATION, handlers.onCall)
  subscribe(USER_TYPING_DESTINATION, handlers.onTyping)
  subscribe(USER_READ_RECEIPTS_DESTINATION, handlers.onReadReceipt)
  subscribe(USER_ROOMS_DESTINATION, handlers.onRoomEvent)
  subscribe(TOPIC_PRESENCE_DESTINATION, handlers.onPresence)

  // Return cleanup function
  return () => {
    subscriptions.forEach((subscription) => subscription.unsubscribe())
  }
}

/**
 * Utility: Convert VITE_WS_URL to proper format
 * This is for cases where environment variable might have wrong format
 */
export const normalizeWebSocketUrl = (url) => {
  if (!url) return null
  
  // If already http:// or https://, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // If it's wss://, convert to https://
  if (url.startsWith('wss://')) {
    console.warn('⚠️ Replacing wss:// with https:// in WebSocket URL')
    return url.replace('wss://', 'https://')
  }
  
  // If it's ws://, convert to http://
  if (url.startsWith('ws://')) {
    console.warn('⚠️ Replacing ws:// with http:// in WebSocket URL')
    return url.replace('ws://', 'http://')
  }
  
  return url
}

/**
 * Validate WebSocket configuration before creating client
 */
export const validateWebSocketConfig = () => {
  const wsUrl = import.meta.env.VITE_WS_URL
  
  if (!wsUrl) {
    console.error('❌ VITE_WS_URL not set in environment variables')
    return false
  }
  
  if (wsUrl.startsWith('wss://')) {
    console.error('❌ VITE_WS_URL should NOT start with wss://')
    console.error('✅ Use https:// instead (SockJS auto-upgrades to wss://)')
    console.error(`   Current: ${wsUrl}`)
    console.error(`   Should be: ${wsUrl.replace('wss://', 'https://')}`)
    return false
  }
  
  if (!wsUrl.startsWith('http://') && !wsUrl.startsWith('https://')) {
    console.error(`❌ VITE_WS_URL must start with http:// or https://. Got: ${wsUrl}`)
    return false
  }
  
  return true
}
