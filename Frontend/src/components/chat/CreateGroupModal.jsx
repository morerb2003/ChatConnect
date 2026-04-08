import React, { useState, useEffect } from 'react'
import './CreateGroupModal.css'

const CreateGroupModal = ({ isOpen, onClose, onCreateGroup, availableUsers, loading }) => {
  const [groupName, setGroupName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setGroupName('')
      setSelectedMembers([])
      setSearchQuery('')
    }
  }, [isOpen])

  const handleToggleMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group name')
      return
    }
    if (selectedMembers.length === 0) {
      alert('Please select at least one member')
      return
    }

    try {
      await onCreateGroup({
        name: groupName.trim(),
        memberIds: selectedMembers,
      })
      setGroupName('')
      setSelectedMembers([])
      setSearchQuery('')
      onClose()
    } catch (error) {
      console.error('Failed to create group:', error)
    }
  }

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Group</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="modal-body">
          {/* Group Name Input */}
          <div className="form-group">
            <label htmlFor="groupName">Group Name</label>
            <input
              id="groupName"
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              maxLength={120}
              disabled={loading}
            />
            <div className="char-count">{groupName.length}/120</div>
          </div>

          {/* Member Selection */}
          <div className="form-group">
            <label>Select Members ({selectedMembers.length} selected)</label>

            {/* Search Bar */}
            <div className="search-box">
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Members List */}
            <div className="members-selector">
              {filteredUsers.length === 0 ? (
                <div className="no-results">No users available</div>
              ) : (
                filteredUsers.map(user => (
                  <label key={user.id} className="member-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(user.id)}
                      onChange={() => handleToggleMember(user.id)}
                      disabled={loading}
                    />
                    <div className="member-info">
                      {user.profileImageUrl && (
                        <img src={user.profileImageUrl} alt={user.name} className="avatar" />
                      )}
                      <div>
                        <div className="member-name">{user.name}</div>
                        <div className="member-email">{user.email}</div>
                      </div>
                    </div>
                    {user.online && <span className="online-badge">●</span>}
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            className="btn btn-primary"
            disabled={loading || !groupName.trim() || selectedMembers.length === 0}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateGroupModal
