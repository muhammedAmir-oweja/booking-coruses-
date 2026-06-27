import client from './client'
import type { User } from '../types'

export function getUsers(params?: { role?: string }) {
  return client.get<User[]>('/users', { params })
}
