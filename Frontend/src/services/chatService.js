import api from './api'
import { getToken } from '../utils/auth'

const withAuth = (config = {}) => {
  const token = getToken()
  if (!token) return config

  return {
    ...config,
    headers: {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  }
}

const attachUserMessage = (error, fallbackMessage) => {
  const apiMessage = error?.response?.data?.message
  const message = apiMessage || fallbackMessage

  if (error && typeof error === 'object') {
    error.userMessage = message
    throw error
  }

  throw new Error(message)
}

export const fetchSidebarUsers = async () => {
  try {
    const response = await api.get('/chat/users', withAuth())
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to load users')
  }
}

export const getOrCreateRoom = async (participantId) => {
  try {
    const response = await api.post(`/chat/rooms/${participantId}`, null, withAuth())
    if (!response?.data?.chatRoomId) {
      throw new Error('Invalid chat room response from server')
    }
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to open conversation')
  }
}

export const createGroup = async ({ name, memberIds }) => {
  try {
    const response = await api.post('/chat/groups', { name, memberIds }, withAuth())
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to create group')
  }
}

export const addGroupMembers = async (chatRoomId, memberIds) => {
  try {
    const response = await api.post(`/chat/groups/${chatRoomId}/members`, { memberIds }, withAuth())
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to add group members')
  }
}

export const removeGroupMember = async (chatRoomId, memberId) => {
  try {
    const response = await api.delete(`/chat/groups/${chatRoomId}/members/${memberId}`, withAuth())
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to remove group member')
  }
}

export const fetchRoomMessages = async (chatRoomId, page = 0, size = 30) => {
  try {
    const response = await api.get(
      `/chat/rooms/${chatRoomId}/messages`,
      withAuth({
        params: { page, size },
      }),
    )
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to load messages')
  }
}

export const markRoomAsRead = async (chatRoomId) => {
  try {
    const response = await api.post(`/chat/rooms/${chatRoomId}/read`, null, withAuth())
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to mark messages as read')
  }
}

export const fetchMyProfile = async () => {
  try {
    const response = await api.get('/users/me', withAuth())
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to load profile')
  }
}

export const uploadProfileImage = async (file) => {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await api.post('/users/upload-profile', formData, withAuth({
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }))
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to upload profile image')
  }
}

export const uploadChatAttachment = async (file) => {
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await api.post('/chat/attachments', formData, withAuth({
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }))
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to upload attachment')
  }
}

export const editMessage = async (messageId, content) => {
  try {
    const response = await api.patch(`/chat/messages/${messageId}`, { content }, withAuth())
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to edit message')
  }
}

export const deleteMessageForEveryone = async (messageId) => {
  try {
    const response = await api.delete(`/chat/messages/${messageId}`, withAuth())
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to delete message')
  }
}

export const deleteMessageForMe = async (messageId) => {
  try {
    const response = await api.delete(`/chat/messages/${messageId}/me`, withAuth())
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to hide message')
  }
}

export const forwardMessageToUsers = async (messageId, targetUserIds) => {
  try {
    const response = await api.post(`/chat/messages/${messageId}/forward`, { targetUserIds }, withAuth())
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to forward message')
  }
}

export const searchRoomMessages = async (chatRoomId, query, page = 0, size = 30) => {
  try {
    const response = await api.get(`/chat/rooms/${chatRoomId}/search`, withAuth({
      params: { query, page, size },
    }))
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to search messages')
  }
}

export const addMessageReaction = async (messageId, emoji) => {
  try {
    const response = await api.post(`/chat/messages/${messageId}/reactions`, { emoji }, withAuth())
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to add reaction')
  }
}

export const removeMessageReaction = async (messageId, emoji) => {
  try {
    const response = await api.delete(`/chat/messages/${messageId}/reactions`, withAuth({
      params: { emoji },
    }))
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to remove reaction')
  }
}

export const leaveGroup = async (chatRoomId) => {
  try {
    const response = await api.post(`/chat/groups/${chatRoomId}/leave`, null, withAuth())
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to leave group')
  }
}

export const deleteGroup = async (chatRoomId) => {
  try {
    const response = await api.delete(`/chat/groups/${chatRoomId}`, withAuth())
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to delete group')
  }
}

export const assignGroupAdmin = async (chatRoomId, adminId) => {
  try {
    const response = await api.post(
      `/chat/groups/${chatRoomId}/admin`,
      { adminId },
      withAuth(),
    )
    return response.data
  } catch (error) {
    attachUserMessage(error, 'Failed to assign admin')
  }
}
