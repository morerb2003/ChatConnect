import { useRef } from 'react'

const QUICK_REACTIONS = ['\u{1F44D}', '\u2764\uFE0F', '\u{1F602}']

function MessageBubble({
  message,
  isOwn,
  timeLabel,
  searchQuery = '',
  currentUserId,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onForward,
  onReact,
  onRemoveReaction,
  onJumpToMessage,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
}) {
  const longPressTimerRef = useRef(null)
  const reactionBuckets = Array.isArray(message.reactions)
    ? Object.values(
        message.reactions.reduce((accumulator, reaction) => {
          if (!reaction?.emoji) return accumulator
          const bucket = accumulator[reaction.emoji] || {
            emoji: reaction.emoji,
            count: 0,
            reactedByCurrentUser: false,
          }
          bucket.count += 1
          if (reaction.userId === currentUserId) {
            bucket.reactedByCurrentUser = true
          }
          accumulator[reaction.emoji] = bucket
          return accumulator
        }, {}),
      )
    : []

  const statusIcon = (() => {
    if (!isOwn) return null
    if (message.status === 'READ') return <span className="font-bold text-sky-300">{'\u2713\u2713'}</span>
    if (message.status === 'DELIVERED') return <span className="font-bold text-slate-300">{'\u2713\u2713'}</span>
    return <span className="font-bold text-slate-300">{'\u2713'}</span>
  })()

  const query = searchQuery.trim().toLowerCase()
  const text = message.displayContent || ''
  const animateClass = message.animateIn ? 'motion-reduce:animate-none animate-[messageIn_.22s_ease-out]' : ''

  const renderHighlighted = (value) => {
    if (!query || !value) return value
    const lower = value.toLowerCase()
    const index = lower.indexOf(query)
    if (index < 0) return value
    const before = value.slice(0, index)
    const match = value.slice(index, index + query.length)
    const after = value.slice(index + query.length)
    return (
      <>
        {before}
        <mark className="rounded bg-amber-200/80 px-0.5 text-slate-900 dark:bg-amber-400/30 dark:text-amber-100">
          {match}
        </mark>
        {after}
      </>
    )
  }

  const startLongPress = () => {
    if (selectionMode) return
    longPressTimerRef.current = setTimeout(() => {
      onToggleSelect?.(message)
    }, 450)
  }

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const toggleSelect = () => {
    if (selectionMode) {
      onToggleSelect?.(message)
    }
  }

  const stop = (event) => {
    event.stopPropagation()
  }

  return (
    <div
      className={`group flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      onClick={toggleSelect}
      onMouseDown={startLongPress}
      onMouseUp={clearLongPress}
      onMouseLeave={clearLongPress}
      onTouchStart={startLongPress}
      onTouchEnd={clearLongPress}
    >
      <div
        className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 shadow-sm transition sm:max-w-[78%] md:max-w-[72%] lg:max-w-[66%] ${animateClass} ${
          isOwn
            ? 'bg-emerald-600 text-white'
            : 'border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100'
        } ${message.highlighted ? 'ring-2 ring-amber-300' : ''} ${
          isSelected ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-950' : ''
        }`}
      >
        {message.forwarded ? <p className="mb-1 text-[11px] font-semibold opacity-80">Forwarded</p> : null}
        {message.replyTo ? (
          <button
            type="button"
            onClick={(event) => {
              stop(event)
              if (!selectionMode) {
                onJumpToMessage?.(message.replyTo?.id)
              }
            }}
            className={`mb-1.5 block w-full rounded-lg border px-2 py-1 text-left text-xs ${
              isOwn
                ? 'border-emerald-300/50 bg-emerald-500/40'
                : 'border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60'
            }`}
          >
            <p className="font-semibold">{message.replyTo.senderName || 'Reply'}</p>
            <p className="truncate opacity-90">{message.replyTo.text || ''}</p>
          </button>
        ) : null}

        {message.deletedForEveryone ? (
          <p className="text-sm italic opacity-80">This message was deleted.</p>
        ) : (
          <>
            {text ? <p className="whitespace-pre-wrap break-words text-sm">{renderHighlighted(text)}</p> : null}
            {message.attachment ? (
              <div className="mt-2 rounded-xl border border-white/40 bg-white/30 p-2 text-xs text-inherit dark:border-white/15 dark:bg-white/10">
                {message.attachment.kind === 'IMAGE' ? (
                  <a href={message.attachment.url} target="_blank" rel="noreferrer" className="block" onClick={stop}>
                    <img
                      src={message.attachment.url}
                      alt={message.attachment.name || 'attachment'}
                      className="max-h-60 w-full rounded-lg object-cover"
                    />
                  </a>
                ) : null}
                {message.attachment.kind === 'VIDEO' ? (
                  <video controls className="max-h-64 w-full rounded-lg">
                    <source src={message.attachment.url} type={message.attachment.contentType || 'video/mp4'} />
                  </video>
                ) : null}
                {message.attachment.kind !== 'IMAGE' && message.attachment.kind !== 'VIDEO' ? (
                  <a
                    href={message.attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={stop}
                    className="inline-flex items-center rounded-lg border border-current/25 px-2 py-1 font-medium underline-offset-2 hover:underline"
                  >
                    {message.attachment.kind === 'PDF' ? 'Open PDF' : 'Open file'}: {message.attachment.name}
                  </a>
                ) : null}
              </div>
            ) : null}
          </>
        )}

        <div className={`mt-1.5 flex items-center gap-2 text-[11px] ${isOwn ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
          <time>{timeLabel}</time>
          {message.editedAt && !message.deletedForEveryone ? <span>(edited)</span> : null}
          {Array.isArray(message.seenBy) && message.seenBy.length > 0 && isOwn && message.roomType === 'GROUP' ? (
            <span>Seen by {message.seenBy.length}</span>
          ) : null}
          {statusIcon}
        </div>

        {reactionBuckets.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {reactionBuckets.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                onClick={(event) => {
                  stop(event)
                  if (reaction.reactedByCurrentUser) {
                    onRemoveReaction?.(message, reaction.emoji)
                    return
                  }
                  onReact?.(message, reaction.emoji)
                }}
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  reaction.reactedByCurrentUser
                    ? 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100'
                    : 'border-current/20 bg-black/5 dark:bg-white/10'
                }`}
              >
                {reaction.emoji} {reaction.count}
              </button>
            ))}
          </div>
        ) : null}

        {!selectionMode ? (
          <div className={`mt-1.5 flex flex-wrap gap-1 opacity-0 transition group-hover:opacity-100 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {QUICK_REACTIONS.map((emoji) => {
              const alreadyReacted = Array.isArray(message.reactions)
                ? message.reactions.some((reaction) => reaction.userId === currentUserId && reaction.emoji === emoji)
                : false
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={(event) => {
                    stop(event)
                    if (alreadyReacted) {
                      onRemoveReaction?.(message, emoji)
                      return
                    }
                    onReact?.(message, emoji)
                  }}
                  className="rounded-md border border-current/25 px-2 py-0.5 text-[11px]"
                >
                  {emoji}
                </button>
              )
            })}
            <button
              type="button"
              onClick={(event) => {
                stop(event)
                onReply?.(message)
              }}
              className="rounded-md border border-current/25 px-2 py-0.5 text-[11px]"
            >
              Reply
            </button>
            <button
              type="button"
              onClick={(event) => {
                stop(event)
                onForward?.(message)
              }}
              className="rounded-md border border-current/25 px-2 py-0.5 text-[11px]"
            >
              Forward
            </button>
            {isOwn && !message.deletedForEveryone ? (
              <button
                type="button"
                onClick={(event) => {
                  stop(event)
                  onEdit?.(message)
                }}
                className="rounded-md border border-current/25 px-2 py-0.5 text-[11px]"
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              onClick={(event) => {
                stop(event)
                onDeleteForMe?.(message)
              }}
              className="rounded-md border border-current/25 px-2 py-0.5 text-[11px]"
            >
              Delete for me
            </button>
            {isOwn && !message.deletedForEveryone ? (
              <button
                type="button"
                onClick={(event) => {
                  stop(event)
                  onDeleteForEveryone?.(message)
                }}
                className="rounded-md border border-current/25 px-2 py-0.5 text-[11px]"
              >
                Delete for everyone
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default MessageBubble
