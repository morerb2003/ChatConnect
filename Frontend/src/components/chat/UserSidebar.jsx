import { useState } from 'react'
import Avatar from './Avatar'
import ProfileUploadModal from './ProfileUploadModal'
import ThemeToggle from '../ThemeToggle'

function UserSidebar({
  className = '',
  users,
  activeUserId,
  onSelectUser,
  onCreateGroup,
  searchTerm,
  onSearchChange,
  connected,
  currentUserName,
  currentUserProfileImage,
  currentUserEmail,
  availableUsers = [],
  onProfileUpdated,
  onLogout,
}) {
  const [isProfileModalOpen, setProfileModalOpen] = useState(false)
  const [isCreateGroupOpen, setCreateGroupOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState([])

  const resetGroupForm = () => {
    setGroupName('')
    setSelectedMemberIds([])
    setCreateGroupOpen(false)
  }

  const submitCreateGroup = async () => {
    if (!groupName.trim() || selectedMemberIds.length === 0) return
    const created = await onCreateGroup?.({
      name: groupName.trim(),
      memberIds: selectedMemberIds,
    })
    if (created !== false) {
      resetGroupForm()
    }
  }

  return (
    <aside
      className={`relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-b border-slate-200 bg-white md:border-r md:border-b-0 dark:border-slate-800 dark:bg-slate-950/60 ${className}`}
    >
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">
            ChatConnect
          </p>
          <ThemeToggle />
        </div>
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
          className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900/60"
        >
          Logout
        </button>
        <button
          type="button"
          onClick={() => setCreateGroupOpen(true)}
          className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
        >
          New group
        </button>
      </div>

      <div className="p-4">
        <label htmlFor="user-search" className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
          Search chats
        </label>
        <input
          id="user-search"
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search people or groups..."
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:bg-slate-900"
        />
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-2 pb-3">
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
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{user.name}</span>
                    {user.roomType === 'GROUP' ? (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Group
                      </span>
                    ) : (
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          user.online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      />
                    )}
                  </div>
                  {user.roomType === 'GROUP' ? (
                    <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {user.memberCount || 0} members
                    </p>
                  ) : null}
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
      {isCreateGroupOpen ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-900/35 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-950/90">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Create group</h3>
            <input
              type="text"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Group name"
              className="mt-3 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <div className="mt-3 max-h-64 space-y-2 overflow-auto">
              {availableUsers.map((user) => (
                <label
                  key={user.userId}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-sm dark:border-slate-800 dark:text-slate-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(user.userId)}
                    onChange={(event) => {
                      setSelectedMemberIds((current) =>
                        event.target.checked
                          ? [...current, user.userId]
                          : current.filter((id) => id !== user.userId),
                      )
                    }}
                  />
                  <span>{user.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetGroupForm}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:text-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!groupName.trim() || selectedMemberIds.length === 0}
                onClick={submitCreateGroup}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  )
}

export default UserSidebar
