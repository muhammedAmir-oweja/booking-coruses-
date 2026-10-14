import { useTranslation } from 'react-i18next'
import type { Locale } from './prefs'

/**
 * One place for dates and money, because there were three different answers.
 *
 * Before this, Bookings and Profile hardcoded 'en-GB', Dashboard, Courses and
 * StudentForm called toLocaleDateString() with no locale at all - which follows
 * the BROWSER, not the app - and Enrollments printed the raw API string. So the
 * same booking could read "10/10/2026" on one screen and "10 Oct 2026" on the
 * next, and an Arabic user got English dates either way.
 *
 * Two deliberate choices:
 *
 *  - Latin digits in Arabic (`-u-nu-latn`). Arabic normally takes Arabic-Indic
 *    numerals, but this UI already works hard to keep numbers LTR - see the
 *    `.text-ltr` rule in index.css and the note about why it is opt-in - so
 *    switching the digits here would fight the rest of the design. Drop the
 *    `-u-nu-latn` to get ٠١٢٣ instead.
 *
 *  - en-GB for English, day-month-year. That is what the two call sites which
 *    bothered to name a locale had already chosen; en-US would silently reorder
 *    every date that is currently correct.
 */
export const CURRENCY = 'USD'

const tagFor = (locale: Locale) => (locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB')

const DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
const DATE_TIME: Intl.DateTimeFormatOptions = { ...DATE, hour: '2-digit', minute: '2-digit' }

/** Null, undefined and unparseable values render as the caller's placeholder. */
function parse(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(value: string | number | Date | null | undefined, locale: Locale, fallback = '—'): string {
  const d = parse(value)
  return d ? new Intl.DateTimeFormat(tagFor(locale), DATE).format(d) : fallback
}

export function formatDateTime(value: string | number | Date | null | undefined, locale: Locale, fallback = '—'): string {
  const d = parse(value)
  return d ? new Intl.DateTimeFormat(tagFor(locale), DATE_TIME).format(d) : fallback
}

export function formatMoney(amount: number | string | null | undefined, locale: Locale): string {
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat(tagFor(locale), {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n)
}

/**
 * A `YYYY-MM` bucket from the dashboard's monthly aggregates.
 *
 * Built from the parts rather than `new Date('2026-07')`: that string is
 * parsed as UTC midnight, so west of Greenwich it lands in June and every
 * label on the chart is one month early.
 *
 * Two widths, because the axis and the readout want different things - the
 * axis needs to fit six labels across a card, the tooltip and the table need
 * to be unambiguous when the window crosses a year boundary.
 */
function monthDate(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key)
  if (!m) return null
  const month = Number(m[2])
  if (month < 1 || month > 12) return null
  return new Date(Number(m[1]), month - 1, 1)
}

export function formatMonthShort(key: string, locale: Locale): string {
  const d = monthDate(key)
  return d ? new Intl.DateTimeFormat(tagFor(locale), { month: 'short' }).format(d) : key
}

export function formatMonthLong(key: string, locale: Locale): string {
  const d = monthDate(key)
  return d ? new Intl.DateTimeFormat(tagFor(locale), { month: 'long', year: 'numeric' }).format(d) : key
}

/**
 * Axis ticks. Compact from 1,000 up - "$4.2K" rather than "$4,200" - because
 * a tick column is read as a scale, not as a set of exact figures. The exact
 * figure is in the tooltip, the direct label and the table view.
 */
export function formatMoneyCompact(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(tagFor(locale), {
    style: 'currency',
    currency: CURRENCY,
    notation: amount >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: amount >= 1000 ? 1 : 0,
  }).format(amount)
}

export function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(tagFor(locale), {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 10000 ? 1 : 0,
  }).format(value)
}

/** Component-facing: binds the formatters to the active language. */
export function useFormat() {
  const { i18n } = useTranslation()
  const locale = (i18n.resolvedLanguage === 'ar' ? 'ar' : 'en') as Locale
  return {
    locale,
    date: (v: string | number | Date | null | undefined, fallback?: string) => formatDate(v, locale, fallback),
    dateTime: (v: string | number | Date | null | undefined, fallback?: string) => formatDateTime(v, locale, fallback),
    money: (v: number | string | null | undefined) => formatMoney(v, locale),
    moneyCompact: (v: number) => formatMoneyCompact(v, locale),
    count: (v: number) => formatCount(v, locale),
    monthShort: (key: string) => formatMonthShort(key, locale),
    monthLong: (key: string) => formatMonthLong(key, locale),
  }
}
