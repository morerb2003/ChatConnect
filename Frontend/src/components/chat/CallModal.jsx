import { useEffect, useMemo, useRef, useState } from 'react'
import Avatar from './Avatar'
import { useCall } from '../../context/CallContext'
import './CallModal.css'

const formatDuration = (seconds) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

// Icon Components for better UI/UX
const MicIcon = ({ muted }) => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    {muted ? (
      <>
        <path d="M9.172 15.172a4 4 0 015.656 0M9 10a3 3 0 116 0 3 3 0 01-6 0z" fill="none" stroke="currentColor" strokeWidth="2"/>
        <path d="M9.172 15.172l5.656-5.656M19 19H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </>
    ) : (
      <path d="M12 14a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
    )}
  </svg>
)

const CameraIcon = ({ disabled }) => (
  <svg className="w-6 h-6" fill={disabled ? "none" : "currentColor"} viewBox="0 0 24 24">
    {disabled ? (
      <path d="M9 3.75H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H15M9 3.75V1.5m0 2.25v2.25M3 3l20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    ) : (
      <path d="M9 3.75H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H15M9 3.75V1.5m0 2.25v2.25m4.5-5.5h3.75A2.25 2.25 0 0121 6v12a2.25 2.25 0 01-2.25 2.25H9" stroke="currentColor" strokeWidth="1.5"/>
    )}
  </svg>
)

const EndCallIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" opacity="0.5"/>
    <line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

// StreamTile component for displaying individual video streams
function StreamTile({ label, stream, callMode, muted = false, isMainVideo = false }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (!videoRef.current || !stream) return
    videoRef.current.srcObject = stream
  }, [stream])

  if (callMode !== 'video') {
    return (
      <div className={isMainVideo ? 'w-full h-full bg-black relative rounded-2xl overflow-hidden' : 'relative w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-600/40'}>
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-black">
          <div className="mb-4 w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 shadow-lg shadow-blue-500/50 animate-pulse">
            <span className="text-5xl">🎤</span>
          </div>
          <p className="text-white text-base font-semibold text-center px-4 opacity-90">{label}</p>
          <p className="text-cyan-400 text-xs font-medium text-center px-4 mt-2">Audio Only</p>
        </div>
      </div>
    )
  }

  return (
    <div className={isMainVideo ? 'w-full h-full bg-black relative rounded-2xl overflow-hidden' : 'relative w-full h-full rounded-xl overflow-hidden bg-black border border-slate-600/40 hover:border-slate-500/60 transition-colors duration-300'}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
      />
      {isMainVideo && (
        <div className="absolute bottom-4 left-4 text-white font-semibold px-4 py-2 rounded-full bg-black/70 backdrop-blur-lg text-sm z-10 max-w-[220px] truncate border border-white/10 shadow-lg">
          <span className="inline-block mr-2">👤</span>{label}
        </div>
      )}
      {!isMainVideo && (
        <div className="absolute bottom-3 left-3 text-white text-xs font-semibold px-3 py-1 rounded-full bg-black/80 backdrop-blur-lg z-10 max-w-[calc(100%-1rem)] truncate border border-white/5">
          {label}
        </div>
      )}
    </div>
  )
}

