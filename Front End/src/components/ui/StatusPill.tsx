import { useTranslation } from 'react-i18next'

/**
 * A status as a tinted pill with a glyph and the translated word.
 *
 * The icon is not decoration. Three of the four status hues measure below 3:1
 * against white, and a status must stay readable for someone who cannot
 * separate the hues at all, so the glyph and the label - never the colour
 * alone - are what carry the state.
 *
 * `tone` maps the domain's vocabulary onto the four reserved status roles.
 * Anything unmapped falls through to the neutral pill with a generic glyph,
 * so a status the backend adds later degrades quietly instead of rendering an
 * unstyled word.
 */
const TONES: Record<string, { tone: 'good' | 'warn' | 'serious' | 'critical' | 'neutral'; icon: string }> = {
  // bookings
  confirmed: { tone: 'good', icon: 'fas fa-check' },
  pending: { tone: 'warn', icon: 'fas fa-hourglass-half' },
  cancelled: { tone: 'critical', icon: 'fas fa-times' },
  // payments
  paid: { tone: 'good', icon: 'fas fa-check' },
  unpaid: { tone: 'warn', icon: 'fas fa-hourglass-half' },
  refunded: { tone: 'serious', icon: 'fas fa-undo' },
  // courses
  active: { tone: 'good', icon: 'fas fa-check-circle' },
  inactive: { tone: 'neutral', icon: 'fas fa-pause' },
  draft: { tone: 'neutral', icon: 'fas fa-pencil-alt' },
  // sessions and enrolments
  scheduled: { tone: 'warn', icon: 'fas fa-calendar' },
  ongoing: { tone: 'good', icon: 'fas fa-play' },
  completed: { tone: 'neutral', icon: 'fas fa-flag-checkered' },
}

export default function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation()
  const { tone, icon } = TONES[status] ?? { tone: 'neutral' as const, icon: 'fas fa-info-circle' }

  return (
    <span className={`lmsd-pill lmsd-pill--${tone}`}>
      <i className={icon} aria-hidden="true" />
      {t(`status.${status}`, { defaultValue: status })}
    </span>
  )
}
