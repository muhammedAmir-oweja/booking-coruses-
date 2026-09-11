import { createContext, useContext } from 'react'
import type { User } from '../types'

export interface AuthContextValue {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isInstructor: boolean
  isStudent: boolean
  refresh: () => void
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAdmin: false,
  isInstructor: false,
  isStudent: false,
  refresh: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}
