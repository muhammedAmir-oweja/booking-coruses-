import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { barPath, niceScale, peakIndex, type TrendPoint } from './scale'

/**
 * Hand-drawn SVG rather than a charting library, for two reasons: the app
 * ships no chart dependency today and a trend line is a hundred lines of
 * arithmetic, and a library's default output would have to be fought back to
 * the mark specs this file implements anyway.
 *
 * What every chart in here guarantees:
 *   - A hover layer AND the same information on keyboard focus. Arrow keys
 *     walk the points; the active one is announced through a live region.
 *   - A table view, reachable from the panel header. The tooltip is never the
 *     only way to read a value.
 *   - RTL: the time axis runs right-to-left under `dir="rtl"`, because that
 *     is the direction an Arabic reader scans. The arrow keys follow the
 *     SCREEN - right arrow always moves right - so navigation still matches
 *     what the eye is doing, which means it walks backwards through time in
 *     Arabic. Both of those are deliberate.
 */

const PAD = { top: 22, bottom: 30, axis: 52, gutter: 16 }

/**
 * How much room the y-axis labels need.
 *
 * A fixed gutter was wrong as soon as the app was read in Arabic: "US$40k"
 * fits 52px, but the same tick in Arabic is "40 ألف US$" - half as wide
 * again - so the labels ran back over the plot. Measured off the longest
 * formatted tick at the axis font size, with a floor so short ticks still get
 * a sensible margin and a ceiling so one freak label cannot eat the chart.
 */
function axisWidth(labels: string[]): number {
  const longest = labels.reduce((n, s) => Math.max(n, s.length), 0)
  return Math.min(104, Math.max(PAD.axis, longest * 6.9 + 14))
}

/** Measures the container so marks can be drawn in real pixels. A viewBox
 *  scaled with `preserveAspectRatio` would stretch the 2px strokes and the
 *  type along with the plot. */
function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // Measure once up front: waiting for the observer's first callback would
    // paint one empty frame on load.
    setWidth(el.clientWidth)
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, width] as const
}

/* ------------------------------------------------------------------ sparkline */

/**
 * The trend texture at the foot of a metric card. Supplementary by design -
 * no axes, no labels, `aria-hidden` - because the number beside it and the
 * full panel below it already carry the data. The stroke is a de-emphasis
 * step of the brand ramp with only the latest point in the accent, so the eye
 * lands on "now".
 */
