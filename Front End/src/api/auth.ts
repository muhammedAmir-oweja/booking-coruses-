import axios from 'axios'
import client from './client'
import type { User } from '../types'
import type { TokenPair } from '../auth/tokens'

/**
 * What /auth/login, /auth/register and /auth/refresh all return.
 * `token` is kept as an alias of access_token for anything still reading it.
 */
export interface AuthTokens extends TokenPair {
  token: string
  token_type: string
  expires_in: number
  refresh_expires_in: number
  user: User
}

export const login = (email: string, password: string) =>
  client.post<AuthTokens>('/auth/login', { email, password }).then((r) => r.data)

export const register = (name: string, email: string, password: string, password_confirmation: string, role?: string) =>
  client.post<AuthTokens>('/auth/register', { name, email, password, password_confirmation, role }).then((r) => r.data)

/**
 * Exchanges the refresh token for a fresh pair.
 *
 * Deliberately a bare axios call rather than `client`: the shared instance
 * attaches the ACCESS token on the way out - which this endpoint rejects with
 * 403 - and its own 401 handler would recurse straight back into here.
 */
export const refreshTokens = (refreshToken: string) =>
  axios.post<AuthTokens>(
    `${client.defaults.baseURL}/auth/refresh`,
    null,
    {
      headers: { Accept: 'application/json', Authorization: `Bearer ${refreshToken}` },
      withCredentials: true,
    },
  ).then((r) => r.data)

export const logout = () =>
  client.post('/auth/logout')

export const getMe = () =>
  client.get<User>('/auth/me').then((r) => r.data)

export const changePassword = (current_password: string, password: string, password_confirmation: string) =>
  client.post<{ message: string }>('/auth/change-password', { current_password, password, password_confirmation }).then((r) => r.data)
