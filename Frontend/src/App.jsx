import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import ChatInterface from './components/ChatInterface/ChatInterface'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import { getToken, getUser, removeToken } from './utils/auth'

function PublicRoute({ children }) {
  const token = getToken()
  if (token) {
    return <Navigate to="/chat" replace />
  }
  return children
}

function ChatDashboard() {
  const navigate = useNavigate()
  const user = getUser()

  const handleLogout = () => {
    removeToken()
    navigate('/login', { replace: true })
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">ChatConnecting</p>
          <h2 className="text-base font-bold text-slate-900">
            Hello, {user?.fullName || user?.name || user?.email || 'User'}
          </h2>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Logout.
        </button>
      </div>

      <ChatInterface />
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <ChatDashboard />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
