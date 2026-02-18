import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { setUnauthorizedHandler } from '../services/api'
import { clearAuthStorage, getToken, getUser, setToken, setUser } from '../utils/auth'
import { getTokenExpiryMs, isTokenExpired } from '../utils/jwt'
import AuthContext from './authContext'

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken())
  const [user, setUserState] = useState(() => getUser())

  const logout = useCallback((options = { notify: false }) => {
    clearAuthStorage()
    setTokenState(null)
    setUserState(null)
    if (options.notify) {
      toast.info('Session expired. Please login again.')
    }
  }, [])

  const login = useCallback((authPayload) => {
    const nextUser = {
      userId: authPayload.userId,
      name: authPayload.name,
      email: authPayload.email,
    }
    setToken(authPayload.token)
    setUser(nextUser)
    setTokenState(authPayload.token)
    setUserState(nextUser)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => logout({ notify: true }))
    return () => setUnauthorizedHandler(null)
  }, [logout])

  useEffect(() => {
    if (!token) return undefined
    if (isTokenExpired(token)) {
      const immediateLogoutTimer = setTimeout(() => logout({ notify: true }), 0)
      return () => clearTimeout(immediateLogoutTimer)
    }

    const expiryMs = getTokenExpiryMs(token)
    if (!expiryMs) return undefined

    const timeoutMs = expiryMs - Date.now()
    if (timeoutMs <= 0) {
      const immediateLogoutTimer = setTimeout(() => logout({ notify: true }), 0)
      return () => clearTimeout(immediateLogoutTimer)
    }

    const timeout = setTimeout(() => {
      logout({ notify: true })
    }, timeoutMs)

    return () => clearTimeout(timeout)
  }, [logout, token])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [login, logout, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