function CallModal({ activeUser }) {
  const [isCameraOn, setIsCameraOn] = useState(true)
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
  
  // For direct calls or single groups: show main video with local overlay
  const isSingleDirectCall = !isGroupCall && remoteParticipants.length <= 1
  const mainRemoteParticipant = remoteParticipants[0]

  return (
    <>
      {/* Advanced Incoming Call Popup */}
      {showIncoming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md animate-in zoom-in-50 fade-in duration-300">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-black rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden">
              
              {/* Gradient Background Decoration */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
              
              {/* Content */}
              <div className="relative px-6 py-8 flex flex-col items-center text-center">
                
                {/* Call Type Badge */}
                <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 rounded-full">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                  <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">
                    {incomingCall.type === 'GROUP' ? 'Group Call' : 'Video Call'}
                  </span>
                </div>
                
                {/* Caller Avatar/Icon */}
                <div className="mb-6 relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 via-cyan-400 to-teal-500 shadow-xl shadow-cyan-500/50 flex items-center justify-center animate-pulse">
                    <span className="text-5xl">👤</span>
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
                </div>
                
                {/* Caller Info */}
                <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
                <p className="text-sm text-slate-400 mb-6">{incomingSubtitle}</p>
                
                {/* Pulsing indicator */}
                <div className="mb-6 flex gap-1 justify-center">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-4 w-full">
                  {/* Accept Button */}
                  <button
                    type="button"
                    onClick={acceptIncomingCall}
                    className="flex-1 px-6 py-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold shadow-lg shadow-green-500/30 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 group"
                  >
                    <span className="text-xl group-hover:scale-125 transition-transform">✓</span>
                    <span>Accept</span>
                  </button>
                  
                  {/* Reject Button */}
                  <button
                    type="button"
                    onClick={rejectIncomingCall}
                    className="flex-1 px-6 py-3 rounded-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-bold shadow-lg shadow-red-500/30 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 group"
                  >
                    <span className="text-xl group-hover:scale-125 transition-transform">✕</span>
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Call Window */}
      {showCallWindow ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6 bg-gradient-to-b from-black/95 via-slate-900/90 to-black/95 backdrop-blur-sm md:p-4">
          <div className="relative w-full max-w-6xl flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-b from-slate-900 to-black border border-slate-800/50 h-[min(100%,calc(100vh-3rem))] max-h-[100dvh]">
            
            {/* Header with Call Status */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-black/40 via-slate-900/30 to-black/40 backdrop-blur-md flex-shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <h2 className="text-lg font-bold text-white truncate">{title}</h2>
                </div>
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {statusLabel}
                  </span>
                  {isGroupCall && (
                    <span className="text-slate-400">• {Math.max(participantCount, 1)} {participantCount === 1 ? 'participant' : 'participants'}</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={endCall}
                className="ml-4 p-2 rounded-lg text-white text-xl transition-all duration-200 hover:bg-red-500/30 hover:scale-110 active:scale-95 flex-shrink-0 group"
                title="Close"
              >
                <span className="block group-hover:rotate-90 transition-transform">✕</span>
              </button>
            </div>

            {/* Video Content Area */}
            <div className="flex-1 overflow-hidden relative bg-gradient-to-b from-black/50 to-black">
              {isSingleDirectCall && mainRemoteParticipant ? (
                // Direct Call: Full screen remote + small overlay local
                <div className="relative w-full h-full">
                  <StreamTile
                    label={mainRemoteParticipant.name || mainRemoteParticipant.email}
                    stream={mainRemoteParticipant.stream}
                    callMode={callMode}
                    isMainVideo={true}
                  />
                  
                  {/* Local Video Overlay */}
                  {localStream && (
                    <div className="absolute bottom-4 right-4 z-30 w-32 h-24 md:w-40 md:h-28 lg:w-48 lg:h-36 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="w-full h-full rounded-xl overflow-hidden border-2 border-cyan-400/50 shadow-lg shadow-cyan-400/30 hover:border-cyan-300/80 hover:shadow-xl transition-all duration-300 cursor-grab active:cursor-grabbing bg-black hover:scale-105">
                        <StreamTile
                          label="You"
                          stream={localStream}
                          callMode={callMode}
                          muted={true}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Group Call: Grid layout
                <div className="w-full h-full grid gap-3 p-3 md:gap-4 md:p-4 auto-fit-grid overflow-auto">
                  {remoteParticipants.map((participant, idx) => (
                    <div 
                      key={participant.email} 
                      className="relative rounded-xl overflow-hidden border border-slate-700/60 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg shadow-md min-h-[180px] group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl z-10" />
                      <StreamTile
                        label={participant.name || participant.email}
                        stream={participant.stream}
                        callMode={callMode}
                      />
                    </div>
                  ))}
                  
                  {/* Local stream in group calls */}
                  {localStream && (
                    <div className="relative rounded-xl overflow-hidden border-2 border-blue-500/50 hover:border-blue-400/80 transition-all duration-300 hover:shadow-lg shadow-md shadow-blue-500/30 min-h-[180px] ring-2 ring-blue-500/30 group">
                      <div className="absolute top-3 right-3 z-20 px-3 py-1 rounded-full bg-blue-500/80 text-white text-xs font-bold flex items-center gap-1">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        You
                      </div>
                      <StreamTile
                        label="Your Video"
                        stream={localStream}
                        callMode={callMode}
                        muted={true}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Advanced Control Buttons */}
            <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-slate-700/50 bg-gradient-to-r from-black/40 via-slate-900/20 to-black/40 backdrop-blur-md flex-shrink-0">
              
              {/* Mute Button */}
              <button
                type="button"
                onClick={toggleMute}
                className={`flex items-center justify-center p-4 rounded-full font-bold text-white transition-all duration-200 border-2 group ${
                  isMuted
                    ? 'bg-red-500/30 border-red-500/60 hover:bg-red-500/50 hover:border-red-400 shadow-lg shadow-red-500/30'
                    : 'bg-blue-500/30 border-blue-500/60 hover:bg-blue-500/50 hover:border-blue-400 shadow-lg shadow-blue-500/30'
                } active:scale-90 hover:scale-110`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                <span className="text-lg group-hover:scale-125 transition-transform">
                  {isMuted ? '🔇' : '🎤'}
                </span>
              </button>

              {/* Camera Button */}
              <button
                type="button"
                onClick={() => setIsCameraOn(!isCameraOn)}
                className={`flex items-center justify-center p-4 rounded-full font-bold text-white transition-all duration-200 border-2 group ${
                  isCameraOn
                    ? 'bg-emerald-500/30 border-emerald-500/60 hover:bg-emerald-500/50 hover:border-emerald-400 shadow-lg shadow-emerald-500/30'
                    : 'bg-orange-500/30 border-orange-500/60 hover:bg-orange-500/50 hover:border-orange-400 shadow-lg shadow-orange-500/30'
                } active:scale-90 hover:scale-110`}
                title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
              >
                <span className="text-lg group-hover:scale-125 transition-transform">
                  {isCameraOn ? '📷' : '🚫'}
                </span>
              </button>

              {/* End Call Button */}
              <button
                type="button"
                onClick={endCall}
                className="flex items-center justify-center p-4 rounded-full font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 border-2 border-red-600/80 hover:border-red-500 shadow-lg shadow-red-500/50 transition-all duration-200 active:scale-90 hover:scale-110 group"
                title="End call"
              >
                <span className="text-lg group-hover:scale-125 transition-transform">📞</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default CallModal
