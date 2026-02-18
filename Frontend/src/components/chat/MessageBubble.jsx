function MessageBubble({ message, isOwn, timeLabel }) {
  const statusLabel = isOwn
    ? message.status === 'READ'
      ? 'Read'
      : message.status === 'DELIVERED'
        ? 'Delivered'
        : 'Sent'
    : null

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[72%] ${
          isOwn ? 'bg-emerald-600 text-white' : 'bg-white text-slate-900'
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
        <div className={`mt-1.5 flex items-center gap-2 text-[11px] ${isOwn ? 'text-emerald-100' : 'text-slate-500'}`}>
          <time>{timeLabel}</time>
          {statusLabel ? <span>{statusLabel}</span> : null}
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
