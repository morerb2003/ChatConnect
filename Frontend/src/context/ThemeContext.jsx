import { useCallback, useEffect, useMemo, useState } from 'react'
import ThemeContext from './themeContext'

const STORAGE_KEY = 'chatconnect_theme'

const getPreferredTheme = () => {
  if (typeof window === 'undefined') return 'light'
  if (!window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage?.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return getPreferredTheme()
}

const applyTheme = (theme) => {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  // Helps native controls (scrollbars, inputs) match the current theme.
  root.style.colorScheme = theme === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => getInitialTheme())

  useEffect(() => {
    applyTheme(theme)
    window.localStorage?.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