export function Sparkline({ values, rtl, tone = 'brand', height = 42 }: {
  values: number[]
  rtl: boolean
  tone?: 'brand' | 'on-dark'
  height?: number
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const gid = 'sp' + useId().replace(/[^a-zA-Z0-9]/g, '')

  const stroke = tone === 'on-dark' ? 'rgba(255,255,255,.55)' : 'var(--brand-250)'
  const dot = tone === 'on-dark' ? '#ffffff' : 'var(--brand-450)'
  const wash = tone === 'on-dark' ? '#ffffff' : 'var(--brand-450)'
  const ring = tone === 'on-dark' ? 'var(--brand-550)' : 'var(--surface)'

  const inset = 5
  const plotW = Math.max(0, width - inset * 2)
  const plotH = height - inset * 2
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const span = max - min || 1

  const at = (i: number) => {
    const t = values.length === 1 ? 0.5 : i / (values.length - 1)
    return {
      x: inset + (rtl ? 1 - t : t) * plotW,
      y: inset + (1 - (values[i] - min) / span) * plotH,
    }
  }

  const pts = values.map((_, i) => at(i)).sort((a, b) => a.x - b.x)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = pts.length
    ? `${line} L${pts[pts.length - 1].x.toFixed(1)},${height} L${pts[0].x.toFixed(1)},${height} Z`
    : ''
  const last = at(values.length - 1)

  return (
    <div ref={ref} className="lmsd-spark" aria-hidden="true">
      {width > 0 && values.length > 1 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={wash} stopOpacity={tone === 'on-dark' ? 0.22 : 0.16} />
              <stop offset="100%" stopColor={wash} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gid})`} />
          <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={last.x} cy={last.y} r="3.5" fill={dot} stroke={ring} strokeWidth="2" />
        </svg>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- trend chart */

interface TrendChartProps {
  points: TrendPoint[]
  kind: 'area' | 'column'
  /** Full precision, for the tooltip and the one direct label. */
  formatValue: (n: number) => string
  /** Compact, for the axis ticks. */
  formatTick: (n: number) => string
  seriesLabel: string
  rtl: boolean
  height?: number
}

function TrendChart({ points, kind, formatValue, formatTick, seriesLabel, rtl, height = 236 }: TrendChartProps) {
  const { t } = useTranslation()
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const gid = 'tr' + useId().replace(/[^a-zA-Z0-9]/g, '')

  const n = points.length
  const { max, ticks } = niceScale(Math.max(...points.map((p) => p.value), 0))

  // The y axis sits on the inline-start edge, which is the right-hand side in
  // Arabic, so the plot's own margins swap with the writing direction.
  const tickLabels = ticks.map(formatTick)
  const axis = axisWidth(tickLabels)
  const padStart = rtl ? PAD.gutter : axis
  const padEnd = rtl ? axis : PAD.gutter
  const plotW = Math.max(0, width - padStart - padEnd)
  const plotH = height - PAD.top - PAD.bottom
  const band = n > 0 ? plotW / n : 0

  const yOf = (v: number) => PAD.top + (1 - v / max) * plotH
  const xOf = (i: number) => {
    // A line is anchored to the edges; columns sit in the middle of a band.
    const t = kind === 'column'
      ? (i + 0.5) / Math.max(n, 1)
      : (n === 1 ? 0.5 : i / (n - 1))
    return padStart + (rtl ? 1 - t : t) * plotW
  }
  /** Inline-start edge of point i's hit band, in screen order. */
  const bandStart = (i: number) => padStart + (rtl ? (n - 1 - i) : i) * band

  const move = useCallback((step: number) => {
    setActive((cur) => {
      // The first press lands on the newest month rather than moving from an
      // arbitrary end; after that, `step` is a SCREEN direction, which in RTL
      // is the opposite index step.
      if (cur === null) return n - 1
      const delta = rtl ? -step : step
      return Math.max(0, Math.min(n - 1, cur + delta))
    })
  }, [n, rtl])

  const onKeyDown = (e: ReactKeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight') { move(1); e.preventDefault() }
    else if (e.key === 'ArrowLeft') { move(-1); e.preventDefault() }
    else if (e.key === 'Home') { setActive(0); e.preventDefault() }
    else if (e.key === 'End') { setActive(n - 1); e.preventDefault() }
    else if (e.key === 'Escape') setActive(null)
  }

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - box.left
    if (band <= 0) return
    // The crosshair snaps to the nearest band, so the reader aims at a month
    // rather than at a 2px line.
    const raw = Math.floor((x - padStart) / band)
    const idx = rtl ? n - 1 - raw : raw
    setActive(Math.max(0, Math.min(n - 1, idx)))
  }

  const ready = width > 0 && n > 0
  const peak = kind === 'column' ? peakIndex(points) : -1
  const labelled = kind === 'column' ? peak : n - 1   // the newest month, either direction
  // With many months on a narrow card, every other tick keeps the labels from
  // colliding instead of letting them overlap.
  const tickEvery = band > 0 && band < 38 ? 2 : 1

  const activePoint = active !== null ? points[active] : null
  const readout = (p: TrendPoint) => p.fullLabel ?? p.label
  const summary = t('dashboard.chart_summary', {
    series: seriesLabel,
    months: n,
    first: points[0] ? readout(points[0]) : '',
    last: points[n - 1] ? readout(points[n - 1]) : '',
    peak: formatValue(Math.max(...points.map((p) => p.value), 0)),
  })

  return (
    <div className="lmsd-chart" ref={ref}>
      {ready && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={summary}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerMove={kind === 'area' ? onPointerMove : undefined}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
        >
          <defs>
            {/* A wash, not a block: ~13% at the line fading to nothing at the
                baseline. */}
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-450)" stopOpacity="0.13" />
              <stop offset="100%" stopColor="var(--brand-450)" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Gridlines: solid hairlines one step off the surface. Dashes read
              as a threshold or a projection when this is only a grid. */}
          {ticks.map((v, ti) => (
            <g key={v}>
              <line
                className={v === 0 ? 'lmsd-baseline' : 'lmsd-grid'}
                x1={padStart}
                x2={padStart + plotW}
                y1={yOf(v)}
                y2={yOf(v)}
              />
              {/* `text-anchor` is resolved against the inline base
                  direction, not the screen: under `dir="rtl"` the text's
                  "end" is its LEFT edge. So "end" is the edge facing the plot
                  in BOTH directions - the label hangs left of the plot in
                  English and right of it in Arabic, and neither one grows back
                  over the marks. Anchoring "start" in RTL is what pushed the
                  Arabic ticks across the chart. */}
              <text
                className="lmsd-axis"
                x={rtl ? padStart + plotW + 8 : padStart - 8}
                y={yOf(v) + 3.5}
                textAnchor="end"
              >
                {tickLabels[ti]}
              </text>
            </g>
          ))}

          {kind === 'area' ? (
            <AreaMarks points={points} xOf={xOf} yOf={yOf} gradientId={gid} active={active} />
          ) : (
            points.map((p, i) => {
              const h = Math.max(0, yOf(0) - yOf(p.value))
              // Capped at 24px and never filling its band: the leftover is air.
              const w = Math.min(24, Math.max(4, band * 0.52))
              return (
                <path
                  key={p.key}
                  className={`lmsd-bar${active === i ? ' lmsd-bar--hot' : ''}`}
                  d={barPath(xOf(i) - w / 2, yOf(p.value), w, h)}
                />
              )
            })
          )}

          {/* The single direct label: the latest month on a line, the peak on
              columns. A number on every point goes unread. */}
          {points[labelled] && points[labelled].value > 0 && (
            <text
              className="lmsd-point-label"
              x={xOf(labelled)}
              y={Math.max(12, yOf(points[labelled].value) - (kind === 'column' ? 9 : 13))}
              textAnchor="middle"
            >
              {formatValue(points[labelled].value)}
            </text>
          )}

          {active !== null && kind === 'area' && (
            <line
              className="lmsd-crosshair"
              x1={xOf(active)}
              x2={xOf(active)}
              y1={PAD.top}
              y2={yOf(0)}
            />
          )}

          {points.map((p, i) => (
            (i % tickEvery === 0 || i === n - 1) && (
              <text
                key={p.key}
                className="lmsd-axis lmsd-axis--x"
                x={xOf(i)}
                y={height - 10}
                textAnchor="middle"
              >
                {p.label}
              </text>
            )
          ))}

          {/* Hit bands. Full plot height and at least a band wide, so the
              target is never the painted mark alone. */}
          {kind === 'column' && points.map((p, i) => (
            <rect
              key={p.key}
              className="lmsd-hit"
              x={bandStart(i)}
              y={PAD.top}
              width={band}
              height={plotH}
              onPointerEnter={() => setActive(i)}
            />
          ))}
        </svg>
      )}

      {activePoint && ready && (
        <div
          className="lmsd-tip"
          style={{
            // Clamped so a tooltip on the first or last month stays inside
            // the card instead of being clipped by it.
            left: Math.min(Math.max(xOf(active as number), 62), width - 62),
            top: yOf(activePoint.value),
          }}
        >
          <div className="lmsd-tip-label">{readout(activePoint)}</div>
          <div className="lmsd-tip-value">
            <span className="lmsd-key" />
            {formatValue(activePoint.value)}
          </div>
        </div>
      )}

      {/* Keyboard and screen-reader parity with the hover layer. */}
      <div className="lmsd-sr" role="status" aria-live="polite">
        {activePoint ? `${readout(activePoint)}: ${formatValue(activePoint.value)}` : ''}
      </div>
    </div>
  )
}

/** Split out so the area path is built once, in screen order. */
function AreaMarks({ points, xOf, yOf, gradientId, active }: {
  points: TrendPoint[]
  xOf: (i: number) => number
  yOf: (v: number) => number
  gradientId: string
  active: number | null
}) {
  // Sorted by screen x so the polygon closes correctly in RTL, where the
  // data order runs right to left.
  const pts = points
    .map((p, i) => ({ x: xOf(i), y: yOf(p.value), i }))
    .sort((a, b) => a.x - b.x)
  if (!pts.length) return null

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const floor = yOf(0)
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${floor} L${pts[0].x.toFixed(1)},${floor} Z`
  const newest = points.length - 1

  return (
    <>
      <path d={area} fill={`url(#${gradientId})`} />
      <path className="lmsd-line" d={line} />
      {/* The end marker is always drawn; the active one appears on hover or
          focus. Both carry a 2px ring in the surface colour so they stay
          legible where they sit on the line. */}
      <circle className="lmsd-dot-mark" cx={xOf(newest)} cy={yOf(points[newest].value)} r="4.5" />
      {active !== null && active !== newest && (
        <circle className="lmsd-dot-mark" cx={xOf(active)} cy={yOf(points[active].value)} r="4.5" />
      )}
    </>
  )
}

/* ---------------------------------------------------------------- chart panel */

/**
 * The card a chart lives in: title, the window the numbers cover, and the
 * table-view switch. The switch is the reason the tooltip is allowed to be
 * the nice way to read a value rather than the only way.
 */
export function ChartPanel({
  icon, title, sub, points, kind, formatValue, formatTick, seriesLabel,
  loading, emptyLabel, rtl, viewAll,
}: TrendChartProps & {
  icon: string
  title: string
  sub: string
  loading: boolean
  emptyLabel: string
  viewAll?: { to: string; label: string }
}) {
  const { t } = useTranslation()
  const [asTable, setAsTable] = useState(false)

  return (
    <section className="lmsd-surface lmsd-panel">
      <header className="lmsd-panel-head">
        <span className="lmsd-chip"><i className={icon} aria-hidden="true" /></span>
        <div className="lmsd-panel-heading">
          <h2 className="lmsd-panel-title">{title}</h2>
          <p className="lmsd-panel-sub">{sub}</p>
        </div>
        <div className="lmsd-panel-tools">
          <button
            type="button"
            className="lmsd-tool"
            aria-pressed={asTable}
            onClick={() => setAsTable((v) => !v)}
          >
            <i className={asTable ? 'fas fa-chart-area' : 'fas fa-table'} aria-hidden="true" />
            {asTable ? t('dashboard.view_chart') : t('dashboard.view_table')}
          </button>
          {viewAll && (
            <Link to={viewAll.to} className="lmsd-tool">{viewAll.label}</Link>
          )}
        </div>
      </header>

      <div className="lmsd-panel-body">
        {loading ? (
          <span className="lmsd-skel" style={{ height: 236 }} />
        ) : !points.length ? (
          <div className="lmsd-empty">
            <i className="fas fa-chart-line" aria-hidden="true" />
            {emptyLabel}
          </div>
        ) : asTable ? (
          <table className="lmsd-table">
            <thead>
              <tr>
                <th>{t('dashboard.col_month')}</th>
                <th className="lmsd-th-num">{seriesLabel}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.key}>
                  <td data-label={t('dashboard.col_month')}>{p.fullLabel ?? p.label}</td>
                  <td className="lmsd-num" data-label={seriesLabel}>{formatValue(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <TrendChart
            points={points}
            kind={kind}
            formatValue={formatValue}
            formatTick={formatTick}
            seriesLabel={seriesLabel}
            rtl={rtl}
          />
        )}
      </div>
    </section>
  )
}
