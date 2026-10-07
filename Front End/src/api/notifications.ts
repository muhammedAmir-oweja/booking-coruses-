import client from './client'
import type { AppNotification } from '../types'

export const getNotifications = () =>
  client.get<{ data: AppNotification[]; unread_count: number }>('/notifications')
    .then((r) => r.data)

export const getUnreadCount = () =>
  client.get<{ unread_count: number }>('/notifications/unread-count')
    .then((r) => r.data.unread_count)

export const markRead = (id: string) =>
  client.post(`/notifications/${id}/read`)

export const markAllRead = () =>
  client.post('/notifications/read-all')

export const deleteNotification = (id: string) =>
  client.delete(`/notifications/${id}`)
