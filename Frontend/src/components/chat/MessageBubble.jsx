function MessageBubble({ message, isOwn, timeLabel }) {
  const statusIcon = (() => {
    if (!isOwn) return null
    if (message.status === 'READ') return <span className="font-bold text-sky-300">{'\u2713\u2713'}</span>
    if (message.status === 'DELIVERED') return <span className="font-bold text-slate-300">{'\u2713\u2713'}</span>
    return <span className="font-bold text-slate-300">{'\u2713'}</span>
  })()

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[78%] md:max-w-[72%] lg:max-w-[66%] ${
          isOwn ? 'bg-emerald-600 text-white' : 'border border-slate-200 bg-white text-slate-900'
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
        <div className={`mt-1.5 flex items-center gap-2 text-[11px] ${isOwn ? 'text-emerald-100' : 'text-slate-500'}`}>
          <time>{timeLabel}</time>
          {statusIcon}
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
