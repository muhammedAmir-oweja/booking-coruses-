import client from './client'
import type { User } from '../types'

export const login = (email: string, password: string) =>
  client.post<{ token: string; user: User }>('/auth/login', { email, password }).then((r) => r.data)

export const register = (name: string, email: string, password: string, password_confirmation: string, role?: string) =>
  client.post<{ token: string; user: User }>('/auth/register', { name, email, password, password_confirmation, role }).then((r) => r.data)

export const logout = () =>
  client.post('/auth/logout')

export const getMe = () =>
  client.get<User>('/auth/me').then((r) => r.data)

export const changePassword = (current_password: string, password: string, password_confirmation: string) =>
  client.post<{ message: string }>('/auth/change-password', { current_password, password, password_confirmation }).then((r) => r.data)
