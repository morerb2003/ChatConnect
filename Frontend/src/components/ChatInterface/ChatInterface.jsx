const rooms = [
  { id: 1, name: 'Product Team', preview: 'Wireframe v3 is in Figma', time: '09:41', unread: 2 },
  { id: 2, name: 'Rohit More', preview: 'Can we sync after lunch?', time: '08:53', unread: 0 },
  { id: 3, name: 'Dev Support', preview: 'API latency improved by 32%', time: 'Yesterday', unread: 5 },
  { id: 4, name: 'Design Review', preview: 'Color tokens are updated', time: 'Yesterday', unread: 0 },
]

const messages = [
  { id: 1, author: 'Riya', text: 'Morning! Did you check the onboarding flow copy?', own: false, time: '09:52' },
  { id: 2, author: 'You', text: 'Yes, I left comments in the task. We can finalize now.', own: true, time: '09:55' },
  { id: 3, author: 'Riya', text: 'Perfect. Also adding two micro-interaction ideas for the empty states.', own: false, time: '09:56' },
  { id: 4, author: 'You', text: "Nice. Let us review at 11:00 and ship in today's build.", own: true, time: '09:58' },
]

function ChatInterface() {
  return (
    <section className="grid min-h-[calc(100vh-3rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white/70 shadow-[0_12px_30px_rgba(17,57,49,0.12)] backdrop-blur md:grid-cols-[minmax(250px,320px)_1fr]">
      <aside className="border-b border-slate-200 bg-gradient-to-b from-emerald-50 to-white p-5 md:border-r md:border-b-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">Chat Connect</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Messages</h1>
        </div>

        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-slate-500">Search</span>
          <input
            type="text"
            placeholder="People, channels, files..."
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div className="mt-4 grid gap-2 md:max-h-[220px] md:overflow-y-auto">
          {rooms.map((room, index) => (
            <button
              className={`flex w-full justify-between rounded-xl border p-3 text-left transition ${
                index === 0
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:-translate-y-px hover:shadow-md'
              }`}
              key={room.id}
              type="button"
            >
              <div>
                <p className="text-sm font-bold text-slate-900">{room.name}</p>
                <span className="mt-0.5 block text-xs text-slate-500">{room.preview}</span>
              </div>
              <div className="grid justify-items-end gap-1">
                <small className="text-xs text-slate-500">{room.time}</small>
                {room.unread > 0 && (
                  <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
                    {room.unread}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <article className="grid grid-rows-[auto_1fr_auto] bg-gradient-to-b from-white to-emerald-50/40">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Rohit More</h2>
            <p className="mt-0.5 text-sm text-slate-500">Online now</p>
          </div>
          <button
            type="button"
            className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-200"
          >
            Start Call
          </button>
        </header>

        <div className="grid gap-3 overflow-y-auto px-5 py-4">
          {messages.map((message) => (
            <div className={`max-w-[90%] md:max-w-[70%] ${message.own ? 'ml-auto' : ''}`} key={message.id}>
              <p className="mb-1 text-xs text-slate-500">{message.author}</p>
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  message.own ? 'bg-emerald-100' : 'bg-blue-50'
                }`}
              >
                {message.text}
              </div>
              <time className="mt-1 block text-[11px] text-slate-500">{message.time}</time>
            </div>
          ))}
        </div>

        <form className="flex gap-2 border-t border-slate-200 px-5 py-4" action="#">
          <input
            type="text"
            placeholder="Type your message..."
            aria-label="Type your message"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Send
          </button>
        </form>
      </article>
    </section>
  )
}

export default ChatInterface
