import { useMemo, useRef, useState } from 'react'
import ChatHeader from './ChatHeader'
import MessageBubble from './MessageBubble'

const EMOJIS = [
  '\u{1F600}',
  '\u{1F602}',
  '\u{1F60D}',
  '\u{1F44D}',
  '\u{1F64F}',
  '\u{1F525}',
  '\u{1F389}',
  '\u2764\uFE0F',
  '\u{1F60E}',
  '\u{1F622}',
  '\u{1F91D}',
  '\u2705',
]

const dateLabel = (isoValue) => {
  const current = new Date(isoValue)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const sameDay = (left, right) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()

  if (sameDay(current, today)) return 'Today'
  if (sameDay(current, yesterday)) return 'Yesterday'
  return current.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })
}

function ChatWindow({
  className = '',
  activeUser,
  messages,
  draft,
  isConnected,
  currentUserId,
  onDraftChange,
  onSend,
  onLoadOlder,
  hasMoreHistory,
  typingLabel,
  messageEndRef,
  onBack,
  searchTerm,
  onSearchChange,
  searchMatches = [],
  onSearchSubmit,
  onSearchJump,
  replyTarget,
  forwardTarget,
  editingMessage,
  attachmentDraft,
  allUsers = [],
  availableGroupUsers = [],
  onClearReply,
  onClearForward,
  onCancelEdit,
  onAttachmentPick,
  onAttachmentRemove,
  onEmojiPick,
  onReplyMessage,
  onForwardMessage,
  onEditMessage,
  onReactToMessage,
  onRemoveReaction,
  onDeleteForMe,
  onDeleteForEveryone,
  onForwardToUsers,
  onAddGroupMembers,
  onRemoveGroupMember,
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showForwardPicker, setShowForwardPicker] = useState(false)
  const [showDeletePicker, setShowDeletePicker] = useState(false)
  const [selectedMessageKeys, setSelectedMessageKeys] = useState([])
  const [selectedForwardUserIds, setSelectedForwardUserIds] = useState([])
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const fileInputRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const messageRefs = useRef({})

  const groupedItems = useMemo(() => {
    const items = []
    let previousLabel = ''
    messages.forEach((message) => {
      const label = dateLabel(message.timestamp)
      if (label !== previousLabel) {
        items.push({ type: 'separator', key: `sep-${label}-${message.timestamp}`, label })
        previousLabel = label
      }
      items.push({ type: 'message', key: `${message.id ?? message.clientMessageId}-${message.timestamp}`, message })
    })
    return items
  }, [messages])

  if (!activeUser) {
    return (
      <section className="grid h-full place-items-center bg-gradient-to-b from-slate-50 to-emerald-50 p-6 dark:from-slate-950 dark:to-slate-900/70">
        <div className="max-w-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Choose a chat to get started</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Open a direct conversation or group from the sidebar to load history and start chatting live.
          </p>
        </div>
      </section>
    )
  }

  const jumpToMessage = (messageId) => {
    if (!messageId) return
    const key = String(messageId)
    const element = messageRefs.current[key]
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      onSearchJump?.(messageId)
    }
  }

  const selectedMessages = messages.filter((message) =>
    selectedMessageKeys.includes(String(message.id || message.clientMessageId)),
  )
  const selectionMode = selectedMessages.length > 0

  const toggleMessageSelection = (message) => {
    const key = String(message.id || message.clientMessageId)
    setSelectedMessageKeys((current) => {
      const existingKeys = new Set(messages.map((msg) => String(msg.id || msg.clientMessageId)))
      const cleaned = current.filter((item) => existingKeys.has(item))
      return cleaned.includes(key) ? cleaned.filter((item) => item !== key) : [...cleaned, key]
    })
  }

  const clearSelectionMode = () => {
    setSelectedMessageKeys([])
    setShowForwardPicker(false)
    setSelectedForwardUserIds([])
    setShowDeletePicker(false)
  }

  const runDeleteForMe = async () => {
    await Promise.all(selectedMessages.map((message) => onDeleteForMe?.(message)))
    clearSelectionMode()
  }

  const runDeleteForEveryone = async () => {
    const ownMessages = selectedMessages.filter((message) => message.isOwn && !message.deletedForEveryone)
    await Promise.all(ownMessages.map((message) => onDeleteForEveryone?.(message)))
    clearSelectionMode()
  }

  const runReplySelection = () => {
    if (selectedMessages.length !== 1) return
    onReplyMessage?.(selectedMessages[0])
    clearSelectionMode()
  }

  return (
    <section
      className={`relative grid h-full min-h-0 grid-rows-[auto_1fr_auto] bg-gradient-to-b from-white to-emerald-50/50 dark:from-slate-950 dark:to-slate-900/60 ${className}`}
    >
      {selectionMode ? (
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-3 py-3 backdrop-blur sm:px-4 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearSelectionMode}
              className="rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:text-slate-100"
              aria-label="Back"
            >
              Back
            </button>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{selectedMessages.length} Selected</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDeletePicker(true)}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm dark:border-slate-700 dark:text-slate-100"
              aria-label="Delete"
              title="Delete"
            >
              Delete
            </button>
            {selectedMessages.length === 1 ? (
              <button
                type="button"
                onClick={runReplySelection}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm dark:border-slate-700 dark:text-slate-100"
                aria-label="Reply"
                title="Reply"
              >
                Reply
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setSelectedForwardUserIds([])
                setShowForwardPicker(true)
              }}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm dark:border-slate-700 dark:text-slate-100"
              aria-label="Forward"
              title="Forward"
            >
              Forward
            </button>
          </div>
        </header>
      ) : (
        <ChatHeader
          activeUser={activeUser}
          onBack={onBack}
          onAddGroupMembers={onAddGroupMembers}
          onRemoveGroupMember={onRemoveGroupMember}
          availableGroupUsers={availableGroupUsers}
        />
      )}

      <div
        ref={scrollContainerRef}
        onScroll={(event) => {
          const node = event.currentTarget
          const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight
          setShowScrollBottom(distanceFromBottom > 180)
        }}
        className="scrollbar-slim relative min-h-0 overflow-y-auto px-2.5 py-3 sm:px-4"
      >
        <form
          className="mb-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            onSearchSubmit?.()
          }}
        >
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search in this chat..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400"
          />
          <button
            type="submit"
            className="rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Find
          </button>
        </form>

        {searchTerm.trim() && searchMatches.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1">
            {searchMatches.slice(0, 8).map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => jumpToMessage(result.id)}
                className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
              >
                {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </button>
            ))}
          </div>
        ) : null}

        {hasMoreHistory ? (
          <button
            type="button"
            onClick={onLoadOlder}
            className="mx-auto mb-3 block rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Load older messages
          </button>
        ) : null}

        <div className="space-y-2.5">
          {messages.length === 0 ? (
            <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 text-center dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No messages yet. Send a message to start the conversation.
              </p>
            </div>
          ) : null}
          {groupedItems.map((item) =>
            item.type === 'separator' ? (
              <div key={item.key} className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {item.label}
              </div>
            ) : (
              <div
                key={item.key}
                ref={(node) => {
                  if (!node) return
                  const idKey = String(item.message.id || item.message.clientMessageId)
                  messageRefs.current[idKey] = node
                }}
              >
                <MessageBubble
                  message={item.message}
                  isOwn={item.message.isOwn}
                  searchQuery={searchTerm}
                  currentUserId={currentUserId}
                  onReply={onReplyMessage}
                  onForward={onForwardMessage}
                  onEdit={onEditMessage}
                  onReact={onReactToMessage}
                  onRemoveReaction={onRemoveReaction}
                  onDeleteForMe={onDeleteForMe}
                  onDeleteForEveryone={onDeleteForEveryone}
                  onJumpToMessage={jumpToMessage}
                  selectionMode={selectionMode}
                  isSelected={selectedMessageKeys.includes(String(item.message.id || item.message.clientMessageId))}
                  onToggleSelect={toggleMessageSelection}
                  timeLabel={new Date(item.message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                />
              </div>
            ),
          )}
          {typingLabel ? <p className="text-xs text-slate-500 dark:text-slate-400">{typingLabel}</p> : null}
          <div ref={messageEndRef} />
        </div>

        {showScrollBottom ? (
          <button
            type="button"
            onClick={() => messageEndRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
            className="sticky bottom-3 float-right mt-2 rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow transition hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-slate-950/60 dark:text-emerald-200 dark:hover:bg-slate-900"
          >
            Newest
          </button>
        ) : null}
      </div>

      <form
        onSubmit={onSend}
        className="border-t border-slate-200/90 bg-white/95 px-2.5 py-2.5 backdrop-blur sm:px-4 sm:py-3 dark:border-slate-800 dark:bg-slate-950/70"
      >
        {replyTarget ? (
          <div className="mb-2 flex items-start justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs text-slate-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-slate-100">
            <div className="min-w-0">
              <p className="font-semibold text-emerald-700 dark:text-emerald-200">Replying to {replyTarget.senderName || 'message'}</p>
              <p className="truncate">{replyTarget.text || ''}</p>
            </div>
            <button type="button" onClick={onClearReply} className="rounded-md border border-emerald-300 px-2 py-0.5 dark:border-emerald-900/60">
              Cancel
            </button>
          </div>
        ) : null}
        {forwardTarget ? (
          <div className="mb-2 flex items-start justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-slate-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-slate-100">
            <div className="min-w-0">
              <p className="font-semibold text-amber-700 dark:text-amber-200">Forwarding message</p>
              <p className="truncate">{forwardTarget.displayContent || forwardTarget.attachment?.name || 'Attachment'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedForwardUserIds([])
                  setShowForwardPicker(true)
                }}
                className="rounded-md border border-amber-300 px-2 py-0.5 dark:border-amber-900/60"
              >
                Select users
              </button>
              <button type="button" onClick={onClearForward} className="rounded-md border border-amber-300 px-2 py-0.5 dark:border-amber-900/60">
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        {editingMessage ? (
          <div className="mb-2 flex items-start justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-2 text-xs text-slate-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-slate-100">
            <p className="font-semibold text-sky-700 dark:text-sky-200">Editing message</p>
            <button type="button" onClick={onCancelEdit} className="rounded-md border border-sky-300 px-2 py-0.5 dark:border-sky-900/60">
              Cancel
            </button>
          </div>
        ) : null}
        {attachmentDraft ? (
          <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="truncate font-medium">Attachment: {attachmentDraft.name}</p>
              <button type="button" onClick={onAttachmentRemove} className="rounded-md border border-slate-300 px-2 py-0.5 dark:border-slate-700">
                Remove
              </button>
            </div>
            {attachmentDraft.previewUrl ? (
              <img src={attachmentDraft.previewUrl} alt={attachmentDraft.name} className="max-h-44 rounded-lg object-cover" />
            ) : null}
          </div>
        ) : null}

        <div className="flex items-end gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/85 p-1.5 shadow-sm sm:gap-2 dark:border-slate-800 dark:bg-slate-900/40">
          <input
            ref={fileInputRef}
            type="file"
            onChange={(event) => onAttachmentPick(event.target.files?.[0] || null)}
            accept="image/*,video/*,application/pdf"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 sm:h-11 sm:w-11 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-800"
            title="Attach file"
          >
            File
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((current) => !current)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 sm:h-11 sm:w-11 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Emoji"
            >
              Emoji
            </button>
            {showEmojiPicker ? (
              <div className="absolute bottom-12 left-0 z-10 grid w-48 grid-cols-6 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-950/80">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onEmojiPick(emoji)
                      setShowEmojiPicker(false)
                    }}
                    className="rounded-md p-1.5 text-lg transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={`Message ${activeUser.name}`}
            rows={1}
            aria-label={`Message ${activeUser.name}`}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 sm:min-h-11 sm:px-3.5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:bg-slate-950/70"
          />
          <button
            type="submit"
            disabled={(!draft.trim() && !attachmentDraft && !forwardTarget) || !isConnected}
            className="inline-flex h-10 min-w-[4.5rem] items-center justify-center rounded-xl bg-emerald-600 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 sm:h-11 sm:min-w-20 sm:px-4"
          >
            {editingMessage ? 'Save' : 'Send'}
          </button>
        </div>
      </form>

      {showForwardPicker && (forwardTarget || selectionMode) ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-900/35 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-950/90">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Forward Message</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Select one or more users</p>
            <div className="mt-3 max-h-64 space-y-2 overflow-auto">
              {allUsers.map((userItem) => (
                <label
                  key={userItem.userId}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-sm dark:border-slate-800 dark:text-slate-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedForwardUserIds.includes(userItem.userId)}
                    onChange={(event) => {
                      setSelectedForwardUserIds((current) =>
                        event.target.checked
                          ? [...current, userItem.userId]
                          : current.filter((id) => id !== userItem.userId),
                      )
                    }}
                  />
                  <span>{userItem.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForwardPicker(false)
                  setSelectedForwardUserIds([])
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:text-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedForwardUserIds.length === 0}
                onClick={() => {
                  onForwardToUsers?.(selectedForwardUserIds, selectionMode ? selectedMessages : null)
                  clearSelectionMode()
                  setShowForwardPicker(false)
                }}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Forward
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeletePicker ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-900/35 px-4">
          <div className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-950/90">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">Delete Messages</h3>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={runDeleteForMe}
                className="rounded-lg border border-slate-300 px-3 py-2 text-left text-sm dark:border-slate-800 dark:text-slate-100"
              >
                Delete for me
              </button>
              <button
                type="button"
                onClick={runDeleteForEveryone}
                className="rounded-lg border border-slate-300 px-3 py-2 text-left text-sm dark:border-slate-800 dark:text-slate-100"
              >
                Delete for everyone
              </button>
              <button
                type="button"
                onClick={() => setShowDeletePicker(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-left text-sm dark:border-slate-800 dark:text-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default ChatWindow
