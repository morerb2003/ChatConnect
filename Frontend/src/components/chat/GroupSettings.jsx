import React, { useState } from 'react'
import './GroupSettings.css'

const GroupSettings = ({ group, currentUser, onClose, onAddMembers, onRemoveMember, onAssignAdmin, onLeaveGroup, onDeleteGroup }) => {
  const [showAddMembersForm, setShowAddMembersForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const isAdmin = currentUser && group.adminId === currentUser.id

  const handleAddMembers = async (selectedUserIds) => {
    if (!selectedUserIds.length) return
    try {
      setLoading(true)
      await onAddMembers(selectedUserIds)
      setShowAddMembersForm(false)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (window.confirm('Remove this member from the group?')) {
      try {
        setLoading(true)
        await onRemoveMember(memberId)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleAssignAdmin = async (memberId) => {
    if (window.confirm('Assign this member as group admin?')) {
      try {
        setLoading(true)
        await onAssignAdmin(memberId)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleDeleteGroup = async () => {
    try {
      setLoading(true)
      await onDeleteGroup()
      setShowDeleteConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="group-settings">
      <div className="settings-header">
        <h2>{group.name}</h2>
        <button onClick={onClose} className="close-btn">✕</button>
      </div>

      <div className="settings-content">
        {/* Group Info */}
        <div className="section">
          <h3>Group Info</h3>
          <div className="info-item">
            <label>Members:</label>
            <span>{group.members?.length || 0}</span>
          </div>
          <div className="info-item">
            <label>Admin:</label>
            <span>{group.members?.find(m => m.userId === group.adminId)?.name || 'Unknown'}</span>
          </div>
        </div>

        {/* Members List */}
        <div className="section">
          <div className="section-header">
            <h3>Members ({group.members?.length || 0})</h3>
            {isAdmin && (
              <button
                onClick={() => setShowAddMembersForm(!showAddMembersForm)}
                className="btn-secondary btn-sm"
              >
                + Add Members
              </button>
            )}
          </div>

          {showAddMembersForm && isAdmin && (
            <MemberSelectorForm
              onSelect={handleAddMembers}
              onCancel={() => setShowAddMembersForm(false)}
              loading={loading}
            />
          )}

          <div className="members-list">
            {group.members?.map(member => (
              <div key={member.userId} className="member-item">
                <div className="member-info">
                  {member.profileImageUrl && (
                    <img src={member.profileImageUrl} alt={member.name} className="member-avatar" />
                  )}
                  <div>
                    <div className="member-name">
                      {member.name}
                      {member.userId === group.adminId && <span className="admin-badge">Admin</span>}
                      {member.online && <span className="online-indicator">●</span>}
                    </div>
                    <div className="member-email">{member.email}</div>
                  </div>
                </div>

                {isAdmin && member.userId !== group.adminId && (
                  <div className="member-actions">
                    {member.userId !== currentUser.id && (
                      <>
                        <button
                          onClick={() => handleAssignAdmin(member.userId)}
                          className="btn-icon"
                          title="Make admin"
                        >
                          👑
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="btn-icon btn-danger"
                          title="Remove member"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Group Actions */}
        <div className="section">
          <h3>Actions</h3>
          <div className="actions">
            {!isAdmin && (
              <button
                onClick={() => {
                  if (window.confirm('Leave this group?')) {
                    onLeaveGroup()
                  }
                }}
                className="btn btn-secondary"
                disabled={loading}
              >
                Leave Group
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn btn-danger"
                disabled={loading}
              >
                Delete Group
              </button>
            )}
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="confirm-dialog">
            <div className="confirm-content">
              <h4>Delete Group?</h4>
              <p>This action cannot be undone. All group members will be notified.</p>
              <div className="confirm-buttons">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteGroup}
                  className="btn btn-danger"
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const MemberSelectorForm = ({ onSelect, onCancel, loading }) => {
  const [selectedMembers, setSelectedMembers] = useState([])

  const handleToggleMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <div className="member-selector">
      <div className="form-group">
        <label>Select members to add:</label>
        {/* This should be populated with available users not already in the group */}
        <div className="member-checkboxes">
          {/* Will be populated by parent component */}
        </div>
      </div>
      <div className="form-actions">
        <button onClick={onCancel} className="btn btn-secondary" disabled={loading}>
          Cancel
        </button>
        <button
          onClick={() => onSelect(selectedMembers)}
          className="btn btn-primary"
          disabled={loading || !selectedMembers.length}
        >
          Add Selected
        </button>
      </div>
    </div>
  )
}

export default GroupSettings
