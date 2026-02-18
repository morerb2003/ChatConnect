function UserSidebar({
  users,
  activeUserId,
  onSelectUser,
  searchTerm,
  onSearchChange,
  connected,
  currentUserName,
  onLogout,
}) {
  return (
    <aside className="flex h-full flex-col border-b border-slate-200 bg-white md:border-r md:border-b-0">
      <div className="border-b border-slate-200 px-4 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">ChatConnect</p>
        <h1 className="mt-1 text-lg font-semibold text-slate-900">Welcome, {currentUserName}</h1>
        <p className={`mt-1 text-xs ${connected ? 'text-emerald-600' : 'text-amber-600'}`}>
          {connected ? 'Live connection active' : 'Reconnecting...'}
        </p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Logout
        </button>
      </div>

      <div className="p-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search users..."
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {users.map((user) => (
          <button
            key={user.userId}
            type="button"
            onClick={() => onSelectUser(user)}
            className={`mb-1.5 w-full rounded-xl border px-3 py-2.5 text-left transition ${
              activeUserId === user.userId
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">{user.name}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${user.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
                <p className="truncate text-xs text-slate-500">
                  {user.lastMessagePreview || 'Start a new conversation'}
                </p>
              </div>
              <div className="grid justify-items-end gap-1">
                {user.lastMessageAt ? (
                  <time className="text-[11px] text-slate-500">
                    {new Date(user.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                ) : null}
                {user.unreadCount > 0 ? (
                  <span className="inline-grid min-h-5 min-w-5 place-items-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
                    {user.unreadCount}
                  </span>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}

export default UserSidebar
