/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import {
  WebRTCLogger,
  BrowserCompat,
  WebRTCErrorHandler,
  RetryManager,
} from '../services/webrtcUtils'

const CallContext = createContext(null)

// Module constants
const MODULE_NAME = 'CallContext'
const OFFER_OPTIONS = { offerToReceiveAudio: true, offerToReceiveVideo: true }
const ANSWER_OPTIONS = { offerToReceiveAudio: true, offerToReceiveVideo: true }
const MEDIA_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
}
const ICE_CANDIDATE_POOL_SIZE = 10
const CONNECTION_TIMEOUT_MS = 45000 // 45 seconds
const ICE_RESTART_INTERVAL_MS = 15000 // 15 seconds

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()
const toCallMode = (value) => (String(value || '').toLowerCase() === 'video' ? 'video' : 'audio')

const createSessionInfo = (session) => {
  if (!session) return null
  if (session.type === 'GROUP') {
    return {
      type: 'GROUP',
      chatRoomId: Number(session.chatRoomId) || null,
      roomName: session.roomName || null,
      initiatorEmail: session.initiatorEmail || null,
    }
  }
  return {
    type: 'DIRECT',
    targetEmail: session.targetEmail || null,
    targetName: session.targetName || null,
  }
}

/**
 * Main Call Provider Component
 * Handles all WebRTC signaling and calls
 */
