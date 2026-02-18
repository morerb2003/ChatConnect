import api from './api'

export const fetchSidebarUsers = async () => {
  const response = await api.get('/chat/users')
  return response.data
}

export const getOrCreateRoom = async (participantId) => {
  const response = await api.post(`/chat/rooms/${participantId}`)
  return response.data
}

export const fetchRoomMessages = async (chatRoomId, page = 0, size = 30) => {
  const response = await api.get(`/chat/rooms/${chatRoomId}/messages`, {
    params: { page, size },
  })
  return response.data
}

export const markRoomAsRead = async (chatRoomId) => {
  const response = await api.post(`/chat/rooms/${chatRoomId}/read`)
  return response.data
}
