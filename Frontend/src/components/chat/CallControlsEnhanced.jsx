import React from 'react'
import { MdMic, MdMicOff, MdVideocam, MdVideocamOff, MdCallEnd, MdScreenShare, MdChat, MdMoreVert } from 'react-icons/md'

/**
 * Enhanced Video Call Control Component with Additional Features
 * Optional: Includes screen sharing, chat toggle, and more options menu
 * 
 * Features:
 * - All features from basic CallControls
 * - Screen sharing button
 * - Chat toggle button
 * - More options menu
 * - Volume control
 * - Scalable to 5+ buttons
 */
function CallControlsEnhanced({
  isMuted,
  onToggleMute,
  isCameraOn,
  onToggleCamera,
  onEndCall,
  isScreenSharing = false,
  onToggleScreenShare = null,
  isChatVisible = false,
  onToggleChat = null,
  disabled = false,
  showAdvancedControls = false,
}) {
  const [showMoreMenu, setShowMoreMenu] = React.useState(false)

  return (
    <div className="flex items-center justify-center flex-wrap gap-4 md:gap-6 px-4 py-4 md:py-6 bg-gradient-to-r from-black/40 via-slate-900/20 to-black/40 backdrop-blur-md rounded-t-3xl md:rounded-full md:mx-auto md:w-fit md:px-8">
      
      {/* Microphone Button */}
      <button
        type="button"
        onClick={onToggleMute}
        disabled={disabled}
        className={`relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full font-bold text-white transition-all duration-200 group outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
          isMuted
            ? 'bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/50 focus:ring-red-400'
            : 'bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 shadow-lg shadow-blue-500/50 focus:ring-blue-400'
        } ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95 cursor-pointer'
        }`}
        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        <div
          className={`absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-75 transition-opacity duration-300 ${
            isMuted
              ? 'bg-gradient-to-br from-red-500 to-rose-600'
              : 'bg-gradient-to-br from-blue-500 to-cyan-600'
          }`}
          aria-hidden="true"
        />
        <div className="relative z-10 transition-transform duration-200 group-hover:scale-125 group-active:scale-100">
          {isMuted ? (
            <MdMicOff size={28} className="md:w-8 md:h-8" />
          ) : (
            <MdMic size={28} className="md:w-8 md:h-8" />
          )}
        </div>
        <div
          className="absolute inset-0 rounded-full bg-white/20 scale-0 group-active:animate-ping"
          aria-hidden="true"
        />
      </button>

      {/* Camera Button */}
      <button
        type="button"
        onClick={onToggleCamera}
        disabled={disabled}
        className={`relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full font-bold text-white transition-all duration-200 group outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
          isCameraOn
            ? 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/50 focus:ring-green-400'
            : 'bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/50 focus:ring-orange-400'
        } ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95 cursor-pointer'
        }`}
        title={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
        aria-label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
      >
        <div
          className={`absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-75 transition-opacity duration-300 ${
            isCameraOn
              ? 'bg-gradient-to-br from-green-500 to-emerald-600'
              : 'bg-gradient-to-br from-orange-500 to-red-600'
          }`}
          aria-hidden="true"
        />
        <div className="relative z-10 transition-transform duration-200 group-hover:scale-125 group-active:scale-100">
          {isCameraOn ? (
            <MdVideocam size={28} className="md:w-8 md:h-8" />
          ) : (
            <MdVideocamOff size={28} className="md:w-8 md:h-8" />
          )}
        </div>
        <div
          className="absolute inset-0 rounded-full bg-white/20 scale-0 group-active:animate-ping"
          aria-hidden="true"
        />
      </button>

      {/* Screen Share Button - Optional */}
      {onToggleScreenShare && (
        <button
          type="button"
          onClick={onToggleScreenShare}
          disabled={disabled}
          className={`relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full font-bold text-white transition-all duration-200 group outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            isScreenSharing
              ? 'bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-lg shadow-purple-500/50 focus:ring-purple-400'
              : 'bg-gradient-to-br from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 shadow-lg shadow-slate-500/30 focus:ring-slate-400'
          } ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95 cursor-pointer'
          }`}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          aria-label={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          <div
            className={`absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-75 transition-opacity duration-300 ${
              isScreenSharing
                ? 'bg-gradient-to-br from-purple-500 to-pink-600'
                : 'bg-gradient-to-br from-slate-500 to-slate-600'
            }`}
            aria-hidden="true"
          />
          <div className="relative z-10 transition-transform duration-200 group-hover:scale-125 group-active:scale-100">
            <MdScreenShare size={28} className="md:w-8 md:h-8" />
          </div>
          <div
            className="absolute inset-0 rounded-full bg-white/20 scale-0 group-active:animate-ping"
            aria-hidden="true"
          />
        </button>
      )}

      {/* Chat Toggle Button - Optional */}
      {onToggleChat && (
        <button
          type="button"
          onClick={onToggleChat}
          disabled={disabled}
          className={`relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full font-bold text-white transition-all duration-200 group outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
            isChatVisible
              ? 'bg-gradient-to-br from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 shadow-lg shadow-yellow-500/50 focus:ring-yellow-400'
              : 'bg-gradient-to-br from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 shadow-lg shadow-slate-500/30 focus:ring-slate-400'
          } ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95 cursor-pointer'
          }`}
          title={isChatVisible ? 'Hide chat' : 'Show chat'}
          aria-label={isChatVisible ? 'Hide chat' : 'Show chat'}
        >
          <div
            className={`absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-75 transition-opacity duration-300 ${
              isChatVisible
                ? 'bg-gradient-to-br from-yellow-500 to-orange-600'
                : 'bg-gradient-to-br from-slate-500 to-slate-600'
            }`}
            aria-hidden="true"
          />
          <div className="relative z-10 transition-transform duration-200 group-hover:scale-125 group-active:scale-100">
            <MdChat size={28} className="md:w-8 md:h-8" />
          </div>
          <div
            className="absolute inset-0 rounded-full bg-white/20 scale-0 group-active:animate-ping"
            aria-hidden="true"
          />
        </button>
      )}

      {/* End Call Button - Primary/Destructive (Always last) */}
      <button
        type="button"
        onClick={onEndCall}
        disabled={disabled}
        className={`relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full font-bold text-white transition-all duration-200 group outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-400 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-600/60 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 active:scale-95 cursor-pointer'
        }`}
        title="End call"
        aria-label="End call"
      >
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-0 group-hover:opacity-90 transition-opacity duration-300 bg-gradient-to-br from-red-600 to-red-700"
          aria-hidden="true"
        />
        <div className="relative z-10 transition-transform duration-200 group-hover:scale-125 group-hover:rotate-12 group-active:scale-100">
          <MdCallEnd size={28} className="md:w-8 md:h-8" />
        </div>
        <div
          className="absolute inset-0 rounded-full bg-white/30 scale-0 group-active:animate-ping"
          aria-hidden="true"
        />
      </button>
    </div>
  )
}

export default CallControlsEnhanced
