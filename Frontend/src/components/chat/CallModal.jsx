import { useEffect, useMemo, useRef } from 'react'
import Avatar from './Avatar'
import { useCall } from '../../context/CallContext'

const formatDuration = (seconds) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function StreamTile({ label, stream, callMode, muted = false }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null
    }
  }, [stream])

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/90">
      <div className="aspect-video">
        {callMode === 'video' ? (
          stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={muted}
              className="h-full w-full rounded-xl object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center px-3 text-center text-sm text-slate-300">Waiting for video...</div>
          )
        ) : (
          <div className="grid h-full place-items-center px-3 text-center">
            <Avatar name={label} size="xl" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-700/70 px-3 py-2 text-xs text-slate-200">
        <span className="truncate font-semibold">{label}</span>
        <span className="text-slate-400">{callMode === 'video' ? 'Video' : 'Audio'}</span>
      </div>
    </div>
  )
}

function CallModal({ activeUser }) {
  const {
    callState,
    callMode,
    incomingCall,
    localStream,
    remoteParticipants,
    sessionInfo,
    isMuted,
    elapsedSeconds,
    acceptIncomingCall,
    rejectIncomingCall,
    toggleMute,
    endCall,
  } = useCall()

  const showIncoming = callState === 'incoming' && incomingCall
  const showCallWindow = ['connecting', 'outgoing', 'active'].includes(callState)
  const isGroupCall = (sessionInfo?.type || incomingCall?.type) === 'GROUP'

  const statusLabel = useMemo(() => {
    if (callState === 'outgoing') return isGroupCall ? 'Waiting for participants...' : 'Ringing...'
    if (callState === 'connecting') return 'Connecting...'
    if (callState === 'active') return formatDuration(elapsedSeconds)
    return ''
  }, [callState, elapsedSeconds, isGroupCall])

  const title = useMemo(() => {
    if (sessionInfo?.type === 'GROUP') {
      return sessionInfo.roomName || activeUser?.name || `Group ${sessionInfo.chatRoomId}`
    }
    if (sessionInfo?.type === 'DIRECT') {
      return sessionInfo.targetName || activeUser?.name || sessionInfo.targetEmail || 'Call'
    }
    if (incomingCall?.type === 'GROUP') {
      return incomingCall.roomName || activeUser?.name || `Group ${incomingCall.chatRoomId}`
    }
    return activeUser?.name || incomingCall?.fromName || incomingCall?.from || 'Call'
  }, [activeUser?.name, incomingCall, sessionInfo])

  const incomingSubtitle = useMemo(() => {
    if (!incomingCall) return ''
    if (incomingCall.type === 'GROUP') {
      const caller = incomingCall.fromName || incomingCall.from || 'Group member'
      return `${caller} invited you`
    }
    return incomingCall.fromName || incomingCall.from || 'Incoming call'
  }, [incomingCall])

  const participantCount = remoteParticipants.length + (localStream ? 1 : 0)

  return (
    <>
      {showIncoming ? (
        <div className="fixed left-4 right-4 top-4 z-50 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:left-auto md:right-4 md:w-full md:max-w-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Incoming {incomingCall.callMode || 'audio'} {incomingCall.type === 'GROUP' ? 'group ' : ''}call
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{incomingSubtitle}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={acceptIncomingCall}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={rejectIncomingCall}
              className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Reject
            </button>
          </div>
        </div>
      ) : null}

      {showCallWindow ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/60 px-4 py-6">
          <div className="relative w-full max-w-6xl max-h-[calc(100vh-3rem)] supports-[height:100dvh]:max-h-[calc(100dvh-3rem)] overflow-hidden overflow-y-auto rounded-2xl bg-slate-900 p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between px-2 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{title}</p>
                <p className="text-xs text-slate-300">
                  {statusLabel}
                  {isGroupCall ? ` • ${Math.max(participantCount, 1)} participants` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={endCall}
                className="rounded-lg border border-slate-500 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {remoteParticipants.map((participant) => (
                <StreamTile
                  key={participant.email}
                  label={participant.name || participant.email}
                  stream={participant.stream}
                  callMode={callMode}
                />
              ))}
              <StreamTile
                label="You"
                stream={localStream}
                callMode={callMode}
                muted
              />
            </div>

            <div className="mt-3 flex justify-center gap-3">
              <button
                type="button"
                onClick={toggleMute}
                className="rounded-full border border-slate-500 px-4 py-2 text-sm font-semibold text-white"
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
              <button
                type="button"
                onClick={endCall}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
              >
                End
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default CallModal
