const decodeBase64Url = (input) => {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  return atob(padded)
}

export const parseJwtPayload = (token) => {
  try {
    const payload = token?.split('.')[1]
    if (!payload) return null
    return JSON.parse(decodeBase64Url(payload))
  } catch {
    return null
  }
}

export const getTokenExpiryMs = (token) => {
  const payload = parseJwtPayload(token)
  if (!payload?.exp) return null
  return payload.exp * 1000
}

export const isTokenExpired = (token) => {
  const expiryMs = getTokenExpiryMs(token)
  if (!expiryMs) return false
  return Date.now() >= expiryMs
}
