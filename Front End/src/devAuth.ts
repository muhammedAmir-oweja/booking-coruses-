import type { User } from './types'

/**
 * Dev-only escape hatch: with VITE_DEV_NO_AUTH=true the app skips the login
 * screen and treats you as an admin. The backend needs DEV_NO_AUTH=true too.
 *
 * To go back to real auth: set VITE_DEV_NO_AUTH=false (or drop it from .env).
 */
export const DEV_NO_AUTH = import.meta.env.VITE_DEV_NO_AUTH === 'true'

/** Stand-in used only if the API is unreachable, so the UI still renders. */
export const DEV_USER: User = {
  id: 0,
  name: 'Dev Admin',
  email: 'dev-admin@local.test',
  role: 'admin',
  created_at: new Date().toISOString(),
}
