import { useCallback, useEffect, useState } from 'react'
import { getMe } from '../api/auth'
import { DEV_NO_AUTH, DEV_USER } from '../devAuth'
import { readAccess } from '../auth/tokens'
import { AuthContext } from './AuthContext'
import type { User } from '../types'

const readToken = () => readAccess()

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => !!readToken() || DEV_NO_AUTH)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    // No token and no dev bypass: the initial state (no user, not loading) is
    // already correct, so there is nothing to fetch and nothing to set.
    if (!readToken() && !DEV_NO_AUTH) return

    let cancelled = false

    void (async () => {
      try {
        const me = await getMe()
        if (!cancelled) setUser(me)
      } catch {
        // Dev-only: if the API is down we still render with a stand-in admin.
        if (!cancelled) setUser(DEV_NO_AUTH ? DEV_USER : null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [reloadKey])

  const refresh = useCallback(() => setReloadKey(k => k + 1), [])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAdmin:      user?.role === 'admin',
      isInstructor: user?.role === 'instructor',
      isStudent:    user?.role === 'student',
      refresh,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
