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
