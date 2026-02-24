/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'

const CallContext = createContext(null)

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

export function CallProvider({
  children,
  currentUser,
  activeUser,
  isSocketConnected,
  sendCallSignal,
  registerSignalHandler,
}) {
  const [callState, setCallState] = useState('idle')
  const [callMode, setCallMode] = useState('audio')
  const [incomingCall, setIncomingCall] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const peerConnectionRef = useRef(null)
  const remoteEmailRef = useRef(null)
  const localStreamRef = useRef(null)
  const timerRef = useRef(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setElapsedSeconds(0)
  }, [])

  const cleanupCall = useCallback(
    (nextState = 'idle') => {
      clearTimer()
      const peer = peerConnectionRef.current
      if (peer) {
        try {
          peer.onicecandidate = null
          peer.ontrack = null
          peer.onconnectionstatechange = null
          peer.close()
        } catch {
          // ignore cleanup errors
        }
      }
      peerConnectionRef.current = null
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      localStreamRef.current = null
      setLocalStream(null)
      setRemoteStream(null)
      setIncomingCall(null)
      setIsMuted(false)
      setCallState(nextState)
      if (nextState === 'idle') {
        remoteEmailRef.current = null
      }
    },
    [clearTimer],
  )

  const createPeerConnection = useCallback(
    (targetEmail) => {
      const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS })
      peer.onicecandidate = (event) => {
        if (!event.candidate) return
        sendCallSignal({
          type: 'ICE',
          to: targetEmail,
          data: { candidate: event.candidate.toJSON() },
        })
      }
      peer.ontrack = (event) => {
        const [stream] = event.streams
        if (stream) {
          setRemoteStream(stream)
        }
      }
      peer.onconnectionstatechange = () => {
        const state = peer.connectionState
        if (state === 'connected') {
          setCallState('active')
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000)
          }
          return
        }
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          cleanupCall('idle')
        }
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => peer.addTrack(track, localStreamRef.current))
      }
      peerConnectionRef.current = peer
      return peer
    },
    [cleanupCall, sendCallSignal],
  )

  const startCall = useCallback(
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

      try {
        setCallMode(isVideo ? 'video' : 'audio')
        setCallState('connecting')
        remoteEmailRef.current = activeUser.email
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo,
        })
        localStreamRef.current = stream
        setLocalStream(stream)
        const peer = createPeerConnection(activeUser.email)
        const offer = await peer.createOffer()
        await peer.setLocalDescription(offer)
        const published = sendCallSignal({
          type: 'OFFER',
          to: activeUser.email,
          data: {
            sdp: offer,
            callMode: isVideo ? 'video' : 'audio',
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
    [activeUser, cleanupCall, createPeerConnection, currentUser, isSocketConnected, sendCallSignal],
  )

  const startAudioCall = useCallback(() => startCall(false), [startCall])
  const startVideoCall = useCallback(() => startCall(true), [startCall])

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall?.from || !incomingCall?.data?.sdp) return
    const wantsVideo = incomingCall.data.callMode === 'video'
    try {
      setCallState('connecting')
      setCallMode(wantsVideo ? 'video' : 'audio')
      remoteEmailRef.current = incomingCall.from
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: wantsVideo,
      })
      localStreamRef.current = stream
      setLocalStream(stream)
      const peer = createPeerConnection(incomingCall.from)
      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.data.sdp))
      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)
      sendCallSignal({
        type: 'ANSWER',
        to: incomingCall.from,
        data: { sdp: answer },
      })
      setIncomingCall(null)
    } catch {
      cleanupCall('idle')
      toast.error('Unable to accept call')
    }
  }, [cleanupCall, createPeerConnection, incomingCall, sendCallSignal])

  const rejectIncomingCall = useCallback(() => {
    if (incomingCall?.from) {
      sendCallSignal({
        type: 'END',
        to: incomingCall.from,
        data: { reason: 'rejected' },
      })
    }
    setIncomingCall(null)
    setCallState('idle')
  }, [incomingCall, sendCallSignal])

  const endCall = useCallback(() => {
    if (remoteEmailRef.current) {
      sendCallSignal({
        type: 'END',
        to: remoteEmailRef.current,
        data: { reason: 'ended' },
      })
    }
    cleanupCall('idle')
  }, [cleanupCall, sendCallSignal])

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return
    const nextMuted = !isMuted
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    setIsMuted(nextMuted)
  }, [isMuted])

  const handleSignalMessage = useCallback(
    async (payload) => {
      const type = String(payload?.type || '').toUpperCase()
      if (!type) return
      if (type === 'OFFER') {
        if (callState !== 'idle') {
          sendCallSignal({
            type: 'END',
            to: payload.from,
            data: { reason: 'busy' },
          })
          return
        }
        setCallMode(payload?.data?.callMode === 'video' ? 'video' : 'audio')
        setIncomingCall(payload)
        setCallState('incoming')
        return
      }

      if (type === 'ANSWER' && peerConnectionRef.current && payload?.data?.sdp) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.data.sdp))
        setCallState('active')
        if (!timerRef.current) {
          timerRef.current = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000)
        }
        return
      }

      if (type === 'ICE' && peerConnectionRef.current && payload?.data?.candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.data.candidate))
        return
      }

      if (type === 'END') {
        cleanupCall('idle')
      }
    },
    [callState, cleanupCall, sendCallSignal],
  )

  useEffect(() => {
    registerSignalHandler?.(handleSignalMessage)
    return () => registerSignalHandler?.(() => {})
  }, [handleSignalMessage, registerSignalHandler])

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
      remoteStream,
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
      remoteStream,
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
