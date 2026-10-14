/**
 * Chart arithmetic, kept away from the drawing code so it can be reasoned
 * about (and tested) without a DOM.
 */

/**
 * One plotted position.
 *
 * Two labels, because the axis and the readout need different widths: `label`
 * has to fit six of itself across a card ("Jul"), while `fullLabel` has to be
 * unambiguous when the window crosses a year ("July 2026"). The tooltip, the
 * table view and the chart's accessible summary all use the long one.
 */
export interface TrendPoint {
  key: string
  label: string
  fullLabel?: string
  value: number
}

/**
 * A y-axis that stops on a round number.
 *
 * Fitting the axis to the data's exact maximum is what produces ticks like
 * "$3,417" - true, unreadable, and impossible to compare between the two
 * panels. This rounds the top up to 1/2/2.5/5 x a power of ten so the ticks
 * land on values a reader can hold in their head.
 */
export function niceScale(max: number, tickCount = 4): { max: number; ticks: number[] } {
  if (!Number.isFinite(max) || max <= 0) {
    // An all-zero series still needs an axis, or the baseline has no scale
    // beside it and the empty chart looks broken rather than empty.
    return { max: 1, ticks: [0, 1] }
  }
  const raw = max / tickCount
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
  const top = step * tickCount
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v)
  return { max: top, ticks }
}

/** `2026-07` -> `{ year: 2026, month: 7 }`; null for anything else. */
function parseMonthKey(key: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key)
  if (!m) return null
  const month = Number(m[2])
  if (month < 1 || month > 12) return null
  return { year: Number(m[1]), month }
}

const keyOf = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`

/**
 * The shared month axis for the two trend panels.
 *
 * The API answers the two series from different filters - revenue counts paid
 * bookings only, the booking count counts all of them - so a month with
 * nothing paid in it is simply absent from `monthly_revenue`. Plotting the
 * rows as they arrive is what the old dashboard did, and it silently lies
 * twice: the two panels end up with different numbers of columns, and a gap
 * month closes up so the line's slope spans two months while looking like
 * one.
 *
 * So: take every month either series mentions, and fill the range in. A month
 * with no row is a real zero and is drawn as one.
 */
export function monthAxis(...series: { month: string }[][]): string[] {
  const seen = series
    .flat()
    .map((r) => parseMonthKey(r.month))
    .filter((p): p is { year: number; month: number } => p !== null)
    .sort((a, b) => a.year - b.year || a.month - b.month)

  if (!seen.length) return []

  const first = seen[0]
  const last = seen[seen.length - 1]
  const keys: string[] = []
  let { year, month } = first
  // Bounded by construction (last >= first), but cap it anyway rather than
  // trust that: a malformed pair must not spin here.
  for (let i = 0; i < 240; i++) {
    keys.push(keyOf(year, month))
    if (year === last.year && month === last.month) break
    month += 1
    if (month > 12) { month = 1; year += 1 }
  }
  return keys
}

/** Projects API rows onto the axis, with a 0 wherever a month has no row. */
export function alignSeries<T extends { month: string }>(
  keys: string[],
  rows: T[] | undefined,
  valueOf: (row: T) => number,
  labelOf: (key: string) => string,
  fullLabelOf?: (key: string) => string,
): TrendPoint[] {
  const byMonth = new Map((rows ?? []).map((r) => [r.month, valueOf(r)]))
  return keys.map((key) => ({
    key,
    label: labelOf(key),
    fullLabel: fullLabelOf?.(key),
    value: byMonth.get(key) ?? 0,
  }))
}

/**
 * Period-over-period change, as a fraction (0.12 = +12%).
 *
 * Returns null rather than a number whenever the comparison would be
 * meaningless - fewer than two periods, or a zero baseline, where the honest
 * answer is "no comparison", not "+100%" or "infinity".
 */
export function periodDelta(points: TrendPoint[]): { fraction: number; from: number; to: number } | null {
  if (points.length < 2) return null
  const to = points[points.length - 1].value
  const from = points[points.length - 2].value
  if (from === 0) return null
  return { fraction: (to - from) / from, from, to }
}

/** Index of the largest value, for the single direct label on a column chart. */
export function peakIndex(points: TrendPoint[]): number {
  let best = -1
  let bestValue = -Infinity
  points.forEach((p, i) => {
    if (p.value > bestValue) { bestValue = p.value; best = i }
  })
  return best
}

/**
 * An SVG path for a bar with a rounded data-end and a square baseline.
 *
 * `r` is clamped to both half the width and the full height, so a very short
 * bar degrades to a shallow curve instead of inverting its own corners.
 */
export function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  const radius = Math.max(0, Math.min(r, w / 2, h))
  const bottom = y + h
  return [
    `M${x},${bottom}`,
    `L${x},${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `L${x + w - radius},${y}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `L${x + w},${bottom}`,
    'Z',
  ].join(' ')
}
