import React, { createContext, useState, useCallback } from 'react'

export const GroupContext = createContext()

export const GroupProvider = ({ children }) => {
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  const [loading, setLoading] = useState(false)

  const addGroup = useCallback((group) => {
    setGroups(prev => {
      const filtered = prev.filter(g => g.chatRoomId !== group.chatRoomId)
      return [group, ...filtered]
    })
  }, [])

  const updateGroup = useCallback((group) => {
    setGroups(prev => prev.map(g => g.chatRoomId === group.chatRoomId ? group : g))
    if (selectedGroup?.chatRoomId === group.chatRoomId) {
      setSelectedGroup(group)
    }
  }, [selectedGroup])

  const removeGroup = useCallback((groupId) => {
    setGroups(prev => prev.filter(g => g.chatRoomId !== groupId))
    if (selectedGroup?.chatRoomId === groupId) {
      setSelectedGroup(null)
    }
  }, [selectedGroup])

  const value = {
    groups,
    selectedGroup,
    showGroupSettings,
    loading,
    setGroups,
    setSelectedGroup,
    setShowGroupSettings,
    setLoading,
    addGroup,
    updateGroup,
    removeGroup,
  }

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  )
}
