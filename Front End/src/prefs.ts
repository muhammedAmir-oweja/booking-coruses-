/**
 * The preferences cookie, read and written synchronously over document.cookie.
 *
 * Deliberately not an npm package: this is string handling, and the cookie has
 * to be readable by `document.cookie`, which is why the backend exempts it from
 * encryption (bootstrap/app.php) and sets httpOnly: false.
 *
 * Synchronous on purpose: Layout and the i18n bootstrap both need values before
 * the first render, long before GET /api/preferences could answer. That is the
 * whole reason this is a cookie and not a users.preferences column.
 *
 * The key names match UpdatePreferencesRequest's rules exactly, so a PUT can
 * forward a patch straight through.
 *
 * Never put the auth token in here: this cookie is unencrypted and readable by
 * any script on the page. It may only ever hold display settings. The token
 * stays in localStorage/sessionStorage where api/client.ts keeps it.
 */

export type Locale = 'en' | 'ar'
export type Theme = 'light' | 'dark'
export type PerPage = 10 | 25 | 50 | 100

export interface Prefs {
  locale: Locale
  theme: Theme
  sidebar_collapsed: boolean
  per_page: PerPage
}

export const DEFAULT_PREFS: Prefs = {
  locale: 'en',
  theme: 'light',
  sidebar_collapsed: false,
  per_page: 10,
}

const COOKIE = 'prefs'
const LOCALES: Locale[] = ['en', 'ar']
const THEMES: Theme[] = ['light', 'dark']
/** The allowed page sizes, shared with the Pagination selector so the
 *  control can never offer a value readPrefs() would reject. */
export const PER_PAGE_OPTIONS: readonly PerPage[] = [10, 25, 50, 100]
const PER_PAGES: readonly PerPage[] = PER_PAGE_OPTIONS

export function readPrefs(): Prefs {
  try {
    const raw = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${COOKIE}=`))
      ?.slice(COOKIE.length + 1)

    if (!raw) return DEFAULT_PREFS

    // Laravel url-encodes the JSON on the way out.
    const parsed: unknown = JSON.parse(decodeURIComponent(raw))
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFS

    const p = parsed as Partial<Prefs>

    // Validate every field rather than spreading blindly: the cookie is
    // readable AND writable by anything on the page, so a hand-edited locale
    // must not reach i18next as a resource key.
    return {
      locale: LOCALES.includes(p.locale as Locale) ? (p.locale as Locale) : DEFAULT_PREFS.locale,
      theme: THEMES.includes(p.theme as Theme) ? (p.theme as Theme) : DEFAULT_PREFS.theme,
      sidebar_collapsed: typeof p.sidebar_collapsed === 'boolean'
        ? p.sidebar_collapsed
        : DEFAULT_PREFS.sidebar_collapsed,
      per_page: PER_PAGES.includes(p.per_page as PerPage)
        ? (p.per_page as PerPage)
        : DEFAULT_PREFS.per_page,
    }
  } catch {
    // Malformed or hand-edited cookie: defaults, never a crash.
    return DEFAULT_PREFS
  }
}

/** Optimistic local write, so the UI turns over before the request lands. */
export function writePrefsCookie(patch: Partial<Prefs>): Prefs {
  // Merge, never replace: writing only `locale` must not drop a stored theme.
  const next: Prefs = { ...readPrefs(), ...patch }
  try {
    const value = encodeURIComponent(JSON.stringify(next))
    const year = 60 * 60 * 24 * 365
    document.cookie = `${COOKIE}=${value}; path=/; max-age=${year}; samesite=lax`
  } catch {
    /* private window, or a cookie jar that refuses us - fall through */
  }
  return next
}

/** Keep <html lang>, <html dir> and data-theme in step with the preferences. */
export function applyPrefsToDocument(prefs: Pick<Prefs, 'locale' | 'theme'>): void {
  const root = document.documentElement
  root.lang = prefs.locale
  root.dir = prefs.locale === 'ar' ? 'rtl' : 'ltr'

  // data-theme is what src/index.css reads (its dark-mode media query is
  // overridable via :root[data-theme]).
  root.dataset.theme = prefs.theme

  // AdminLTE 3.2 ships its own dark variant keyed off `body.dark-mode`, so the
  // theme preference drives that too - otherwise data-theme alone would be
  // inert against chrome that comes from the CDN stylesheet.
  document.body.classList.toggle('dark-mode', prefs.theme === 'dark')
}

/**
 * Locale-only variant, kept because src/i18n bootstraps before the provider
 * mounts and only knows about the language at that point.
 */
export function applyLocaleToDocument(locale: Locale): void {
  const root = document.documentElement
  root.lang = locale
  root.dir = locale === 'ar' ? 'rtl' : 'ltr'
}
