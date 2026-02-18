import { Link } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

function Chat() {
  const { user } = useAuth()

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">ChatConnect</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Live Chat</h1>
        <p className="mt-2 text-sm text-slate-600">
          Chat page loaded successfully for {user?.name || user?.email || 'User'}.
        </p>
        <div className="mt-5">
          <Link
            to="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>
    </main>
  )
}

export default Chat
