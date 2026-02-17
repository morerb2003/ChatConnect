import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AuthLayout from '../components/AuthLayout'
import InputField from '../components/InputField'
import api from '../services/api'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const getStrength = (password) => {
  if (!password) return { label: 'Too weak', color: 'bg-slate-300', width: 'w-1/4' }

  let score = 0
  if (password.length >= 6) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/4' }
  if (score <= 3) return { label: 'Medium', color: 'bg-amber-500', width: 'w-2/4' }
  return { label: 'Strong', color: 'bg-emerald-500', width: 'w-full' }
}

const validate = (formData) => {
  const nextErrors = {}

  if (!formData.fullName.trim()) {
    nextErrors.fullName = 'Full Name is required.'
  }

  if (!formData.email.trim()) {
    nextErrors.email = 'Email is required.'
  } else if (!emailRegex.test(formData.email)) {
    nextErrors.email = 'Enter a valid email address.'
  }

  if (!formData.password) {
    nextErrors.password = 'Password is required.'
  } else if (formData.password.length < 6) {
    nextErrors.password = 'Password must be at least 6 characters.'
  }

  if (!formData.confirmPassword) {
    nextErrors.confirmPassword = 'Confirm Password is required.'
  } else if (formData.confirmPassword !== formData.password) {
    nextErrors.confirmPassword = 'Passwords do not match.'
  }

  return nextErrors
}

function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const errors = useMemo(() => validate(formData), [formData])
  const isFormValid = Object.keys(errors).length === 0
  const passwordStrength = getStrength(formData.password)

  useEffect(() => {
    if (!successMessage) return undefined

    const timer = setTimeout(() => {
      navigate('/login', { replace: true })
    }, 1200)

    return () => clearTimeout(timer)
  }, [successMessage, navigate])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleBlur = (event) => {
    setTouched((prev) => ({ ...prev, [event.target.name]: true }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setTouched({
      fullName: true,
      email: true,
      password: true,
      confirmPassword: true,
    })
    setApiError('')
    setSuccessMessage('')

    if (!isFormValid) return

    try {
      setLoading(true)
      await api.post('/auth/register', {
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
      })

      const message = 'Registration successful. Redirecting to login...'
      setSuccessMessage(message)
      toast.success('Account created successfully')
    } catch (error) {
      const status = error?.response?.status
      const serverMessage = error?.response?.data?.message
      const message =
        status === 409 || /exist/i.test(serverMessage || '')
          ? 'User already exists'
          : serverMessage || 'Registration failed. Please try again.'

      setApiError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join ChatConnecting and start real-time messaging."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Login
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <InputField
          id="register-name"
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Rohit Kumar"
          error={touched.fullName ? errors.fullName : ''}
        />

        <InputField
          id="register-email"
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
          id="register-password"
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Minimum 6 characters"
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

        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full ${passwordStrength.color} ${passwordStrength.width} transition-all duration-300`}
            />
          </div>
          <p className="text-xs text-slate-600">Password strength: {passwordStrength.label}</p>
        </div>

        <InputField
          id="register-confirm-password"
          label="Confirm Password"
          name="confirmPassword"
          type={showConfirmPassword ? 'text' : 'password'}
          value={formData.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Re-enter password"
          error={touched.confirmPassword ? errors.confirmPassword : ''}
          rightElement={
            <button
              type="button"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          }
        />

        {apiError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {apiError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            {successMessage}
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
              Creating account...
            </>
          ) : (
            'Register'
          )}
        </button>
      </form>
    </AuthLayout>
  )
}

export default Register
