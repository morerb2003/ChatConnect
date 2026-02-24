import { useEffect, useMemo, useRef } from 'react'
import Avatar from './Avatar'
import { useCall } from '../../context/CallContext'

const formatDuration = (seconds) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function CallModal({ activeUser }) {
  const {
    callState,
    callMode,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    elapsedSeconds,
    acceptIncomingCall,
    rejectIncomingCall,
    toggleMute,
    endCall,
  } = useCall()

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const showIncoming = callState === 'incoming' && incomingCall
  const showCallWindow = ['connecting', 'outgoing', 'active'].includes(callState)

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null
    }
  }, [localStream])

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null
    }
  }, [remoteStream])

  const statusLabel = useMemo(() => {
    if (callState === 'outgoing') return 'Ringing...'
    if (callState === 'connecting') return 'Connecting...'
    if (callState === 'active') return formatDuration(elapsedSeconds)
    return ''
  }, [callState, elapsedSeconds])

  return (
    <>
      {showIncoming ? (
        <div className="fixed right-4 top-4 z-50 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <p className="text-sm font-semibold text-slate-900">Incoming {incomingCall.data?.callMode || 'audio'} call</p>
          <p className="mt-1 text-xs text-slate-500">{incomingCall.from}</p>
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
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/60 px-4">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-slate-900 p-3 shadow-2xl">
            <div className="mb-2 flex items-center justify-between px-2 text-white">
              <div className="flex items-center gap-2">
                <Avatar name={activeUser?.name || incomingCall?.from} imageUrl={activeUser?.profileImageUrl} size="sm" />
                <div>
                  <p className="text-sm font-semibold">{activeUser?.name || incomingCall?.from}</p>
                  <p className="text-xs text-slate-300">{statusLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={endCall}
                className="rounded-lg border border-slate-500 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="aspect-video rounded-xl bg-slate-800">
                {callMode === 'video' ? (
                  <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-slate-200">Audio call connected</div>
                )}
              </div>
              <div className="aspect-video rounded-xl bg-slate-800">
                {callMode === 'video' ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-sm text-slate-200">
                    Microphone {isMuted ? 'muted' : 'active'}
                  </div>
                )}
              </div>
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
