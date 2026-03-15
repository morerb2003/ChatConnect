import { useState } from 'react'
import Avatar from './Avatar'
import ProfileUploadModal from './ProfileUploadModal'
import ThemeToggle from '../ThemeToggle'

function UserSidebar({
  className = '',
  users,
  activeUserId,
  onSelectUser,
  searchTerm,
  onSearchChange,
  connected,
  currentUserName,
  currentUserProfileImage,
  currentUserEmail,
  onProfileUpdated,
  onLogout,
}) {
  const [isProfileModalOpen, setProfileModalOpen] = useState(false)

  return (
<<<<<<< Updated upstream
    <aside className={`flex h-full min-h-0 flex-col border-b border-slate-200 bg-white md:border-r md:border-b-0 ${className}`}>
      <div className="border-b border-slate-200 px-3 py-3 sm:px-4 sm:py-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">ChatConnect</p>
=======
    <aside
      className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-b border-slate-200 bg-white md:border-r md:border-b-0 dark:border-slate-800 dark:bg-slate-950/60 ${className}`}
    >
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">
            ChatConnect
          </p>
          <ThemeToggle />
        </div>
>>>>>>> Stashed changes
        <div className="mt-2 flex items-center gap-3">
          <Avatar
            name={currentUserName}
            imageUrl={currentUserProfileImage}
            size="lg"
            onClick={() => setProfileModalOpen(true)}
            className="ring-2 ring-emerald-100 dark:ring-emerald-900/40"
          />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">
              Welcome, {currentUserName}
            </h1>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{currentUserEmail}</p>
          </div>
        </div>
        <p className={`mt-1 text-xs ${connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>
          {connected ? 'Live connection active' : 'Reconnecting...'}
        </p>
        <button
          type="button"
          onClick={onLogout}
<<<<<<< Updated upstream
          className="mt-2.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:mt-3"
=======
          className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900/60"
>>>>>>> Stashed changes
        >
          Logout
        </button>
      </div>

<<<<<<< Updated upstream
      <div className="px-3 py-3 sm:p-4">
        <label htmlFor="user-search" className="mb-1.5 block text-xs font-medium text-slate-600">
=======
      <div className="p-4">
        <label htmlFor="user-search" className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
>>>>>>> Stashed changes
          Search people
        </label>
        <input
          id="user-search"
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search users..."
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:bg-slate-900"
        />
      </div>

<<<<<<< Updated upstream
      <div className="flex-1 overflow-y-auto px-2 pb-3 sm:px-2.5">
=======
      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-2 pb-3">
>>>>>>> Stashed changes
        {users.length === 0 ? (
          <div className="px-3 py-5 text-center text-sm text-slate-500 dark:text-slate-400">No users found.</div>
        ) : null}
        {users.map((user) => (
          <button
            key={user.userId}
            type="button"
            onClick={() => onSelectUser(user)}
            className={`mb-1.5 w-full rounded-xl border px-2.5 py-2.5 text-left transition sm:px-3 ${
              activeUserId === user.userId
                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40'
                : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-900/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <Avatar name={user.name} imageUrl={user.profileImageUrl} size="md" />
                <div className="min-w-0">
<<<<<<< Updated upstream
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900">{user.name}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${user.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
=======
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{user.name}</span>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        user.online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />
>>>>>>> Stashed changes
                  </div>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {user.lastMessagePreview || 'Start a new conversation'}
                  </p>
                </div>
              </div>
              <div className="grid justify-items-end gap-1">
                {user.lastMessageAt ? (
                  <time className="text-[11px] text-slate-500 dark:text-slate-400">
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
      <ProfileUploadModal
        open={isProfileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        onUploaded={onProfileUpdated}
      />
    </aside>
  )
}

export default UserSidebar
