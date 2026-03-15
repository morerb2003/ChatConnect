import { useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import ThemeToggle from '../components/ThemeToggle'

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <main className="grid min-h-screen supports-[height:100dvh]:min-h-[100dvh] place-items-center px-4">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">ChatConnect</p>
          <ThemeToggle />
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50">
          Hello, {user?.name || user?.email || 'User'}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
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
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Logout
          </button>
        </div>
      </section>
    </main>
  )
}

export default Dashboard
