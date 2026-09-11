import { createContext, useContext, useEffect, useState } from 'react'
import { getMe } from '../api/auth'
import { DEV_NO_AUTH, DEV_USER } from '../devAuth'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAdmin: boolean
  isInstructor: boolean
  isStudent: boolean
  refresh: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAdmin: false,
  isInstructor: false,
  isStudent: false,
  refresh: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const hasToken = !!(localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'))
  const [loading, setLoading] = useState(hasToken || DEV_NO_AUTH)

  const fetchUser = () => {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
    // Dev-only: no token needed — the API signs us in as an admin, and if it
    // is not running we still fall back to a stand-in so the UI renders.
    if (!token && !DEV_NO_AUTH) {
      setUser(null)
      setLoading(false)
      return
    }
    setLoading(true)
    getMe()
      .then(setUser)
      .catch(() => setUser(DEV_NO_AUTH ? DEV_USER : null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUser() }, [])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin:      user?.role === 'admin',
      isInstructor: user?.role === 'instructor',
      isStudent:    user?.role === 'student',
      refresh: fetchUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
