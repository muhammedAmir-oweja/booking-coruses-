import { createContext, useContext } from 'react'
import type { Prefs } from '../prefs'

export interface PreferencesContextValue {
  prefs: Prefs
  /** Patch one or more keys. Writes the cookie first, then syncs the server. */
  update: (patch: Partial<Prefs>) => Promise<void>
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used inside a PreferencesProvider')
  return ctx
}
