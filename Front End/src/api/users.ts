import client from './client'
import type { User, PaginatedResponse } from '../types'

export function getUsers(params?: { role?: string; per_page?: number }) {
  return client.get<PaginatedResponse<User>>('/users', { params })
}
