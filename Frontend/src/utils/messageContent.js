const META_PREFIX = '__CHATCONNECT_META__:'

export const buildStoredMessageContent = ({
  text = '',
  replyTo = null,
  forwarded = false,
  attachment = null,
  deletedForEveryone = false,
  editedAt = null,
} = {}) => {
  const trimmedText = String(text || '')
  const hasMetadata = Boolean(replyTo || forwarded || attachment || deletedForEveryone || editedAt)
  if (!hasMetadata) {
    return trimmedText
  }

  return `${META_PREFIX}${JSON.stringify({
    v: 1,
    text: trimmedText,
    replyTo,
    forwarded: Boolean(forwarded),
    attachment,
    deletedForEveryone: Boolean(deletedForEveryone),
    editedAt: editedAt || null,
  })}`
}

export const parseStoredMessageContent = (content) => {
  const fallback = {
    text: typeof content === 'string' ? content : '',
    replyTo: null,
    forwarded: false,
    attachment: null,
    deletedForEveryone: false,
    editedAt: null,
  }

  if (typeof content !== 'string' || !content.startsWith(META_PREFIX)) {
    return fallback
  }

  try {
    const parsed = JSON.parse(content.slice(META_PREFIX.length))
    return {
      text: typeof parsed?.text === 'string' ? parsed.text : '',
      replyTo: parsed?.replyTo || null,
      forwarded: Boolean(parsed?.forwarded),
      attachment: parsed?.attachment || null,
      deletedForEveryone: Boolean(parsed?.deletedForEveryone),
      editedAt: parsed?.editedAt || null,
    }
  } catch {
    return fallback
  }
}

