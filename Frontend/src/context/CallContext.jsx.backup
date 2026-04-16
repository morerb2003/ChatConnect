/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'

const CallContext = createContext(null)

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

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

  const callStateRef = useRef('idle')
  const incomingCallRef = useRef(null)
  const localStreamRef = useRef(null)
  const sessionRef = useRef(null)
  const timerRef = useRef(null)

  const peerConnectionsRef = useRef(new Map())
  const pendingCandidatesRef = useRef(new Map())
  const remoteParticipantsRef = useRef(new Map())

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
    for (const peer of peerConnectionsRef.current.values()) {
      try {
        peer.onicecandidate = null
        peer.ontrack = null
        peer.onconnectionstatechange = null
        peer.close()
      } catch {
        // ignore close errors
      }
    }
    peerConnectionsRef.current.clear()
    pendingCandidatesRef.current.clear()
    remoteParticipantsRef.current.clear()
    setRemoteParticipants([])
  }, [])

  const stopLocalMedia = useCallback(() => {
    if (!localStreamRef.current) return
    localStreamRef.current.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    setLocalStream(null)
  }, [])

  const cleanupCall = useCallback(
    (nextState = 'idle') => {
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
      const existing = remoteParticipantsRef.current.get(key) || { email: key, name: displayName || email, stream: null }
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

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: needsVideo,
    })
    localStreamRef.current = stream
    setLocalStream(stream)
    return stream
  }, [])

  const queueIceCandidate = useCallback((peerEmail, candidate) => {
    const key = normalizeEmail(peerEmail)
    if (!key || !candidate) return
    const queued = pendingCandidatesRef.current.get(key) || []
    queued.push(candidate)
    pendingCandidatesRef.current.set(key, queued)
  }, [])

  const flushPendingCandidates = useCallback(
    async (peerEmail, peer) => {
      const key = normalizeEmail(peerEmail)
      if (!key || !peer) return
      const queued = pendingCandidatesRef.current.get(key) || []
      if (queued.length === 0) return
      pendingCandidatesRef.current.set(key, [])
      for (const candidate of queued) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate))
        } catch {
          // ignore invalid/late ICE candidates
        }
      }
    },
    [],
  )

  const addIceCandidateToPeer = useCallback(
    async (peerEmail, candidate) => {
      const key = normalizeEmail(peerEmail)
      if (!key || !candidate) return
      const peer = peerConnectionsRef.current.get(key)
      if (!peer || !peer.remoteDescription || !peer.remoteDescription.type) {
        queueIceCandidate(key, candidate)
        return
      }
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate))
      } catch {
        queueIceCandidate(key, candidate)
      }
    },
    [queueIceCandidate],
  )

  const closePeerConnection = useCallback(
    (peerEmail) => {
      const key = normalizeEmail(peerEmail)
      if (!key) return
      const peer = peerConnectionsRef.current.get(key)
      if (peer) {
        try {
          peer.onicecandidate = null
          peer.ontrack = null
          peer.onconnectionstatechange = null
          peer.close()
        } catch {
          // ignore close errors
        }
      }
      peerConnectionsRef.current.delete(key)
      pendingCandidatesRef.current.delete(key)
      removeRemoteParticipant(key)
    },
    [removeRemoteParticipant],
  )

  const createPeerConnection = useCallback(
    (peerEmail, peerName) => {
      const key = normalizeEmail(peerEmail)
      if (!key) return null

      closePeerConnection(key)

      const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      peer.onicecandidate = (event) => {
        if (!event.candidate) return
        const session = sessionRef.current
        if (!session) return

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

      peer.ontrack = (event) => {
        const [stream] = event.streams
        if (stream) {
          upsertRemoteParticipant(key, resolveParticipantName(key, peerName), stream)
        }
      }

      peer.onconnectionstatechange = () => {
        const state = peer.connectionState
        if (state === 'connected') {
          setCallState('active')
          startTimer()
          return
        }

        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          const session = sessionRef.current
          if (session?.type === 'GROUP') {
            closePeerConnection(key)
            if (peerConnectionsRef.current.size === 0 && callStateRef.current === 'active') {
              clearTimer()
              setCallState('outgoing')
            }
            return
          }
          cleanupCall('idle')
        }
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current))
      }

      peerConnectionsRef.current.set(key, peer)
      upsertRemoteParticipant(key, resolveParticipantName(key, peerName), undefined)
      return peer
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

  const setRemoteDescriptionSafely = useCallback(async (peer, remoteSdp) => {
    const description = new RTCSessionDescription(remoteSdp)
    if (peer.signalingState !== 'stable') {
      try {
        await peer.setLocalDescription({ type: 'rollback' })
      } catch {
        // rollback is best effort
      }
    }
    await peer.setRemoteDescription(description)
  }, [])

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
          throw new Error('Failed to initialize call connection')
        }

        const offer = await peer.createOffer()
        await peer.setLocalDescription(offer)
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
          throw new Error('Failed to send call offer')
        }
        setCallState('outgoing')
      } catch (error) {
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
          throw new Error('Failed to start group call')
        }
        setCallState('outgoing')
      } catch (error) {
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

  const acceptIncomingCall = useCallback(async () => {
    const pending = incomingCallRef.current
    if (!pending) return

    try {
      const wantsVideo = toCallMode(pending.callMode || pending?.data?.callMode) === 'video'
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
          throw new Error('Unable to join group call')
        }
        setCallState('outgoing')
        return
      }

      const fromEmail = normalizeEmail(pending.from)
      sessionRef.current = {
        type: 'DIRECT',
        targetEmail: fromEmail,
        targetName: pending.fromName || pending.from,
      }
      setSessionInfo(createSessionInfo(sessionRef.current))

      const peer = createPeerConnection(fromEmail, pending.fromName || pending.from)
      if (!peer) {
        throw new Error('Failed to initialize call connection')
      }
      await setRemoteDescriptionSafely(peer, pending.data.sdp)
      await flushPendingCandidates(fromEmail, peer)
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      sendCallSignal({
        type: 'ANSWER',
        to: fromEmail,
        data: { sdp: answer },
      })
    } catch {
      cleanupCall('idle')
      toast.error('Unable to accept call')
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
    if (session?.type === 'GROUP' && session.chatRoomId) {
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

    if (session?.type === 'DIRECT' && session.targetEmail) {
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
  }, [isMuted])

  const handleDirectSignal = useCallback(
    async (payload) => {
      const type = String(payload?.type || '').toUpperCase()
      if (!type) return

      const fromEmail = normalizeEmail(payload?.from)
      if (!fromEmail) return

      if (type === 'OFFER') {
        if (callStateRef.current !== 'idle') {
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
        const peer = peerConnectionsRef.current.get(fromEmail)
        if (!peer) return
        await peer.setRemoteDescription(new RTCSessionDescription(payload.data.sdp))
        await flushPendingCandidates(fromEmail, peer)
        setCallState('active')
        startTimer()
        return
      }

      if (type === 'ICE' && matchesActiveDirectCall && payload?.data?.candidate) {
        await addIceCandidateToPeer(fromEmail, payload.data.candidate)
        return
      }

      if (type === 'END') {
        if (matchesActiveDirectCall) {
          cleanupCall('idle')
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

      if (type === 'START') {
        if (callStateRef.current !== 'idle') return
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
        }
      }

      const session = sessionRef.current
      const inSameGroupCall = session?.type === 'GROUP' && Number(session.chatRoomId) === roomId
      if (!inSameGroupCall) {
        return
      }

      if (type === 'JOIN' && fromEmail) {
        const peer = createPeerConnection(fromEmail, payload?.data?.displayName || fromEmail)
        if (!peer) return
        try {
          const offer = await peer.createOffer()
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
        } catch {
          closePeerConnection(fromEmail)
        }
        return
      }

      if (type === 'OFFER' && fromEmail && normalizeEmail(payload?.to) === currentEmail && payload?.data?.sdp) {
        const peer = createPeerConnection(fromEmail, payload?.data?.displayName || fromEmail)
        if (!peer) return
        try {
          await setRemoteDescriptionSafely(peer, payload.data.sdp)
          await flushPendingCandidates(fromEmail, peer)
          const answer = await peer.createAnswer()
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
        } catch {
          closePeerConnection(fromEmail)
        }
        return
      }

      if (type === 'ANSWER' && fromEmail && normalizeEmail(payload?.to) === currentEmail && payload?.data?.sdp) {
        const peer = peerConnectionsRef.current.get(fromEmail)
        if (!peer) return
        await peer.setRemoteDescription(new RTCSessionDescription(payload.data.sdp))
        await flushPendingCandidates(fromEmail, peer)
        setCallState('active')
        startTimer()
        return
      }

      if (type === 'ICE_CANDIDATE' && fromEmail && normalizeEmail(payload?.to) === currentEmail && payload?.data?.candidate) {
        await addIceCandidateToPeer(fromEmail, payload.data.candidate)
        return
      }

      if (type === 'END') {
        const scope = String(payload?.data?.scope || '').toLowerCase()
        if (scope === 'all') {
          cleanupCall('idle')
          return
        }
        if (fromEmail) {
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
    throw new Error('useCall must be used inside CallProvider')
  }
  return context
}
