import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthLayout from '../components/AuthLayout'
import InputField from '../components/InputField'
import api from '../services/api'
import { setToken, setUser } from '../utils/auth'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validate = (formData) => {
  const nextErrors = {}

  if (!formData.email.trim()) {
    nextErrors.email = 'Email is required.'
  } else if (!emailRegex.test(formData.email)) {
    nextErrors.email = 'Enter a valid email address.'
  }

  if (!formData.password) {
    nextErrors.password = 'Password is required.'
  }

  return nextErrors
}

function Login() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: localStorage.getItem('rememberedEmail') || '',
    password: '',
    rememberMe: Boolean(localStorage.getItem('rememberedEmail')),
  })
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const errors = useMemo(() => validate(formData), [formData])
  const isFormValid = Object.keys(errors).length === 0

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleBlur = (event) => {
    setTouched((prev) => ({ ...prev, [event.target.name]: true }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setTouched({ email: true, password: true })
    setApiError('')

    if (!isFormValid) return

    try {
      setLoading(true)
      const response = await api.post('/auth/login', {
        email: formData.email.trim(),
        password: formData.password,
      })

      const user = {
        userId: response.data.userId,
        name: response.data.name,
        email: response.data.email,
      }

      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(user))
      setToken(response.data.token)
      setUser(user)

      if (formData.rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email.trim())
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      toast.success('Login successful')
      navigate('/chat', { replace: true })
    } catch (error) {
      const status = error?.response?.status
      const serverMessage = error?.response?.data?.message
      const message =
        status === 401 || /invalid/i.test(serverMessage || '')
          ? 'Invalid credentials'
          : serverMessage || 'Login failed. Please try again.'

      setApiError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to ChatConnecting and continue your conversations."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
            Register
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <InputField
          id="login-email"
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="you@example.com"
          error={touched.email ? errors.email : ''}
        />

        <InputField
          id="login-password"
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Enter your password"
          error={touched.password ? errors.password : ''}
          rightElement={
            <button
              type="button"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          }
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleChange}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Remember me
        </label>

        {apiError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {apiError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!isFormValid || loading}
          className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {loading ? (
            <>
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Logging in...
            </>
          ) : (
            'Login'
          )}
        </button>
      </form>
    </AuthLayout>
  )
}

export default Login