export function CallProvider({
  children,
  currentUser,
  activeUser,
  isSocketConnected,
  sendCallSignal,
  sendGroupCallSignal,
  registerSignalHandler,
  registerGroupSignalHandler,
}) {
  const [callState, setCallState] = useState('idle')
  const [callMode, setCallMode] = useState('audio')
  const [incomingCall, setIncomingCall] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteParticipants, setRemoteParticipants] = useState([])
  const [isMuted, setIsMuted] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [sessionInfo, setSessionInfo] = useState(null)

  // Refs
  const callStateRef = useRef('idle')
  const incomingCallRef = useRef(null)
  const localStreamRef = useRef(null)
  const sessionRef = useRef(null)
  const timerRef = useRef(null)

  const peerConnectionsRef = useRef(new Map()) // Map<email, RTCPeerConnection>
  const peerStatesRef = useRef(new Map()) // Map<email, { createdAt, iceRestartAt, ... }>
  const pendingCandidatesRef = useRef(new Map()) // Map<email, ICECandidate[]>
  const remoteParticipantsRef = useRef(new Map())

  // Browser compatibility check
  useEffect(() => {
    const capabilities = BrowserCompat.checkWebRTCCapabilities()
    WebRTCLogger.info(MODULE_NAME, 'BrowserInfo', {
      browser: BrowserCompat.getBrowserType(),
      platform: BrowserCompat.getPlatformType(),
      capabilities,
    })
    if (!capabilities.supported) {
      toast.error('Your browser does not support video calls')
    }
  }, [])

  // Sync refs with state
  useEffect(() => {
    callStateRef.current = callState
  }, [callState])

  useEffect(() => {
    incomingCallRef.current = incomingCall
  }, [incomingCall])

  const updateRemoteParticipantsState = useCallback(() => {
    setRemoteParticipants([...remoteParticipantsRef.current.values()])
  }, [])

  const resolveParticipantName = useCallback(
    (email, fallback = '') => {
      const normalized = normalizeEmail(email)
      if (!normalized) return fallback || 'Participant'
      if (normalizeEmail(currentUser?.email) === normalized) return currentUser?.name || currentUser?.email || 'You'

      if (activeUser?.roomType === 'GROUP' && Array.isArray(activeUser?.members)) {
        const member = activeUser.members.find((item) => normalizeEmail(item?.email) === normalized)
        if (member?.name) return member.name
      }

      if (normalizeEmail(activeUser?.email) === normalized && activeUser?.name) {
        return activeUser.name
      }

      return fallback || email || 'Participant'
    },
    [activeUser, currentUser?.email, currentUser?.name],
  )

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setElapsedSeconds(0)
  }, [])

  const startTimer = useCallback(() => {
    if (!timerRef.current) {
      timerRef.current = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000)
    }
  }, [])

  const clearPeerConnections = useCallback(() => {
    for (const [key, peer] of peerConnectionsRef.current.entries()) {
      try {
        WebRTCLogger.debug(MODULE_NAME, 'ClosingPeerConnection', { peerId: key })
        peer.onicecandidate = null
        peer.ontrack = null
        peer.onconnectionstatechange = null
        peer.oniceconnectionstatechange = null
        peer.onsignalingstatechange = null
        peer.close()
      } catch (error) {
        WebRTCLogger.warn(MODULE_NAME, 'ErrorClosingPeer', { peerId: key, error: error?.message })
      }
    }
    peerConnectionsRef.current.clear()
    peerStatesRef.current.clear()
    pendingCandidatesRef.current.clear()
    remoteParticipantsRef.current.clear()
    setRemoteParticipants([])
    WebRTCLogger.info(MODULE_NAME, 'AllPeerConnectionsClosed', {})
  }, [])

  const stopLocalMedia = useCallback(() => {
    if (!localStreamRef.current) return
    WebRTCLogger.debug(MODULE_NAME, 'StoppingLocalMedia', {})
    localStreamRef.current.getTracks().forEach((track) => {
      track.stop()
    })
    localStreamRef.current = null
    setLocalStream(null)
  }, [])

  const cleanupCall = useCallback(
    (nextState = 'idle') => {
      WebRTCLogger.info(MODULE_NAME, 'CleanupCall', { nextState })
      clearTimer()
      clearPeerConnections()
      stopLocalMedia()
      setIncomingCall(null)
      setIsMuted(false)
      setCallState(nextState)
      if (nextState === 'idle') {
        sessionRef.current = null
        setSessionInfo(null)
      }
    },
    [clearPeerConnections, clearTimer, stopLocalMedia],
  )

  const upsertRemoteParticipant = useCallback(
    (email, displayName, stream = undefined) => {
      const key = normalizeEmail(email)
      if (!key) return
      const existing = remoteParticipantsRef.current.get(key) || {
        email: key,
        name: displayName || email,
        stream: null,
      }
      const next = {
        ...existing,
        email: key,
        name: displayName || existing.name || email || 'Participant',
        stream: stream === undefined ? existing.stream : stream,
      }
      remoteParticipantsRef.current.set(key, next)
      updateRemoteParticipantsState()
    },
    [updateRemoteParticipantsState],
  )

  const removeRemoteParticipant = useCallback(
    (email) => {
      const key = normalizeEmail(email)
      if (!key) return
      remoteParticipantsRef.current.delete(key)
      updateRemoteParticipantsState()
    },
    [updateRemoteParticipantsState],
  )

  /**
   * Get user media with error handling and fallbacks
   */
  const ensureLocalStream = useCallback(async (needsVideo) => {
    const existing = localStreamRef.current
    if (existing) {
      const hasLiveVideo = existing.getVideoTracks().some((track) => track.readyState === 'live')
      if (!needsVideo || hasLiveVideo) {
        return existing
      }
      existing.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    try {
      WebRTCLogger.debug(MODULE_NAME, 'RequestingMediaDevices', { needsVideo })

      // Use device-optimized constraints based on browser/platform
      const constraints = BrowserCompat.getMediaConstraints(needsVideo)

      const stream = await RetryManager.executeWithRetry(
        () => navigator.mediaDevices.getUserMedia(constraints),
        {
          maxAttempts: 3,
          initialDelayMs: 200,
          label: 'getUserMedia',
        },
      )

      WebRTCLogger.info(MODULE_NAME, 'MediaStreamObtained', {
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
      })

      localStreamRef.current = stream
      setLocalStream(stream)

      // Log track info for debugging
      stream.getTracks().forEach((track) => {
        WebRTCLogger.debug(MODULE_NAME, 'TrackInfo', {
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
          label: track.label,
        })
      })

      return stream
    } catch (error) {
      const { message, userMessage } = WebRTCErrorHandler.handleMediaError(error)
      toast.error(userMessage)
      throw new Error(message)
    }
  }, [])

  const queueIceCandidate = useCallback((peerEmail, candidate) => {
    const key = normalizeEmail(peerEmail)
    if (!key || !candidate) return
    const queued = pendingCandidatesRef.current.get(key) || []
    queued.push(candidate)
    pendingCandidatesRef.current.set(key, queued)
    WebRTCLogger.debug(MODULE_NAME, 'QueuedICECandidate', { peerId: key, queueSize: queued.length })
  }, [])

  const flushPendingCandidates = useCallback(
    async (peerEmail, peer) => {
      const key = normalizeEmail(peerEmail)
      if (!key || !peer) return
      const queued = pendingCandidatesRef.current.get(key) || []
      if (queued.length === 0) return

      WebRTCLogger.debug(MODULE_NAME, 'FlushinPendingCandidates', { peerId: key, count: queued.length })
      pendingCandidatesRef.current.set(key, [])

      for (const candidate of queued) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (error) {
          WebRTCLogger.warn(MODULE_NAME, 'FailedToAddIceCandidate', {
            peerId: key,
            error: error?.message,
          })
        }
      }
    },
    [],
  )

  const addIceCandidateToPeer = useCallback(
    async (peerEmail, candidate) => {
      const key = normalizeEmail(peerEmail)
      if (!key || !candidate) return

      WebRTCLogger.logIceCandidate(key, candidate, 'remote')

      const peer = peerConnectionsRef.current.get(key)
      if (!peer) {
        WebRTCLogger.warn(MODULE_NAME, 'PeerNotFound', { peerId: key })
        queueIceCandidate(key, candidate)
        return
      }

      if (!peer.remoteDescription || !peer.remoteDescription.type) {
        WebRTCLogger.debug(MODULE_NAME, 'RemoteDescriptionNotReady', { peerId: key })
        queueIceCandidate(key, candidate)
        return
      }

      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (error) {
        WebRTCLogger.warn(MODULE_NAME, 'FailedToAddIceCandidate', {
          peerId: key,
          error: error?.message,
        })
        queueIceCandidate(key, candidate)
      }
    },
    [queueIceCandidate],
  )

  const closePeerConnection = useCallback(
    (peerEmail) => {
      const key = normalizeEmail(peerEmail)
      if (!key) return
      WebRTCLogger.debug(MODULE_NAME, 'ClosingPeerConnection', { peerId: key })

      const peer = peerConnectionsRef.current.get(key)
      if (peer) {
        try {
          peer.onicecandidate = null
          peer.ontrack = null
          peer.onconnectionstatechange = null
          peer.oniceconnectionstatechange = null
          peer.onsignalingstatechange = null
          peer.close()
        } catch (error) {
          WebRTCLogger.warn(MODULE_NAME, 'ErrorClosingPeer', {
            peerId: key,
            error: error?.message,
          })
        }
      }
      peerConnectionsRef.current.delete(key)
      peerStatesRef.current.delete(key)
      pendingCandidatesRef.current.delete(key)
      removeRemoteParticipant(key)
    },
    [removeRemoteParticipant],
  )

  /**
   * Create RTCPeerConnection with comprehensive state monitoring
   */
  const createPeerConnection = useCallback(
    (peerEmail, peerName) => {
      const key = normalizeEmail(peerEmail)
      if (!key) return null

      closePeerConnection(key)

      try {
        WebRTCLogger.debug(MODULE_NAME, 'CreatingPeerConnection', { peerId: key, peerName })

        const rtcConfig = BrowserCompat.getRTCConfiguration()
        const peer = new RTCPeerConnection(rtcConfig)

        // Store peer state
        peerStatesRef.current.set(key, {
          createdAt: Date.now(),
          iceRestartAt: null,
          lastConnectionState: 'new',
          lastIceConnectionState: 'new',
        })

        /**
         * Handle ICE candidates
         */
        peer.onicecandidate = (event) => {
          if (!event.candidate) {
            WebRTCLogger.debug(MODULE_NAME, 'ICEGatheringComplete', { peerId: key })
            return
          }

          WebRTCLogger.logIceCandidate(key, event.candidate, 'local')
          const session = sessionRef.current
          if (!session) {
            WebRTCLogger.warn(MODULE_NAME, 'NoActiveSession', { peerId: key })
            return
          }

          if (session.type === 'GROUP') {
            sendGroupCallSignal?.({
              type: 'ICE_CANDIDATE',
              chatRoomId: session.chatRoomId,
              to: key,
              data: {
                candidate: event.candidate.toJSON(),
                displayName: currentUser?.name || currentUser?.email || 'User',
              },
            })
            return
          }

          sendCallSignal?.({
            type: 'ICE',
            to: key,
            data: { candidate: event.candidate.toJSON() },
          })
        }

        /**
         * Handle ICE connection state changes
         */
        peer.oniceconnectionstatechange = () => {
          const state = peer.iceConnectionState
          const peerState = peerStatesRef.current.get(key) || {}
          const oldState = peerState.lastIceConnectionState

          WebRTCLogger.logConnectionState(key, state, oldState)

          // Update state
          if (peerStatesRef.current.has(key)) {
            peerStatesRef.current.get(key).lastIceConnectionState = state
          }

          if (state === 'failed') {
            WebRTCLogger.warn(MODULE_NAME, 'ICEConnectionFailed', { peerId: key })
            // Attempt ICE restart for non-group calls
            if (sessionRef.current?.type !== 'GROUP' && !peerState.iceRestartAt) {
              WebRTCLogger.info(MODULE_NAME, 'AttemptingICERestart', { peerId: key })
              //Mark restart attempt
              if (peerStatesRef.current.has(key)) {
                peerStatesRef.current.get(key).iceRestartAt = Date.now()
              }
            }
          }

          if (state === 'disconnected' || state === 'closed') {
            closePeerConnection(key)
          }
        }

        /**
         * Handle connection state changes
         */
        peer.onconnectionstatechange = () => {
          const state = peer.connectionState
          const peerState = peerStatesRef.current.get(key) || {}
          const oldState = peerState.lastConnectionState

          WebRTCLogger.logConnectionState(key, `connection:${state}`, `connection:${oldState}`)

          // Update state
          if (peerStatesRef.current.has(key)) {
            peerStatesRef.current.get(key).lastConnectionState = state
          }

          if (state === 'connected') {
            WebRTCLogger.info(MODULE_NAME, 'PeerConnected', { peerId: key })
            if (sessionRef.current?.type === 'DIRECT') {
              setCallState('active')
              startTimer()
            }
            return
          }

          if (state === 'failed') {
            WebRTCLogger.error(MODULE_NAME, 'PeerConnectionFailed', new Error('Connection failed'), {
              peerId: key,
            })
            closePeerConnection(key)
            if (sessionRef.current?.type === 'DIRECT') {
              cleanupCall('idle')
              toast.error('Connection failed. Please try again.')
            }
            return
          }

          if (state === 'disconnected' || state === 'closed') {
            closePeerConnection(key)
            if (sessionRef.current?.type === 'GROUP') {
              if (peerConnectionsRef.current.size === 0 && callStateRef.current === 'active') {
                clearTimer()
                setCallState('outgoing')
              }
              return
            }
            if (sessionRef.current?.type === 'DIRECT') {
              cleanupCall('idle')
            }
          }
        }

        /**
         * Handle remote tracks
         */
        peer.ontrack = (event) => {
          WebRTCLogger.info(MODULE_NAME, 'RemoteTrackReceived', {
            peerId: key,
            kind: event.track.kind,
            streams: event.streams.length,
          })

          const [stream] = event.streams
          if (stream) {
            upsertRemoteParticipant(key, resolveParticipantName(key, peerName), stream)
          }
        }

        /**
         * Add local tracks
         */
        if (localStreamRef.current) {
          const tracks = localStreamRef.current.getTracks()
          WebRTCLogger.debug(MODULE_NAME, 'AddingLocalTracks', {
            peerId: key,
            trackCount: tracks.length,
          })
          tracks.forEach((track) => {
            peer.addTrack(track, localStreamRef.current)
          })
        } else {
          WebRTCLogger.warn(MODULE_NAME, 'NoLocalStreamWhenCreatingPeer', { peerId: key })
        }

        peerConnectionsRef.current.set(key, peer)
        upsertRemoteParticipant(key, resolveParticipantName(key, peerName), undefined)

        WebRTCLogger.info(MODULE_NAME, 'PeerConnectionCreated', { peerId: key })
        return peer
      } catch (error) {
        WebRTCLogger.error(MODULE_NAME, 'FailedToCreatePeerConnection', error, { peerId: key })
        throw error
      }
    },
    [
      cleanupCall,
      closePeerConnection,
      currentUser?.email,
      currentUser?.name,
      resolveParticipantName,
      sendCallSignal,
      sendGroupCallSignal,
      startTimer,
      upsertRemoteParticipant,
    ],
  )

  /**
   * Set remote description safely with signaling state handling
   */
  const setRemoteDescriptionSafely = useCallback(async (peer, remoteSdp) => {
    try {
      WebRTCLogger.debug(MODULE_NAME, 'SettingRemoteDescription', {
        signalingState: peer.signalingState,
        sdpType: remoteSdp.type,
      })

      const description = new RTCSessionDescription(remoteSdp)

      // Handle signaling state
      if (peer.signalingState !== 'stable') {
        WebRTCLogger.debug(MODULE_NAME, 'SignalingStateNotStable', {
          state: peer.signalingState,
          attempting: 'rollback',
        })
        try {
          await peer.setLocalDescription({ type: 'rollback' })
        } catch (error) {
          WebRTCLogger.warn(MODULE_NAME, 'RollbackFailed', { error: error?.message })
        }
      }

      await peer.setRemoteDescription(description)
      WebRTCLogger.info(MODULE_NAME, 'RemoteDescriptionSet', { sdpType: remoteSdp.type })
    } catch (error) {
      WebRTCLogger.error(MODULE_NAME, 'FailedToSetRemoteDescription', error)
      throw error
    }
  }, [])

  /**
   * Start direct call
   */
  const startDirectCall = useCallback(
    async (isVideo) => {
      if (!activeUser?.email || !currentUser?.email) return
      if (activeUser.email === currentUser.email) {
        toast.error('You cannot call yourself')
        return
      }
      if (!activeUser.online) {
        toast.error('User is offline')
        return
      }
      if (!isSocketConnected) {
        toast.error('Realtime connection unavailable')
        return
      }
      if (callStateRef.current !== 'idle') {
        toast.error('You are already in a call')
        return
      }

      try {
        const mode = isVideo ? 'video' : 'audio'
        const targetEmail = normalizeEmail(activeUser.email)

        WebRTCLogger.info(MODULE_NAME, 'StartingDirectCall', {
          mode,
          target: targetEmail,
        })

        setCallMode(mode)
        setCallState('connecting')
        setIncomingCall(null)
        sessionRef.current = {
          type: 'DIRECT',
          targetEmail,
          targetName: activeUser.name || activeUser.email,
        }
        setSessionInfo(createSessionInfo(sessionRef.current))

        const stream = await ensureLocalStream(isVideo)
        setLocalStream(stream)

        const peer = createPeerConnection(targetEmail, activeUser.name || activeUser.email)
        if (!peer) {
          throw new Error('Failed to initialize peer connection')
        }

        const offer = await peer.createOffer(OFFER_OPTIONS)
        WebRTCLogger.debug(MODULE_NAME, 'OfferCreated', { sdpLength: offer.sdp.length })

        await peer.setLocalDescription(offer)
        WebRTCLogger.debug(MODULE_NAME, 'LocalDescriptionSet')

        const published = sendCallSignal({
          type: 'OFFER',
          to: targetEmail,
          data: {
            sdp: offer,
            callMode: mode,
            displayName: currentUser?.name || currentUser?.email || 'User',
          },
        })

        if (!published) {
          throw new Error('Failed to send call offer through WebSocket')
        }

        setCallState('outgoing')
        WebRTCLogger.info(MODULE_NAME, 'DirectCallInitiated', { target: targetEmail })
      } catch (error) {
        WebRTCLogger.error(MODULE_NAME, 'FailedToStartDirectCall', error)
        cleanupCall('idle')
        toast.error(error?.message || 'Unable to start call')
      }
    },
    [
      activeUser?.email,
      activeUser?.name,
      activeUser?.online,
      cleanupCall,
      createPeerConnection,
      currentUser?.email,
      currentUser?.name,
      ensureLocalStream,
      isSocketConnected,
      sendCallSignal,
    ],
  )

  /**
   * Start group call
   */
  const startGroupCall = useCallback(
    async (isVideo) => {
      const roomId = Number(activeUser?.chatRoomId)
      if (!Number.isFinite(roomId) || roomId <= 0) {
        toast.error('Select a valid group to start call')
        return
      }
      if (!isSocketConnected) {
        toast.error('Realtime connection unavailable')
        return
      }
      if (callStateRef.current !== 'idle') {
        toast.error('You are already in a call')
        return
      }

      try {
        const mode = isVideo ? 'video' : 'audio'

        WebRTCLogger.info(MODULE_NAME, 'StartingGroupCall', {
          mode,
          roomId,
        })

        setCallMode(mode)
        setCallState('connecting')
        setIncomingCall(null)
        sessionRef.current = {
          type: 'GROUP',
          chatRoomId: roomId,
          roomName: activeUser?.name || `Group ${roomId}`,
          initiatorEmail: normalizeEmail(currentUser?.email),
        }
        setSessionInfo(createSessionInfo(sessionRef.current))

        const stream = await ensureLocalStream(isVideo)
        setLocalStream(stream)

        const baseData = {
          callMode: mode,
          roomName: activeUser?.name || `Group ${roomId}`,
          displayName: currentUser?.name || currentUser?.email || 'User',
        }

        const started = sendGroupCallSignal?.({
          type: 'START',
          chatRoomId: roomId,
          data: baseData,
        })
        const joined = sendGroupCallSignal?.({
          type: 'JOIN',
          chatRoomId: roomId,
          data: baseData,
        })

        if (!started || !joined) {
          throw new Error('Failed to send group call signals')
        }

        setCallState('outgoing')
        WebRTCLogger.info(MODULE_NAME, 'GroupCallInitiated', { roomId })
      } catch (error) {
        WebRTCLogger.error(MODULE_NAME, 'FailedToStartGroupCall', error)
        cleanupCall('idle')
        toast.error(error?.message || 'Unable to start group call')
      }
    },
    [
      activeUser?.chatRoomId,
      activeUser?.name,
      cleanupCall,
      currentUser?.email,
      currentUser?.name,
      ensureLocalStream,
      isSocketConnected,
      sendGroupCallSignal,
    ],
  )

  const startCall = useCallback(
    async (isVideo) => {
      if (!activeUser) return
      if (activeUser.roomType === 'GROUP') {
        await startGroupCall(isVideo)
        return
      }
      await startDirectCall(isVideo)
    },
    [activeUser, startDirectCall, startGroupCall],
  )

  const startAudioCall = useCallback(() => {
    void startCall(false)
  }, [startCall])

  const startVideoCall = useCallback(() => {
    void startCall(true)
  }, [startCall])

  /**
   * Accept incoming call with enhanced error handling
   */
  const acceptIncomingCall = useCallback(async () => {
    const pending = incomingCallRef.current
    if (!pending) {
      WebRTCLogger.warn(MODULE_NAME, 'NoIncomingCallToAccept', {})
      return
    }

    try {
      const wantsVideo = toCallMode(pending.callMode || pending?.data?.callMode) === 'video'

      WebRTCLogger.info(MODULE_NAME, 'AcceptingIncomingCall', {
        type: pending.type,
        from: pending.from,
        mode: wantsVideo ? 'video' : 'audio',
      })

      setCallMode(wantsVideo ? 'video' : 'audio')
      setCallState('connecting')
      setIncomingCall(null)

      const stream = await ensureLocalStream(wantsVideo)
      setLocalStream(stream)

      if (pending.type === 'GROUP') {
        const roomId = Number(pending.chatRoomId)
        sessionRef.current = {
          type: 'GROUP',
          chatRoomId: roomId,
          roomName: pending.roomName || `Group ${roomId}`,
          initiatorEmail: normalizeEmail(pending.from),
        }
        setSessionInfo(createSessionInfo(sessionRef.current))

        const joined = sendGroupCallSignal?.({
          type: 'JOIN',
          chatRoomId: roomId,
          data: {
            callMode: wantsVideo ? 'video' : 'audio',
            displayName: currentUser?.name || currentUser?.email || 'User',
          },
        })

        if (!joined) {
          throw new Error('Failed to join group call - could not send JOIN signal')
        }

        setCallState('outgoing')
        WebRTCLogger.info(MODULE_NAME, 'JoinedGroupCall', { roomId })
        return
      }

      // DIRECT call - create peer connection and send answer
      const fromEmail = normalizeEmail(pending.from)
      sessionRef.current = {
        type: 'DIRECT',
        targetEmail: fromEmail,
        targetName: pending.fromName || pending.from,
      }
      setSessionInfo(createSessionInfo(sessionRef.current))

      const peer = createPeerConnection(fromEmail, pending.fromName || pending.from)
      if (!peer) {
        throw new Error('Failed to create peer connection')
      }

      // Validate remote SDP
      if (!pending.data?.sdp) {
        throw new Error('Invalid offer - missing SDP')
      }

      WebRTCLogger.debug(MODULE_NAME, 'ProcessingRemoteOffer', {
        peerId: fromEmail,
        sdpLength: pending.data.sdp.sdp?.length,
      })

      await setRemoteDescriptionSafely(peer, pending.data.sdp)
      await flushPendingCandidates(fromEmail, peer)

      const answer = await peer.createAnswer(ANSWER_OPTIONS)
      WebRTCLogger.debug(MODULE_NAME, 'AnswerCreated', { sdpLength: answer.sdp.length })

      await peer.setLocalDescription(answer)
      WebRTCLogger.debug(MODULE_NAME, 'LocalAnswerSet')

      sendCallSignal({
        type: 'ANSWER',
        to: fromEmail,
        data: { sdp: answer },
      })

      WebRTCLogger.info(MODULE_NAME, 'AnswerSent', { to: fromEmail })
    } catch (error) {
      WebRTCLogger.error(MODULE_NAME, 'FailedToAcceptCall', error)
      cleanupCall('idle')
      toast.error(error?.message || 'Unable to accept call - please try again')
    }
  }, [
    cleanupCall,
    createPeerConnection,
    currentUser?.email,
    currentUser?.name,
    ensureLocalStream,
    flushPendingCandidates,
    sendCallSignal,
    sendGroupCallSignal,
    setRemoteDescriptionSafely,
  ])

  const rejectIncomingCall = useCallback(() => {
    const pending = incomingCallRef.current
    if (!pending) return

    WebRTCLogger.info(MODULE_NAME, 'RejectingIncomingCall', {
      type: pending.type,
      from: pending.from,
    })

    if (pending.type === 'DIRECT' && pending.from) {
      sendCallSignal({
        type: 'END',
        to: pending.from,
        data: { reason: 'rejected' },
      })
    }
    setIncomingCall(null)
    setCallState('idle')
  }, [sendCallSignal])

  const endCall = useCallback(() => {
    const session = sessionRef.current
    if (!session) return

    WebRTCLogger.info(MODULE_NAME, 'EndingCall', { sessionType: session.type })

    if (session.type === 'GROUP' && session.chatRoomId) {
      const isInitiator = normalizeEmail(session.initiatorEmail) === normalizeEmail(currentUser?.email)
      sendGroupCallSignal?.({
        type: 'END',
        chatRoomId: session.chatRoomId,
        data: {
          scope: isInitiator ? 'all' : 'leave',
          displayName: currentUser?.name || currentUser?.email || 'User',
        },
      })
      cleanupCall('idle')
      return
    }

    if (session.type === 'DIRECT' && session.targetEmail) {
      sendCallSignal({
        type: 'END',
        to: session.targetEmail,
        data: { reason: 'ended' },
      })
    }
    cleanupCall('idle')
  }, [cleanupCall, currentUser?.email, currentUser?.name, sendCallSignal, sendGroupCallSignal])

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return
    const nextMuted = !isMuted
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    setIsMuted(nextMuted)
    WebRTCLogger.info(MODULE_NAME, 'MuteToggled', { muted: nextMuted })
  }, [isMuted])

  /**
   * Handle direct call signals
   */
  const handleDirectSignal = useCallback(
    async (payload) => {
      const type = String(payload?.type || '').toUpperCase()
      if (!type) return

      const fromEmail = normalizeEmail(payload?.from)
      if (!fromEmail) return

      WebRTCLogger.debug(MODULE_NAME, 'ReceivedDirectSignal', {
        type,
        from: fromEmail,
      })

      if (type === 'OFFER') {
        if (callStateRef.current !== 'idle') {
          WebRTCLogger.debug(MODULE_NAME, 'BusyRejectingOffer', { from: fromEmail })
          sendCallSignal({
            type: 'END',
            to: fromEmail,
            data: { reason: 'busy' },
          })
          return
        }

        const mode = toCallMode(payload?.data?.callMode)
        setCallMode(mode)
        setIncomingCall({
          type: 'DIRECT',
          from: fromEmail,
          fromName: payload?.data?.displayName || resolveParticipantName(fromEmail, fromEmail),
          data: payload?.data || {},
          callMode: mode,
        })
        setCallState('incoming')
        return
      }

      const session = sessionRef.current
      const targetEmail = normalizeEmail(session?.targetEmail)
      const matchesActiveDirectCall = session?.type === 'DIRECT' && targetEmail && targetEmail === fromEmail

      if (type === 'ANSWER' && matchesActiveDirectCall && payload?.data?.sdp) {
        WebRTCLogger.debug(MODULE_NAME, 'ProcessingAnswer', { from: fromEmail })
        const peer = peerConnectionsRef.current.get(fromEmail)
        if (!peer) {
          WebRTCLogger.warn(MODULE_NAME, 'PeerNotFoundForAnswer', { from: fromEmail })
          return
        }

        try {
          await peer.setRemoteDescription(new RTCSessionDescription(payload.data.sdp))
          await flushPendingCandidates(fromEmail, peer)
          setCallState('active')
          startTimer()
          WebRTCLogger.info(MODULE_NAME, 'CallConnected', { peer: fromEmail })
        } catch (error) {
          WebRTCLogger.error(MODULE_NAME, 'FailedToProcessAnswer', error, { from: fromEmail })
        }
        return
      }

      if (type === 'ICE' && matchesActiveDirectCall && payload?.data?.candidate) {
        await addIceCandidateToPeer(fromEmail, payload.data.candidate)
        return
      }

      if (type === 'END') {
        WebRTCLogger.info(MODULE_NAME, 'RemoteEndCall', { from: fromEmail })
        if (matchesActiveDirectCall) {
          cleanupCall('idle')
          toast.info('Call ended by other party')
          return
        }
        const pending = incomingCallRef.current
        if (pending?.type === 'DIRECT' && normalizeEmail(pending.from) === fromEmail) {
          setIncomingCall(null)
          setCallState('idle')
        }
      }
    },
    [
      addIceCandidateToPeer,
      cleanupCall,
      flushPendingCandidates,
      resolveParticipantName,
      sendCallSignal,
      startTimer,
    ],
  )

  /**
   * Handle group call signals
   */
  const handleGroupSignal = useCallback(
    async (payload) => {
      const type = String(payload?.type || '').toUpperCase()
      const roomId = Number(payload?.chatRoomId)
      if (!type || !Number.isFinite(roomId) || roomId <= 0) return

      const fromEmail = normalizeEmail(payload?.from)
      const currentEmail = normalizeEmail(currentUser?.email)

      if (fromEmail && currentEmail && fromEmail === currentEmail) {
        return
      }

      WebRTCLogger.debug(MODULE_NAME, 'ReceivedGroupSignal', {
        type,
        from: fromEmail,
        roomId,
      })

      if (type === 'START') {
        if (callStateRef.current !== 'idle') {
          WebRTCLogger.debug(MODULE_NAME, 'IgnoringStartInNonIdleState', { state: callStateRef.current })
          return
        }
        const mode = toCallMode(payload?.data?.callMode)
        setCallMode(mode)
        setIncomingCall({
          type: 'GROUP',
          from: fromEmail || 'group-member',
          fromName: payload?.data?.displayName || resolveParticipantName(fromEmail, fromEmail || 'Member'),
          chatRoomId: roomId,
          roomName: payload?.data?.roomName || `Group ${roomId}`,
          callMode: mode,
          data: payload?.data || {},
        })
        setCallState('incoming')
        return
      }

      const pending = incomingCallRef.current
      if (type === 'END' && pending?.type === 'GROUP' && Number(pending.chatRoomId) === roomId) {
        const scope = String(payload?.data?.scope || '').toLowerCase()
        if (scope === 'all') {
          setIncomingCall(null)
          setCallState('idle')
          toast.info('Group call ended by initiator')
        }
      }

      const session = sessionRef.current
      const inSameGroupCall = session?.type === 'GROUP' && Number(session.chatRoomId) === roomId
      if (!inSameGroupCall) {
        return
      }

      if (type === 'JOIN' && fromEmail) {
        WebRTCLogger.debug(MODULE_NAME, 'GroupMemberJoined', { peerId: fromEmail })
        const peer = createPeerConnection(fromEmail, payload?.data?.displayName || fromEmail)
        if (!peer) return
        try {
          const offer = await peer.createOffer(OFFER_OPTIONS)
          await peer.setLocalDescription(offer)
          sendGroupCallSignal?.({
            type: 'OFFER',
            chatRoomId: roomId,
            to: fromEmail,
            data: {
              sdp: offer,
              displayName: currentUser?.name || currentUser?.email || 'User',
              callMode,
            },
          })
        } catch (error) {
          WebRTCLogger.error(MODULE_NAME, 'FailedToSendOfferOnJoin', error, {
            peerId: fromEmail,
          })
          closePeerConnection(fromEmail)
        }
        return
      }

      if (type === 'OFFER' && fromEmail && normalizeEmail(payload?.to) === currentEmail && payload?.data?.sdp) {
        WebRTCLogger.debug(MODULE_NAME, 'ReceivedGroupOffer', { from: fromEmail })
        const peer = createPeerConnection(fromEmail, payload?.data?.displayName || fromEmail)
        if (!peer) return
        try {
          await setRemoteDescriptionSafely(peer, payload.data.sdp)
          await flushPendingCandidates(fromEmail, peer)
          const answer = await peer.createAnswer(ANSWER_OPTIONS)
          await peer.setLocalDescription(answer)
          sendGroupCallSignal?.({
            type: 'ANSWER',
            chatRoomId: roomId,
            to: fromEmail,
            data: {
              sdp: answer,
              displayName: currentUser?.name || currentUser?.email || 'User',
            },
          })
          setCallState('active')
          startTimer()
        } catch (error) {
          WebRTCLogger.error(MODULE_NAME, 'FailedToProcessGroupOffer', error, {
            from: fromEmail,
          })
          closePeerConnection(fromEmail)
        }
        return
      }

      if (type === 'ANSWER' && fromEmail && normalizeEmail(payload?.to) === currentEmail && payload?.data?.sdp) {
        WebRTCLogger.debug(MODULE_NAME, 'ReceivedGroupAnswer', { from: fromEmail })
        const peer = peerConnectionsRef.current.get(fromEmail)
        if (!peer) {
          WebRTCLogger.warn(MODULE_NAME, 'PeerNotFoundForGroupAnswer', { from: fromEmail })
          return
        }
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(payload.data.sdp))
          await flushPendingCandidates(fromEmail, peer)
          setCallState('active')
          startTimer()
        } catch (error) {
          WebRTCLogger.error(MODULE_NAME, 'FailedToProcessGroupAnswer', error, {
            from: fromEmail,
          })
        }
        return
      }

      if (type === 'ICE_CANDIDATE' && fromEmail && normalizeEmail(payload?.to) === currentEmail && payload?.data?.candidate) {
        await addIceCandidateToPeer(fromEmail, payload.data.candidate)
        return
      }

      if (type === 'END') {
        const scope = String(payload?.data?.scope || '').toLowerCase()
        if (scope === 'all') {
          WebRTCLogger.info(MODULE_NAME, 'GroupCallEndedByInitiator', { roomId })
          cleanupCall('idle')
          toast.info('Group call ended')
          return
        }
        if (fromEmail) {
          WebRTCLogger.debug(MODULE_NAME, 'GroupMemberLeft', { peerId: fromEmail })
          closePeerConnection(fromEmail)
          if (peerConnectionsRef.current.size === 0 && callStateRef.current === 'active') {
            clearTimer()
            setCallState('outgoing')
          }
        }
      }
    },
    [
      addIceCandidateToPeer,
      callMode,
      cleanupCall,
      closePeerConnection,
      createPeerConnection,
      clearTimer,
      currentUser?.email,
      currentUser?.name,
      flushPendingCandidates,
      resolveParticipantName,
      sendGroupCallSignal,
      setRemoteDescriptionSafely,
      startTimer,
    ],
  )

  useEffect(() => {
    registerSignalHandler?.(handleDirectSignal)
    return () => registerSignalHandler?.(() => {})
  }, [handleDirectSignal, registerSignalHandler])

  useEffect(() => {
    registerGroupSignalHandler?.(handleGroupSignal)
    return () => registerGroupSignalHandler?.(() => {})
  }, [handleGroupSignal, registerGroupSignalHandler])

  useEffect(
    () => () => {
      cleanupCall('idle')
    },
    [cleanupCall],
  )

  const value = useMemo(
    () => ({
      callState,
      callMode,
      incomingCall,
      localStream,
      remoteParticipants,
      remoteStream: remoteParticipants[0]?.stream || null,
      sessionInfo,
      isMuted,
      elapsedSeconds,
      startAudioCall,
      startVideoCall,
      acceptIncomingCall,
      rejectIncomingCall,
      toggleMute,
      endCall,
    }),
    [
      acceptIncomingCall,
      callMode,
      callState,
      elapsedSeconds,
      endCall,
      incomingCall,
      isMuted,
      localStream,
      rejectIncomingCall,
      remoteParticipants,
      sessionInfo,
      startAudioCall,
      startVideoCall,
      toggleMute,
    ],
  )

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>
}

export function useCall() {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error('useCall must be used within CallProvider')
  }
  return context
}
