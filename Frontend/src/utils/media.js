const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')

export const resolveMediaUrl = (value) => {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/')) return `${BACKEND_ORIGIN}${value}`
  return `${BACKEND_ORIGIN}/${value}`
}

export const getInitials = (name) => {
  const source = String(name || '').trim()
  if (!source) return '?'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}
