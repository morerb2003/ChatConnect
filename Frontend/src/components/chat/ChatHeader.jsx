import Avatar from './Avatar'
import { useCall } from '../../context/CallContext'

function ChatHeader({ activeUser, onBack }) {
  const { callState, startAudioCall, startVideoCall } = useCall()
  const inCall = callState !== 'idle'
  const disableCalls = inCall || !activeUser?.online

  return (
    <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 px-3 py-3 sm:flex-nowrap sm:items-center sm:px-4 sm:py-4">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mr-0.5 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 md:hidden"
          >
            Back
          </button>
        ) : null}
        <Avatar name={activeUser.name} imageUrl={activeUser.profileImageUrl} size="lg" />
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{activeUser.name}</h2>
          <p className={`flex items-center gap-1.5 text-xs ${activeUser.online ? 'text-emerald-600' : 'text-slate-500'}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${activeUser.online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {activeUser.online ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={startAudioCall}
          disabled={disableCalls}
          title={activeUser.online ? 'Start audio call' : 'User is offline'}
          aria-label="Start audio call"
          className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
        >
          Audio
        </button>
        <button
          type="button"
          onClick={startVideoCall}
          disabled={disableCalls}
          title={activeUser.online ? 'Start video call' : 'User is offline'}
          aria-label="Start video call"
          className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
        >
          Video
        </button>
      </div>
    </header>
  )
}

export default ChatHeader
