import { useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">ChatConnect</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Hello, {user?.name || user?.email || 'User'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Routing is working. Your app is rendering normally.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Open Live Chat
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </section>
    </main>
  )
}

export default Dashboard
