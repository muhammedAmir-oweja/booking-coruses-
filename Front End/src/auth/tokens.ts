/**
 * Where the two tokens live.
 *
 * The access token is short-lived (an hour) and the refresh token is not, so
 * they have to be stored and cleared together - a refresh token left behind
 * after logout is a live session nobody can see.
 *
 * The storage choice is the "remember me" box: localStorage survives closing
 * the browser, sessionStorage does not. It is made once at login and then
 * inferred, so a refresh never silently promotes a session-only login into a
 * permanent one.
 */
const ACCESS_KEY = 'auth_token'          // unchanged, so sessions survive the upgrade
const REFRESH_KEY = 'auth_refresh_token'

export interface TokenPair {
  access_token: string
  refresh_token: string
}

/** Whichever store the current session was put in; localStorage wins. */
function activeStore(): Storage | null {
  try {
    if (localStorage.getItem(ACCESS_KEY) || localStorage.getItem(REFRESH_KEY)) return localStorage
    if (sessionStorage.getItem(ACCESS_KEY) || sessionStorage.getItem(REFRESH_KEY)) return sessionStorage
  } catch {
    // Private mode can throw on access; treat it as "no session".
  }
  return null
}

export function readAccess(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY) ?? sessionStorage.getItem(ACCESS_KEY)
  } catch {
    return null
  }
}

export function readRefresh(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

/**
 * `remember` is only passed at login. A refresh omits it and the pair stays
 * in the store it was already in.
 */
export function saveTokens(pair: TokenPair, remember?: boolean): void {
  const target = remember === undefined
    ? (activeStore() ?? sessionStorage)
    : (remember ? localStorage : sessionStorage)

  try {
    clearTokens()
    target.setItem(ACCESS_KEY, pair.access_token)
    target.setItem(REFRESH_KEY, pair.refresh_token)
  } catch {
    // Nothing useful to do: the request that follows will 401 and the user
    // is sent back to the login screen.
  }
}

export function clearTokens(): void {
  for (const store of [localStorage, sessionStorage]) {
    try {
      store.removeItem(ACCESS_KEY)
      store.removeItem(REFRESH_KEY)
    } catch {
      // ignore
    }
  }
}
