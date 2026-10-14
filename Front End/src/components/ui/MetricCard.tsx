import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sparkline } from './Charts'

export interface MetricDelta {
  /** Signed fraction: 0.124 renders as +12.4%. */
  fraction: number
  /** What the comparison is against, already translated. */
  note: string
}

interface MetricCardProps {
  label: string
  value: string | number
  icon: string
  to: string
  linkLabel: string
  loading?: boolean
  /**
   * The one filled card. Exactly one per row: four equally loud cards make
   * the reader rank four equals, and four different hues was the version that
   * failed the colour-separation gates (see tokens.css).
   */
  lead?: boolean
  delta?: MetricDelta | null
  /**
   * Shown in the delta's place when there is nothing to compare against. The
   * course and student figures are running totals with no history behind
   * them, and saying so is better than leaving the row ragged or implying a
   * period the number does not cover.
   */
  caption?: string
  /** Sparkline values, oldest first. Omitted where no series exists - the
   *  dashboard has no history for course or student counts, and inventing a
   *  flat line for them would read as real data. */
  trend?: number[]
  /** Whether a rise is the good direction, which decides the delta's colour. */
  goodWhenUp?: boolean
  rtl: boolean
}

export default function MetricCard({
  label, value, icon, to, linkLabel, loading = false, lead = false,
  delta, caption, trend, goodWhenUp = true, rtl,
}: MetricCardProps) {
  const { t, i18n } = useTranslation()

  const direction = !delta || Math.abs(delta.fraction) < 0.0005 ? 'flat' : delta.fraction > 0 ? 'up' : 'down'
  // Colour is direction x whether up is good, so "bookings down" and "refunds
  // up" can both be the red one.
  const tone = direction === 'flat' ? 'flat' : (direction === 'up') === goodWhenUp ? 'up' : 'down'

  const percent = delta
    ? new Intl.NumberFormat(i18n.resolvedLanguage === 'ar' ? 'ar-u-nu-latn' : 'en-GB', {
        style: 'percent',
        maximumFractionDigits: 1,
        signDisplay: 'exceptZero',
      }).format(delta.fraction)
    : ''

  return (
    <article className={`lmsd-surface lmsd-metric${lead ? ' lmsd-metric--lead' : ''}`}>
      <div className="lmsd-metric-top">
        <span className="lmsd-chip"><i className={icon} aria-hidden="true" /></span>
        <div style={{ minWidth: 0 }}>
          <p className="lmsd-eyebrow">{label}</p>
          {loading
            ? <span className="lmsd-skel" style={{ width: 92, height: 28, marginTop: 10 }} />
            : <p className="lmsd-value">{value}</p>}
        </div>
      </div>

      {!loading && delta && (
        <p className={`lmsd-delta lmsd-delta--${tone}`}>
          {/* The glyph carries the direction as well as the colour. */}
          <i
            className={`fas fa-arrow-${direction === 'flat' ? 'right' : direction}`}
            aria-hidden="true"
          />
          <span>{direction === 'flat' ? t('dashboard.no_change') : percent}</span>
          <span className="lmsd-delta-note">{delta.note}</span>
        </p>
      )}

      {!loading && !delta && caption && (
        <p className="lmsd-delta lmsd-delta--flat">
          <span className="lmsd-delta-note">{caption}</span>
        </p>
      )}

      {!loading && trend && trend.length > 1
        ? <Sparkline values={trend} rtl={rtl} tone={lead ? 'on-dark' : 'brand'} />
        : <span style={{ marginTop: 'auto' }} />}

      <Link to={to} className="lmsd-metric-foot">
        {linkLabel}
        <i className="fas fa-arrow-right" aria-hidden="true" />
      </Link>
    </article>
  )
}
