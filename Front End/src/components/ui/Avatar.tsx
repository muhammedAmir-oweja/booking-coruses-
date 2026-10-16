import type { User } from '../../types'
import { fillFor, initialsOf } from './identity'

/**
 * The signed-in person, as initials on a role-coloured disc.
 *
 * One definition, used by the navbar trigger, the account dropdown and the
 * sidebar's user panel. The sidebar used to draw a generic grey silhouette
 * instead, so the same admin appeared two different ways on one screen - and
 * the initials and the role colours lived in Navbar.tsx where nothing else
 * could reach them.
 */
interface AvatarProps {
  user: User | null
  /** Diameter in px. The font scales with it unless `fontSize` says otherwise. */
  size: number
  fontSize?: number
  className?: string
}

export default function Avatar({ user, size, fontSize, className }: AvatarProps) {
  const classes = `lms-avatar${user ? '' : ' lms-avatar--loading'}${className ? ` ${className}` : ''}`

  // No user yet: a pulsing disc of the same size, so the row does not resize
  // when the account finally loads.
  if (!user) {
    return <span className={classes} style={{ width: size, height: size }} aria-hidden="true" />
  }

  return (
    <span
      className={classes}
      style={{ width: size, height: size, fontSize: fontSize ?? Math.round(size * 0.37), background: fillFor(user) }}
      aria-hidden="true"
    >
      {initialsOf(user.name)}
    </span>
  )
}
