import axios from 'axios'
import { DEV_NO_AUTH } from '../devAuth'
import i18n from '../i18n'
import { readPrefs } from '../prefs'
import { clearTokens, readAccess, readRefresh, saveTokens } from '../auth/tokens'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  // Every request states its language, so 422 messages, mail and the 429 body
  // come back in the language the user is looking at. SetLocale reads this
  // header first, ahead of the prefs cookie it falls back to.
  config.headers['X-Locale'] = readPrefs().locale

  const token = readAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * One refresh at a time.
 *
 * A page typically has several requests in flight, so an expired access token
 * produces several 401s at once. Without this they would each call
 * /auth/refresh - and because refresh tokens ROTATE, the first call would
 * invalidate the token the others are still holding, logging the user out in
 * the middle of a renewal that was working. The throttle on that route would
 * reject the stampede anyway.
 *
 * So the first 401 starts the refresh and the rest await the same promise.
 */
let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = readRefresh()
  if (!refreshToken) return null

  try {
    // Imported lazily: api/auth.ts imports this module, and a static import
    // back would be a cycle.
    const { refreshTokens } = await import('./auth')
    const pair = await refreshTokens(refreshToken)
    // No `remember` argument: the pair stays in whichever store the user's
    // original login chose.
    saveTokens(pair)
    return pair.access_token
  } catch {
    clearTokens()
    return null
  }
}

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    // 429 is not an auth failure: do not clear the token, do not redirect.
    // Hand the caller a message it can toast, with the server's own wait time.
    // Axios lowercases response header names - ['Retry-After'] is undefined,
    // which is the bug that makes the toast say "60s" forever.
    if (err.response?.status === 429) {
      const retry = Number(err.response.headers['retry-after'] ?? 60)
      err.rateLimited = { retryAfter: retry }

      // Our own limiters return a translated body (see lang/*/errors.php), so
      // prefer it. Laravel's built-in 429 is the hardcoded, untranslatable
      // "Too Many Attempts." - swap that one for the localized string instead
      // of showing English to an Arabic user.
      const fromServer = err.response.data?.message
      err.message = (!fromServer || fromServer === 'Too Many Attempts.')
        ? i18n.t('errors.rate_limited', { seconds: retry })
        : fromServer

      return Promise.reject(err)
    }

    if (err.response?.status === 401 && !DEV_NO_AUTH) {
      const original = err.config

      // Try once, and only when there is a refresh token to try with. The
      // `_retried` flag is what stops a loop: if the renewed token is itself
      // rejected, the second 401 falls through to the redirect below.
      if (original && !original._retried && readRefresh()) {
        original._retried = true

        refreshing ??= refreshAccessToken().finally(() => { refreshing = null })
        const fresh = await refreshing

        if (fresh) {
          original.headers = original.headers ?? {}
          original.headers.Authorization = `Bearer ${fresh}`
          return client(original)
        }
      }

      clearTokens()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client
