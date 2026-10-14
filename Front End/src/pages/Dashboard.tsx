import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useFormat, formatMonthLong, formatMonthShort } from '../format'
import { getDashboardStats } from '../api/dashboard'
import { getEnrollments } from '../api/enrollments'
import { getBookings } from '../api/bookings'
import { useAuth } from '../context/AuthContext'
import MetricCard from '../components/ui/MetricCard'
import StatusPill from '../components/ui/StatusPill'
import { ChartPanel } from '../components/ui/Charts'
import { alignSeries, monthAxis, periodDelta } from '../components/ui/scale'
import type { DashboardStats, DashboardBooking, TopCourse, Enrollment, Booking } from '../types'
import '../styles/dashboard.css'

/** Initials for the table's avatar tiles. Same rule as the navbar's. */
const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'

/** Reads the writing direction for the charts, which have to lay their time
 *  axis out by hand - SVG has no `dir`. */
function useRtl() {
  const { i18n } = useTranslation()
  return i18n.dir() === 'rtl'
}

function PanelHead({ icon, title, sub, action }: {
  icon: string
  title: string
  sub?: string
  action?: { to: string; label: string }
}) {
  return (
    <header className="lmsd-panel-head">
      <span className="lmsd-chip"><i className={icon} aria-hidden="true" /></span>
      <div className="lmsd-panel-heading">
        <h2 className="lmsd-panel-title">{title}</h2>
        {sub && <p className="lmsd-panel-sub">{sub}</p>}
      </div>
      {action && (
        <div className="lmsd-panel-tools">
          <Link to={action.to} className="lmsd-tool">
            {action.label}
            <i className="fas fa-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      )}
    </header>
  )
}

function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }, (_, c) => (
            <td key={c}><span className="lmsd-skel" style={{ height: 13, width: c === 0 ? '70%' : '48%' }} /></td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

function EmptyRow({ cols, icon, label }: { cols: number; icon: string; label: string }) {
  return (
    <tbody>
      <tr>
        <td colSpan={cols}>
          <div className="lmsd-empty">
            <i className={icon} aria-hidden="true" />
            {label}
          </div>
        </td>
      </tr>
    </tbody>
  )
}

/* ------------------------------------------------------------------- admin */

function AdminDashboard() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const rtl = useRtl()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      // A key, not a sentence - see the same note in Courses.tsx.
      .catch(() => setError('dashboard.load_failed'))
      .finally(() => setLoading(false))
  }, [])

  /**
   * One month axis for both panels.
   *
   * The two series come from different filters - revenue counts paid bookings
   * only - so a month with nothing paid is simply missing from
   * `monthly_revenue`. Projecting both onto a shared, gap-filled axis is what
   * keeps the panels comparable and stops a missing month from closing up and
   * flattening the slope either side of it.
   */
  const { locale } = fmt
  const { revenue, bookings } = useMemo(() => {
    const short = (key: string) => formatMonthShort(key, locale)
    const long = (key: string) => formatMonthLong(key, locale)
    const keys = monthAxis(stats?.monthly_revenue ?? [], stats?.monthly_bookings ?? [])
    return {
      revenue: alignSeries(keys, stats?.monthly_revenue, (r) => r.revenue, short, long),
      bookings: alignSeries(keys, stats?.monthly_bookings, (r) => r.count, short, long),
    }
    // Keyed on the locale, not on `fmt`: useFormat returns a new object every
    // render, so the axis labels follow a language switch without the memo
    // being rebuilt on every unrelated render.
  }, [stats, locale])

  const revenueDelta = periodDelta(revenue)
  const bookingsDelta = periodDelta(bookings)
  const rangeLabel = revenue.length
    ? t('dashboard.window_months', { months: revenue.length })
    : t('dashboard.window_none')

  return (
    <div className="lmsd">
      {error && (
        <div className="lmsd-note lmsd-note--warn" role="alert">
          <span className="lmsd-chip"><i className="fas fa-exclamation-triangle" aria-hidden="true" /></span>
          <span className="lmsd-note-text">{t(error)}</span>
        </div>
      )}

      <div className="lmsd-metrics">
        <MetricCard
          label={t('dashboard.total_courses')}
          value={loading ? '' : fmt.count(stats?.total_courses ?? 0)}
          caption={t('dashboard.all_time')}
          icon="fas fa-book"
          to="/courses"
          linkLabel={t('dashboard.manage_courses')}
          loading={loading}
          rtl={rtl}
        />
        <MetricCard
          label={t('dashboard.total_bookings')}
          value={loading ? '' : fmt.count(stats?.total_bookings ?? 0)}
          icon="fas fa-calendar-check"
          to="/bookings"
          linkLabel={t('dashboard.view_bookings')}
          loading={loading}
          delta={bookingsDelta ? { fraction: bookingsDelta.fraction, note: t('dashboard.month_on_month') } : null}
          caption={t('dashboard.all_time')}
          trend={bookings.map((p) => p.value)}
          rtl={rtl}
        />
        <MetricCard
          label={t('dashboard.total_students')}
          value={loading ? '' : fmt.count(stats?.total_users ?? 0)}
          caption={t('dashboard.all_time')}
          icon="fas fa-user-graduate"
          to="/students"
          linkLabel={t('dashboard.manage_students')}
          loading={loading}
          rtl={rtl}
        />
        {/* The filled card. Revenue leads because it is the figure the rest of
            the dashboard explains. */}
        <MetricCard
          lead
          label={t('dashboard.total_revenue')}
          value={loading ? '' : fmt.money(stats?.total_revenue ?? 0)}
          icon="fas fa-coins"
          to="/bookings"
          linkLabel={t('dashboard.view_payments')}
          loading={loading}
          delta={revenueDelta ? { fraction: revenueDelta.fraction, note: t('dashboard.month_on_month') } : null}
          caption={t('dashboard.all_time')}
          trend={revenue.map((p) => p.value)}
          rtl={rtl}
        />
      </div>

      {/* Two panels, not two series on one plot. Money and counts have no
          shared scale, and putting them on twin axes invents a correlation
          the data does not contain. */}
      <div className="lmsd-row">
        <ChartPanel
          icon="fas fa-chart-area"
          title={t('dashboard.revenue_trend')}
          sub={rangeLabel}
          seriesLabel={t('dashboard.revenue_axis')}
          points={revenue}
          kind="area"
          formatValue={fmt.money}
          formatTick={fmt.moneyCompact}
          loading={loading}
          emptyLabel={t('dashboard.no_revenue_yet')}
          rtl={rtl}
        />
        <ChartPanel
          icon="fas fa-chart-bar"
          title={t('dashboard.bookings_trend')}
          sub={rangeLabel}
          seriesLabel={t('dashboard.bookings_axis')}
          points={bookings}
          kind="column"
          formatValue={fmt.count}
          formatTick={fmt.count}
          loading={loading}
          emptyLabel={t('dashboard.no_bookings_yet')}
          rtl={rtl}
        />
      </div>

      <div className="lmsd-row lmsd-row--split">
        <section className="lmsd-surface lmsd-panel">
          <PanelHead
            icon="fas fa-receipt"
            title={t('dashboard.recent_bookings')}
            sub={t('dashboard.latest_n', { n: stats?.recent_bookings?.length ?? 0 })}
            action={{ to: '/bookings', label: t('common.view_all') }}
          />
          <div className="lmsd-scroll">
            <table className="lmsd-table">
              <thead>
                <tr>
                  <th>{t('bookings.col.student')}</th>
                  <th>{t('bookings.col.course')}</th>
                  <th className="lmsd-th-num">{t('bookings.col.amount')}</th>
                  <th>{t('bookings.col.status')}</th>
                  <th>{t('bookings.col.date')}</th>
                </tr>
              </thead>
              {loading ? <TableSkeleton rows={5} cols={5} /> : !stats?.recent_bookings?.length ? (
                <EmptyRow cols={5} icon="far fa-calendar" label={t('dashboard.no_bookings_yet')} />
              ) : (
                <tbody>
                  {stats.recent_bookings.map((b: DashboardBooking) => (
                    <tr key={b.id}>
                      <td data-lead className="lmsd-cell-lead">
                        <div className="lmsd-who">
                          <span className="lmsd-avatar" aria-hidden="true">
                            {initialsOf(b.student?.name ?? '?')}
                          </span>
                          <span style={{ minWidth: 0 }}>
                            <span className="lmsd-strong">{b.student?.name ?? `#${b.student_id}`}</span>
                            <span className="lmsd-sub">{t('dashboard.booking_ref', { id: b.id })}</span>
                          </span>
                        </div>
                      </td>
                      <td className="lmsd-cell-wide" data-label={t('bookings.col.course')}>
                        <span className="lmsd-strong">{b.course?.title ?? `#${b.course_id}`}</span>
                      </td>
                      <td className="lmsd-num" data-label={t('bookings.col.amount')}>{fmt.money(b.amount)}</td>
                      <td data-label={t('bookings.col.status')}><StatusPill status={b.status} /></td>
                      <td data-label={t('bookings.col.date')}>
                        {fmt.date(b.booked_at, t('common.none'))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </section>

        <section className="lmsd-surface lmsd-panel">
          <PanelHead
            icon="fas fa-award"
            title={t('dashboard.top_courses')}
            sub={t('dashboard.by_enrolment')}
          />
          <div className="lmsd-scroll">
            <table className="lmsd-table">
              <thead>
                <tr>
                  <th>{t('courses.col.title')}</th>
                  <th>{t('dashboard.col_seats')}</th>
                  <th>{t('bookings.col.status')}</th>
                </tr>
              </thead>
              {loading ? <TableSkeleton rows={5} cols={3} /> : !stats?.top_courses?.length ? (
                <EmptyRow cols={3} icon="far fa-folder-open" label={t('dashboard.no_courses_yet')} />
              ) : (
                <tbody>
                  {stats.top_courses.map((c: TopCourse, i) => (
                    <tr key={c.id}>
                      <td data-lead className="lmsd-cell-lead">
                        <div className="lmsd-who">
                          <span className={`lmsd-rank${i === 0 ? ' lmsd-rank--first' : ''}`}>{i + 1}</span>
                          <span style={{ minWidth: 0 }}>
                            <Link to={`/courses/${c.id}/edit`} className="lmsd-strong">{c.title}</Link>
                            <span className="lmsd-sub">
                              {c.instructor?.name ?? t('common.none')}
                              {' · '}
                              {`⁨${fmt.money(c.price)}⁩`}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td data-label={t('dashboard.col_seats')}>
                        <SeatMeter enrolled={c.enrolled_count} capacity={c.capacity} />
                      </td>
                      <td data-label={t('bookings.col.status')}><StatusPill status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
          <div className="lmsd-panel-foot">
            <Link to="/courses">{t('dashboard.view_all_courses')}</Link>
          </div>
        </section>
      </div>
    </div>
  )
}

/**
 * Seats taken against capacity.
 *
 * The track is a lighter step of the fill's own ramp so the state reads across
 * the whole bar, and the fill shifts to amber then red as seats run out. The
 * figures above it say the same thing in words, which is what lets the colour
 * be reinforcement rather than the only signal.
 */
function SeatMeter({ enrolled, capacity }: { enrolled: number; capacity: number }) {
  const { t } = useTranslation()
  const fmt = useFormat()
  const ratio = capacity > 0 ? enrolled / capacity : 0
  const pct = Math.min(100, Math.max(0, ratio * 100))
  const tone = ratio >= 1 ? ' lmsd-meter--full' : ratio >= 0.8 ? ' lmsd-meter--warn' : ''

  return (
    <div className="lmsd-meter-wrap">
      <div className="lmsd-meter-label">
        {/* One isolated run, not two loose numbers: inside an Arabic sentence
            the spaces and the slash are neutral, so "4 / 35" resolves to the
            paragraph direction and displays as "35 / 4". U+2068/U+2069
            (FSI...PDI) is the standard fix for interpolating data of unknown
            direction into localized text. */}
        <b>{`⁨${fmt.count(enrolled)} / ${fmt.count(capacity)}⁩`}</b>
      </div>
      <div
        className={`lmsd-meter${tone}`}
        role="progressbar"
        aria-valuenow={enrolled}
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-label={t('dashboard.col_seats')}
      >
        <div className="lmsd-meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- instructor */

function InstructorDashboard() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getEnrollments({ per_page: 10 })
      .then((r) => { setEnrollments(r.data.data); setTotal(r.data.total) })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="lmsd">
      <div className="lmsd-note">
        <span className="lmsd-chip"><i className="fas fa-chalkboard-teacher" aria-hidden="true" /></span>
        <span className="lmsd-note-text">{t('dashboard.welcome_instructor', { name: user?.name ?? '' })}</span>
        <Link to="/courses" className="lmsd-note-link">
          {t('nav.my_courses')}
          <i className="fas fa-arrow-right" aria-hidden="true" />
        </Link>
      </div>

      <section className="lmsd-surface lmsd-panel">
        <PanelHead
          icon="fas fa-user-plus"
          title={t('dashboard.recent_enrollments_mine')}
          /* The count is the paginated total, not the ten rows below it. */
          sub={loading ? t('common.loading') : t('common.total_count', { count: total })}
          action={{ to: '/enrollments', label: t('common.view_all') }}
        />
        <div className="lmsd-scroll">
          <table className="lmsd-table">
            <thead>
              <tr>
                <th>{t('enrollments.col.student')}</th>
                <th>{t('enrollments.col.course')}</th>
                <th>{t('enrollments.col.enrolled_at')}</th>
                <th>{t('enrollments.col.status')}</th>
              </tr>
            </thead>
            {loading ? <TableSkeleton rows={5} cols={4} /> : !enrollments.length ? (
              <EmptyRow cols={4} icon="far fa-user" label={t('dashboard.no_enrollments_yet')} />
            ) : (
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id}>
                    <td data-lead>
                      <div className="lmsd-who">
                        <span className="lmsd-avatar" aria-hidden="true">{initialsOf(e.student?.name ?? '?')}</span>
                        <span className="lmsd-strong">{e.student?.name ?? `#${e.student_id}`}</span>
                      </div>
                    </td>
                    <td className="lmsd-cell-wide" data-label={t('enrollments.col.course')}>
                      <span className="lmsd-strong">{e.course?.title ?? `#${e.course_id}`}</span>
                    </td>
                    <td data-label={t('enrollments.col.enrolled_at')}>
                      {fmt.date(e.enrolled_at, t('common.none'))}
                    </td>
                    <td data-label={t('enrollments.col.status')}><StatusPill status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </section>
    </div>
  )
}

/* ----------------------------------------------------------------- student */

function StudentDashboard() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const rtl = useRtl()
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [totals, setTotals] = useState({ bookings: 0, enrollments: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getBookings({ per_page: 10 }),
      getEnrollments({ per_page: 10 }),
    ])
      .then(([b, e]) => {
        setBookings(b.data.data)
        setEnrollments(e.data.data)
        // `total` from the pagination envelope, not `data.length`: the old
        // cards counted the ten rows on the first page and called it "My
        // bookings", so an eleventh booking never showed up in the figure.
        setTotals({ bookings: b.data.total, enrollments: e.data.total })
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="lmsd">
      <div className="lmsd-note">
        <span className="lmsd-chip"><i className="fas fa-graduation-cap" aria-hidden="true" /></span>
        <span className="lmsd-note-text">{t('dashboard.welcome_student', { name: user?.name ?? '' })}</span>
        <Link to="/courses" className="lmsd-note-link">
          {t('dashboard.browse_courses')}
          <i className="fas fa-arrow-right" aria-hidden="true" />
        </Link>
      </div>

      <div className="lmsd-metrics lmsd-metrics--two">
        <MetricCard
          label={t('dashboard.my_bookings')}
          value={loading ? '' : fmt.count(totals.bookings)}
          caption={t('dashboard.all_time')}
          icon="fas fa-calendar-check"
          to="/bookings"
          linkLabel={t('common.view_all')}
          loading={loading}
          rtl={rtl}
        />
        <MetricCard
          lead
          label={t('dashboard.my_enrollments')}
          value={loading ? '' : fmt.count(totals.enrollments)}
          caption={t('dashboard.all_time')}
          icon="fas fa-book-open"
          to="/enrollments"
          linkLabel={t('common.view_all')}
          loading={loading}
          rtl={rtl}
        />
      </div>

      <div className="lmsd-row">
        <section className="lmsd-surface lmsd-panel">
          <PanelHead
            icon="fas fa-receipt"
            title={t('dashboard.my_bookings')}
            action={{ to: '/bookings', label: t('common.view_all') }}
          />
          <div className="lmsd-scroll">
            <table className="lmsd-table">
              <thead>
                <tr>
                  <th>{t('bookings.col.course')}</th>
                  <th className="lmsd-th-num">{t('bookings.col.amount')}</th>
                  <th>{t('bookings.col.status')}</th>
                  <th>{t('bookings.col.payment')}</th>
                </tr>
              </thead>
              {loading ? <TableSkeleton rows={4} cols={4} /> : !bookings.length ? (
                <EmptyRow cols={4} icon="far fa-calendar" label={t('dashboard.no_bookings_yet')} />
              ) : (
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td data-lead>
                        <span className="lmsd-strong">{b.course?.title ?? `#${b.course_id}`}</span>
                        <span className="lmsd-sub">{t('dashboard.booking_ref', { id: b.id })}</span>
                      </td>
                      <td className="lmsd-num" data-label={t('bookings.col.amount')}>{fmt.money(b.amount)}</td>
                      <td data-label={t('bookings.col.status')}><StatusPill status={b.status} /></td>
                      <td data-label={t('bookings.col.payment')}><StatusPill status={b.payment_status} /></td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </section>

        <section className="lmsd-surface lmsd-panel">
          <PanelHead
            icon="fas fa-book-open"
            title={t('dashboard.my_enrollments')}
            action={{ to: '/enrollments', label: t('common.view_all') }}
          />
          <div className="lmsd-scroll">
            <table className="lmsd-table">
              <thead>
                <tr>
                  <th>{t('enrollments.col.course')}</th>
                  <th>{t('enrollments.col.enrolled_at')}</th>
                  <th>{t('enrollments.col.status')}</th>
                </tr>
              </thead>
              {loading ? <TableSkeleton rows={4} cols={3} /> : !enrollments.length ? (
                <EmptyRow cols={3} icon="far fa-folder-open" label={t('dashboard.no_enrollments_yet')} />
              ) : (
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id}>
                      <td data-lead><span className="lmsd-strong">{e.course?.title ?? `#${e.course_id}`}</span></td>
                      <td data-label={t('enrollments.col.enrolled_at')}>
                        {fmt.date(e.enrolled_at, t('common.none'))}
                      </td>
                      <td data-label={t('enrollments.col.status')}><StatusPill status={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- page */

export default function Dashboard() {
  const { t } = useTranslation()
  const { isAdmin, isInstructor, isStudent, user } = useAuth()

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">{t('dashboard.title')}</h1>
              {user?.name && <p className="lmsd-panel-sub">{t('dashboard.greeting', { name: user.name })}</p>}
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/">{t('common.home')}</Link></li>
                <li className="breadcrumb-item active">{t('dashboard.title')}</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {isAdmin && <AdminDashboard />}
          {isInstructor && <InstructorDashboard />}
          {isStudent && <StudentDashboard />}
        </div>
      </section>
    </>
  )
}
