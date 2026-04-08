import { useState } from 'react'
import Avatar from './Avatar'
import { useCall } from '../../context/CallContext'
import ThemeToggle from '../ThemeToggle'

function ChatHeader({
  activeUser,
  onBack,
  onAddGroupMembers,
  onRemoveGroupMember,
  availableGroupUsers = [],
}) {
  const { callState, startAudioCall, startVideoCall } = useCall()
  const [isManageOpen, setManageOpen] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState([])
  const inCall = callState !== 'idle'
  const isGroup = activeUser?.roomType === 'GROUP'
  const disableCalls = inCall || !activeUser?.online || isGroup
  const memberNames = Array.isArray(activeUser?.memberNames) ? activeUser.memberNames : []

  return (
    <header className="relative flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 px-3 py-3 sm:flex-nowrap sm:items-center sm:px-4 sm:py-4 dark:border-slate-800">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mr-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 md:hidden dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Back
          </button>
        ) : null}
        <Avatar name={activeUser.name} imageUrl={activeUser.profileImageUrl} size="lg" />
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-900 sm:text-lg dark:text-slate-50">{activeUser.name}</h2>
          {isGroup ? (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeUser.memberCount || memberNames.length || 0} members
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {memberNames.join(', ')}
              </p>
            </>
          ) : (
            <p
              className={`flex items-center gap-1.5 text-xs ${
                activeUser.online ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  activeUser.online ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
                }`}
              />
              {activeUser.online ? 'Online' : 'Offline'}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <ThemeToggle />
        {isGroup && activeUser?.canManageMembers ? (
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:text-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Manage
          </button>
        ) : null}
        <button
          type="button"
          onClick={startAudioCall}
          disabled={disableCalls}
          title={isGroup ? 'Calls are available only in direct chats' : activeUser.online ? 'Start audio call' : 'User is offline'}
          aria-label="Start audio call"
          className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Audio
        </button>
        <button
          type="button"
          onClick={startVideoCall}
          disabled={disableCalls}
          title={isGroup ? 'Calls are available only in direct chats' : activeUser.online ? 'Start video call' : 'User is offline'}
          aria-label="Start video call"
          className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Video
        </button>
      </div>
      {isManageOpen && isGroup ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-900/35 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-950/90">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Manage members</h3>
            <div className="mt-3 space-y-2">
              {(activeUser.members || []).map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800 dark:text-slate-100"
                >
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{member.email}</p>
                  </div>
                  {member.userId !== activeUser.adminId ? (
                    <button
                      type="button"
                      onClick={() => onRemoveGroupMember?.(member.userId)}
                      className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:text-rose-200"
                    >
                      Remove
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
            {availableGroupUsers.length > 0 ? (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Add members
                </p>
                <div className="mt-2 max-h-48 space-y-2 overflow-auto">
                  {availableGroupUsers.map((member) => (
                    <label
                      key={member.userId}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800 dark:text-slate-100"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(member.userId)}
                        onChange={(event) => {
                          setSelectedMemberIds((current) =>
                            event.target.checked
                              ? [...current, member.userId]
                              : current.filter((id) => id !== member.userId),
                          )
                        }}
                      />
                      <span>{member.name}</span>
                    </label>
                  ))}
                </div>
              </>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setManageOpen(false)
                  setSelectedMemberIds([])
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:text-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                disabled={selectedMemberIds.length === 0}
                onClick={async () => {
                  const added = await onAddGroupMembers?.(selectedMemberIds)
                  if (added !== false) {
                    setSelectedMemberIds([])
                    setManageOpen(false)
                  }
                }}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Add selected
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}

export default ChatHeader
