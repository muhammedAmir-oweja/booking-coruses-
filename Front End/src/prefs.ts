/**
 * The preferences cookie, read and written synchronously over document.cookie.
 *
 * Deliberately not an npm package: this is three lines of string handling, and
 * the cookie has to be readable by `document.cookie`, which means the backend
 * must leave it unencrypted (see bootstrap/app.php). The same JSON blob is read
 * server-side by SetLocale, so the UI language and the API's language can never
 * disagree.
 *
 * Task 26 extends this with the full preferences round-trip; task 20 needs only
 * `locale`, and writes it so the choice survives a reload.
 */

export type Locale = 'en' | 'ar'

export interface Prefs {
  locale?: Locale
  theme?: 'light' | 'dark'
  sidebar?: 'open' | 'collapsed'
}

const COOKIE = 'prefs'
const SUPPORTED: Locale[] = ['en', 'ar']

export function readPrefs(): Prefs {
  try {
    const raw = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1)

    if (!raw) return {}

    const parsed: unknown = JSON.parse(decodeURIComponent(raw))
    if (typeof parsed !== 'object' || parsed === null) return {}

    const prefs = parsed as Prefs
    // An unparseable or hand-edited cookie must not take the app down, and an
    // unsupported locale must not reach i18next as a resource key.
    if (prefs.locale && !SUPPORTED.includes(prefs.locale)) delete prefs.locale
    return prefs
  } catch {
    return {}
  }
}

export function writePrefsCookie(patch: Prefs): Prefs {
  // Merge, never replace: writing only `locale` must not drop a stored theme.
  const next = { ...readPrefs(), ...patch }
  try {
    const value = encodeURIComponent(JSON.stringify(next))
    // A year, root path, Lax so it still rides along on top-level navigation.
    document.cookie = `${COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`
  } catch {
    /* private window, or a cookie jar that refuses us - fall through */
  }
  return next
}

/** Keep <html lang> and <html dir> in step with the active locale. */
export function applyLocaleToDocument(locale: Locale): void {
  const root = document.documentElement
  root.lang = locale
  root.dir = locale === 'ar' ? 'rtl' : 'ltr'
}
