const META_PREFIX = '__CHATCONNECT_META__:'

const safeJsonParse = (value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const looksLikeJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))

  if (!looksLikeJson) return null

  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

const readAttachmentSummary = (attachment) => {
  if (!attachment || typeof attachment !== 'object') return ''

  const kind = String(attachment.kind || attachment.type || 'Attachment').toUpperCase()
  const name = attachment.name || attachment.fileName || attachment.originalName || ''

  if (name) return `${kind}: ${name}`
  return kind
}

export const parseChatContent = (content) => {
  const rawText = (() => {
    if (content == null) return ''
    if (typeof content === 'string') return content
    if (typeof content === 'number' || typeof content === 'boolean') return String(content)

    try {
      return JSON.stringify(content)
    } catch {
      return String(content)
    }
  })()

  let meta = null
  let payload = content

  if (typeof content === 'string') {
    const trimmed = content.trim()

    if (trimmed.startsWith(META_PREFIX)) {
      const jsonPart = trimmed.slice(META_PREFIX.length).trim()
      const parsed = safeJsonParse(jsonPart)
      if (parsed && typeof parsed === 'object') {
        meta = parsed
        payload = parsed
      } else {
        payload = trimmed
      }
    } else {
      // Some servers store JSON directly in `content`.
      const parsed = safeJsonParse(trimmed)
      if (parsed !== null) {
        payload = parsed
      }
    }
  }

  let text = ''
  let attachment = null

  if (payload && typeof payload === 'object') {
    if (typeof payload.text === 'string') {
      text = payload.text
    }

    if (payload.attachment && typeof payload.attachment === 'object') {
      attachment = payload.attachment
    } else if (payload.kind && (payload.url || payload.path || payload.name)) {
      // Attachment stored at the top-level.
      attachment = payload
    }
  } else if (typeof payload === 'string') {
    text = payload
  } else {
    text = rawText
  }

  const trimmedText = String(text || '').trim()
  const summary = trimmedText || readAttachmentSummary(attachment) || rawText.trim()

  return {
    summary,
    text: trimmedText,
    attachment,
    meta,
    raw: rawText,
  }
}

export const getChatPreviewText = (content) => parseChatContent(content).summary
