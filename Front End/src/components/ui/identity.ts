import type { User } from '../../types'

/**
 * How a person is rendered: their initials, and the colour of the disc behind
 * them. Kept apart from Avatar.tsx so the helpers can be imported without
 * dragging in a component - the tables on the dashboard want the initials but
 * draw their own tile.
 */
const ROLE_FILLS: Record<string, string> = {
  admin:      '#b4463c',
  instructor: '#16798f',
  student:    '#1e7a4b',
}
const NEUTRAL_FILL = '#5a6470'

/** Saturated enough to hold their own against the dark chrome, and each one
 *  clears 4.5:1 against the white initials it carries (5.4 / 5.0 / 5.3 / 6.0). */
export const fillFor = (user: User | null) =>
  user ? (ROLE_FILLS[user.role] ?? NEUTRAL_FILL) : NEUTRAL_FILL

/** First letters of the first two words: "Amira Haddad" -> "AH". */
export const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'
