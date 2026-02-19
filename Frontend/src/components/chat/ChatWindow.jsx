import MessageBubble from './MessageBubble'

function ChatWindow({
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
    <section className="grid h-full grid-rows-[auto_1fr_auto] bg-gradient-to-b from-white to-emerald-50/50">
      <header className="border-b border-slate-200 px-4 py-4">
        <h2 className="text-lg font-semibold text-slate-900">{activeUser.name}</h2>
        <p className="text-xs text-slate-500">{activeUser.online ? 'Online' : 'Offline'}</p>
      </header>

      <div className="overflow-y-auto px-4 py-3">
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
        className="flex items-center gap-2 border-t border-slate-200 bg-white px-4 py-3"
      >
        <input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder={`Message ${activeUser.name}`}
          className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={!draft.trim() || !isConnected}
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          Send
        </button>
      </form>
    </section>
  )
}

export default ChatWindow
