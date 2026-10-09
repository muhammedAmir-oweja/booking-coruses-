import { useCallback, useEffect, useState } from 'react'
import i18n from '../i18n'
import client from '../api/client'
import { applyPrefsToDocument, readPrefs, writePrefsCookie, type Prefs } from '../prefs'
import { PreferencesContext } from './PreferencesContext'

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  // Initialised from the cookie, so the very first render is already right -
  // no flash of the wrong theme and no request before the sidebar knows its
  // width. `readPrefs` is passed as an initialiser, not called, so it runs once.
  const [prefs, setPrefs] = useState<Prefs>(readPrefs)

  const update = useCallback(async (patch: Partial<Prefs>) => {
    // Local first: the toggle must not wait on the network.
    setPrefs((current) => ({ ...current, ...patch }))
    writePrefsCookie(patch)

    // The provider is the single owner of the language: i18n no longer
    // persists on its own, so switching has to be driven from here.
    if (patch.locale && patch.locale !== i18n.resolvedLanguage) {
      void i18n.changeLanguage(patch.locale)
    }

    try {
      // Server-side copy, so __() and SetLocale agree with the UI.
      await client.put('/preferences', patch)
    } catch {
      // The cookie is already written; a failed sync is not worth a toast.
    }
  }, [])

  useEffect(() => {
    // data-theme and dir are what the stylesheet actually reads.
    applyPrefsToDocument(prefs)
  }, [prefs])

  return (
    <PreferencesContext.Provider value={{ prefs, update }}>
      {children}
    </PreferencesContext.Provider>
  )
}
