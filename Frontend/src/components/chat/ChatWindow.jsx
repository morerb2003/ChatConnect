import MessageBubble from './MessageBubble'
import ChatHeader from './ChatHeader'

function ChatWindow({
  className = '',
  activeUser,
  messages,
  draft,
  isConnected,
  onDraftChange,
  onSend,
  onLoadOlder,
  hasMoreHistory,
  typing,
  messageEndRef,
  onBack,
}) {
  if (!activeUser) {
    return (
      <section className="grid h-full place-items-center bg-gradient-to-b from-slate-50 to-emerald-50 p-6">
        <div className="max-w-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900">Choose a user to start chatting</h2>
          <p className="mt-2 text-sm text-slate-600">
            Select someone from the sidebar to create a room instantly and load message history.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className={`grid h-full grid-rows-[auto_1fr_auto] bg-gradient-to-b from-white to-emerald-50/50 ${className}`}>
      <ChatHeader activeUser={activeUser} onBack={onBack} />

      <div className="overflow-y-auto px-3 py-3 sm:px-4">
        {hasMoreHistory ? (
          <button
            type="button"
            onClick={onLoadOlder}
            className="mx-auto mb-3 block rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Load older messages
          </button>
        ) : null}

        <div className="space-y-2.5">
          {messages.length === 0 ? (
            <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 text-center">
              <p className="text-sm text-slate-500">No messages yet. Send a message to start the conversation.</p>
            </div>
          ) : null}
          {messages.map((message) => (
            <MessageBubble
              key={`${message.id ?? message.clientMessageId}-${message.timestamp}`}
              message={message}
              isOwn={message.isOwn}
              timeLabel={new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            />
          ))}
          {typing ? <p className="text-xs text-slate-500">{activeUser.name} is typing...</p> : null}
          <div ref={messageEndRef} />
        </div>
      </div>

      <form
        onSubmit={onSend}
        className="flex items-end gap-2 border-t border-slate-200 bg-white px-3 py-3 sm:px-4"
      >
        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder={`Message ${activeUser.name}`}
          rows={1}
          aria-label={`Message ${activeUser.name}`}
          className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={!draft.trim() || !isConnected}
          className="h-11 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          Send
        </button>
      </form>
    </section>
  )
}

export default ChatWindow
