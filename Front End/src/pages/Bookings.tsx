import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../format'
import Pagination from '../components/ui/Pagination'
import PageHeader from '../components/ui/Page'
import StatusPill from '../components/ui/StatusPill'
import { EmptyRow, TableSkeleton } from '../components/ui/Table'
import { initialsOf } from '../components/ui/identity'
import { getBookings, updateBookingStatus, cancelBooking } from '../api/bookings'
import type { Booking } from '../types'
import { useToast } from '../context/ToastContext'
import { usePreferences } from '../context/PreferencesContext'
import { useAuth } from '../context/AuthContext'

export default function Bookings() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const { prefs } = usePreferences()
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // The spinner is switched on by whatever the user did (paged, filtered,
  // confirmed, cancelled), not inside the effect - that would cascade a render.
  const reload = () => { setLoading(true); setReloadKey(k => k + 1) }
  const goToPage = (p: number) => { setLoading(true); setPage(p) }

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const { data } = await getBookings({
          page,
          per_page: prefs.per_page,
          status: statusFilter || undefined,
          payment_status: paymentFilter || undefined,
        })
        if (cancelled) return
        setBookings(data.data)
        setLastPage(data.last_page)
        setTotal(data.total)
        setError('')
      } catch {
        // A key, not a sentence - see the same note in Courses.tsx.
        if (!cancelled) setError('bookings.load_failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    // A newer request supersedes this one - drop its response on the floor
    // so fast pagination clicks cannot land out of order.
    return () => { cancelled = true }
  }, [page, prefs.per_page, statusFilter, paymentFilter, reloadKey])

  const handleConfirm = async (id: number) => {
    setActionId(id)
    try {
      await updateBookingStatus(id, { status: 'confirmed' })
      showToast(t('bookings.confirmed'))
      reload()
    } catch {
      showToast(t('bookings.confirm_failed'), 'error')
    } finally {
      setActionId(null)
    }
  }

  const handleMarkPaid = async (id: number) => {
    setActionId(id)
    try {
      await updateBookingStatus(id, { payment_status: 'paid' })
      showToast(t('bookings.marked_paid'))
      reload()
    } catch {
      showToast(t('bookings.mark_paid_failed'), 'error')
    } finally {
      setActionId(null)
    }
  }

  const handleCancel = async (id: number) => {
    if (!confirm(t('bookings.cancel_confirm'))) return
    setActionId(id)
    try {
      await cancelBooking(id)
      showToast(t('bookings.cancelled'), 'warning')
      reload()
    } catch {
      showToast(t('bookings.cancel_failed'), 'error')
    } finally {
      setActionId(null)
    }
  }

  const cols = isAdmin ? 7 : 6

  return (
    <section className="content">
      <div className="container-fluid lmsd">
        <PageHeader
          title={t('bookings.title')}
          subtitle={t('common.total_count', { count: total })}
          crumbs={[{ label: t('bookings.title') }]}
        />

        {error && (
          <div className="lmsd-note lmsd-note--warn" role="alert">
            <span className="lmsd-chip"><i className="fas fa-exclamation-triangle" aria-hidden="true" /></span>
            <span className="lmsd-note-text">{t(error)}</span>
          </div>
        )}

        <section className="lmsd-surface lmsd-panel">
          {/* Filters in one row above the table they scope, not crammed into a
              card header beside the title. */}
          <div className="lmsd-toolbar">
            <select
              className="lmsd-select"
              style={{ width: 'auto' }}
              aria-label={t('bookings.col.status')}
              value={statusFilter}
              onChange={(e) => { setLoading(true); setStatusFilter(e.target.value); setPage(1) }}
            >
              <option value="">{t('common.all_statuses')}</option>
              <option value="pending">{t('status.pending')}</option>
              <option value="confirmed">{t('status.confirmed')}</option>
              <option value="cancelled">{t('status.cancelled')}</option>
            </select>
            <select
              className="lmsd-select"
              style={{ width: 'auto' }}
              aria-label={t('bookings.col.payment')}
              value={paymentFilter}
              onChange={(e) => { setLoading(true); setPaymentFilter(e.target.value); setPage(1) }}
            >
              <option value="">{t('bookings.all_payments')}</option>
              <option value="unpaid">{t('status.unpaid')}</option>
              <option value="paid">{t('status.paid')}</option>
              <option value="refunded">{t('status.refunded')}</option>
            </select>
            {(statusFilter || paymentFilter) && (
              <button
                type="button"
                className="lmsd-btn lmsd-btn--ghost"
                onClick={() => { setLoading(true); setStatusFilter(''); setPaymentFilter(''); setPage(1) }}
              >
                <i className="fas fa-times" aria-hidden="true" /> {t('common.clear')}
              </button>
            )}
          </div>

          <div className="lmsd-scroll">
            <table className="lmsd-table">
              <thead>
                <tr>
                  <th>{t('bookings.col.student')}</th>
                  <th>{t('bookings.col.course')}</th>
                  <th className="lmsd-th-num">{t('bookings.col.amount')}</th>
                  <th>{t('bookings.col.status')}</th>
                  <th>{t('bookings.col.payment')}</th>
                  <th>{t('bookings.col.booked_at')}</th>
                  {isAdmin && <th className="lmsd-th-num">{t('common.actions')}</th>}
                </tr>
              </thead>

              {loading ? <TableSkeleton rows={6} cols={cols} /> : !bookings.length ? (
                <EmptyRow cols={cols} icon="far fa-calendar" label={t('bookings.none_found')} />
              ) : (
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td data-lead className="lmsd-cell-lead">
                        <div className="lmsd-who">
                          <span className="lmsd-avatar" aria-hidden="true">
                            {initialsOf(b.student?.name ?? '?')}
                          </span>
                          <span style={{ minWidth: 0 }}>
                            <span className="lmsd-strong">{b.student?.name ?? `#${b.student_id}`}</span>
                            <span className="lmsd-sub">{b.student?.email ?? t('dashboard.booking_ref', { id: b.id })}</span>
                          </span>
                        </div>
                      </td>
                      <td className="lmsd-cell-wide" data-label={t('bookings.col.course')}>
                        <span className="lmsd-strong">{b.course?.title ?? `#${b.course_id}`}</span>
                      </td>
                      <td className="lmsd-num" data-label={t('bookings.col.amount')}>{fmt.money(b.amount)}</td>
                      <td data-label={t('bookings.col.status')}><StatusPill status={b.status} /></td>
                      <td data-label={t('bookings.col.payment')}><StatusPill status={b.payment_status} /></td>
                      <td data-label={t('bookings.col.booked_at')}>{fmt.date(b.booked_at)}</td>
                      {isAdmin && (
                        <td data-label={t('common.actions')}>
                          <div className="lmsd-actions">
                            {b.status === 'pending' && (
                              <button
                                type="button"
                                className="lmsd-iconbtn lmsd-iconbtn--good"
                                title={t('bookings.confirm_title')}
                                aria-label={t('bookings.confirm_title')}
                                disabled={actionId === b.id}
                                onClick={() => handleConfirm(b.id)}
                              >
                                <i className="fas fa-check" aria-hidden="true" />
                              </button>
                            )}
                            {b.payment_status === 'unpaid' && b.status !== 'cancelled' && (
                              <button
                                type="button"
                                className="lmsd-iconbtn"
                                title={t('bookings.mark_paid_title')}
                                aria-label={t('bookings.mark_paid_title')}
                                disabled={actionId === b.id}
                                onClick={() => handleMarkPaid(b.id)}
                              >
                                <i className="fas fa-dollar-sign" aria-hidden="true" />
                              </button>
                            )}
                            {b.status !== 'cancelled' && (
                              <button
                                type="button"
                                className="lmsd-iconbtn lmsd-iconbtn--danger"
                                title={t('bookings.cancel_title')}
                                aria-label={t('bookings.cancel_title')}
                                disabled={actionId === b.id}
                                onClick={() => handleCancel(b.id)}
                              >
                                <i className={actionId === b.id ? 'fas fa-spinner fa-spin' : 'fas fa-ban'} aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>

          <Pagination
            page={page}
            lastPage={lastPage}
            total={total}
            onPage={goToPage}
            onPageSizeChange={() => goToPage(1)}
          />
        </section>
      </div>
    </section>
  )
}
