import Avatar from './Avatar'
import { useCall } from '../../context/CallContext'
import ThemeToggle from '../ThemeToggle'

function ChatHeader({ activeUser, onBack }) {
  const { callState, startAudioCall, startVideoCall } = useCall()
  const inCall = callState !== 'idle'
  const disableCalls = inCall || !activeUser?.online

  return (
<<<<<<< Updated upstream
    <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 px-3 py-3 sm:flex-nowrap sm:items-center sm:px-4 sm:py-4">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
=======
    <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:py-4 dark:border-slate-800">
      <div className="flex min-w-0 items-center gap-3">
>>>>>>> Stashed changes
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
<<<<<<< Updated upstream
            className="mr-0.5 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 md:hidden"
=======
            className="mr-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 md:hidden dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
>>>>>>> Stashed changes
          >
            Back
          </button>
        ) : null}
        <Avatar name={activeUser.name} imageUrl={activeUser.profileImageUrl} size="lg" />
        <div className="min-w-0">
<<<<<<< Updated upstream
          <h2 className="truncate text-base font-semibold text-slate-900 sm:text-lg">{activeUser.name}</h2>
          <p className={`flex items-center gap-1.5 text-xs ${activeUser.online ? 'text-emerald-600' : 'text-slate-500'}`}>
=======
          <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">{activeUser.name}</h2>
          <p
            className={`flex items-center gap-1.5 text-xs ${
              activeUser.online ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
>>>>>>> Stashed changes
            <span className={`inline-block h-2 w-2 rounded-full ${activeUser.online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {activeUser.online ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

<<<<<<< Updated upstream
      <div className="flex shrink-0 items-center gap-2">
=======
      <div className="flex items-center gap-2">
        <ThemeToggle />
>>>>>>> Stashed changes
        <button
          type="button"
          onClick={startAudioCall}
          disabled={disableCalls}
          title={activeUser.online ? 'Start audio call' : 'User is offline'}
          aria-label="Start audio call"
          className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Audio
        </button>
        <button
          type="button"
          onClick={startVideoCall}
          disabled={disableCalls}
          title={activeUser.online ? 'Start video call' : 'User is offline'}
          aria-label="Start video call"
          className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Video
        </button>
      </div>
    </header>
  )
}

export default ChatHeader
