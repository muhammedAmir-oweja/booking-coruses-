import axios from 'axios'
import { DEV_NO_AUTH } from '../devAuth'
import i18n from '../i18n'
import { readPrefs } from '../prefs'

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

  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
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
      localStorage.removeItem('auth_token')
      sessionStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default client
