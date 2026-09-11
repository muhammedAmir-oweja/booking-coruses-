import { useEffect, useState } from 'react'
import { getBookings, updateBookingStatus, cancelBooking } from '../api/bookings'
import type { Booking } from '../types'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const STATUS_BADGES: Record<string, string> = {
  confirmed: 'badge-success',
  pending:   'badge-warning',
  cancelled: 'badge-danger',
}

const PAYMENT_BADGES: Record<string, string> = {
  paid:     'badge-success',
  unpaid:   'badge-warning',
  refunded: 'badge-info',
}

export default function Bookings() {
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
          status: statusFilter || undefined,
          payment_status: paymentFilter || undefined,
        })
        if (cancelled) return
        setBookings(data.data)
        setLastPage(data.last_page)
        setTotal(data.total)
        setError('')
      } catch {
        if (!cancelled) setError('Failed to load bookings.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    // A newer request supersedes this one - drop its response on the floor
    // so fast pagination clicks cannot land out of order.
    return () => { cancelled = true }
  }, [page, statusFilter, paymentFilter, reloadKey])

  const handleConfirm = async (id: number) => {
    setActionId(id)
    try {
      await updateBookingStatus(id, { status: 'confirmed' })
      showToast('Booking confirmed successfully.')
      reload()
    } catch {
      showToast('Failed to confirm booking.', 'error')
    } finally {
      setActionId(null)
    }
  }

  const handleMarkPaid = async (id: number) => {
    setActionId(id)
    try {
      await updateBookingStatus(id, { payment_status: 'paid' })
      showToast('Booking marked as paid.')
      reload()
    } catch {
      showToast('Failed to mark booking as paid.', 'error')
    } finally {
      setActionId(null)
    }
  }

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this booking?')) return
    setActionId(id)
    try {
      await cancelBooking(id)
      showToast('Booking cancelled successfully.', 'warning')
      reload()
    } catch {
      showToast('Failed to cancel booking.', 'error')
    } finally {
      setActionId(null)
    }
  }

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Bookings</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="card">
            <div className="card-header d-flex flex-wrap align-items-center" style={{ gap: 8 }}>
              <h3 className="card-title mr-3">All Bookings</h3>
              <select
                className="form-control form-control-sm"
                style={{ maxWidth: 160 }}
                value={statusFilter}
                onChange={(e) => { setLoading(true); setStatusFilter(e.target.value); setPage(1) }}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                className="form-control form-control-sm"
                style={{ maxWidth: 160 }}
                value={paymentFilter}
                onChange={(e) => { setLoading(true); setPaymentFilter(e.target.value); setPage(1) }}
              >
                <option value="">All Payments</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
              </select>
              <div className="ml-auto">
                <span className="badge badge-info">{total} total</span>
              </div>
            </div>

            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4">
                  <i className="fas fa-spinner fa-spin mr-2" /> Loading...
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center p-4 text-muted">No bookings found.</div>
              ) : (
                <table className="table table-hover table-striped">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Booked At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td>{b.id}</td>
                        <td>
                          <strong>{b.student?.name ?? `#${b.student_id}`}</strong>
                          <br />
                          <small className="text-muted">{b.student?.email}</small>
                        </td>
                        <td>{b.course?.title ?? `#${b.course_id}`}</td>
                        <td>${b.amount.toFixed(2)}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGES[b.status] ?? 'badge-secondary'}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${PAYMENT_BADGES[b.payment_status] ?? 'badge-secondary'}`}>
                            {b.payment_status}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {new Date(b.booked_at).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {isAdmin && b.status === 'pending' && (
                            <button
                              className="btn btn-xs btn-success mr-1"
                              title="Confirm booking"
                              disabled={actionId === b.id}
                              onClick={() => handleConfirm(b.id)}
                            >
                              <i className="fas fa-check" />
                            </button>
                          )}
                          {isAdmin && b.payment_status === 'unpaid' && b.status !== 'cancelled' && (
                            <button
                              className="btn btn-xs btn-info mr-1"
                              title="Mark as paid"
                              disabled={actionId === b.id}
                              onClick={() => handleMarkPaid(b.id)}
                            >
                              <i className="fas fa-dollar-sign" />
                            </button>
                          )}
                          {isAdmin && b.status !== 'cancelled' && (
                            <button
                              className="btn btn-xs btn-danger"
                              title="Cancel booking"
                              disabled={actionId === b.id}
                              onClick={() => handleCancel(b.id)}
                            >
                              {actionId === b.id
                                ? <i className="fas fa-spinner fa-spin" />
                                : <i className="fas fa-times" />
                              }
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {lastPage > 1 && (
              <div className="card-footer clearfix">
                <ul className="pagination pagination-sm m-0 float-right">
                  <li className={`page-item${page === 1 ? ' disabled' : ''}`}>
                    <button className="page-link" onClick={() => goToPage(page - 1)}>«</button>
                  </li>
                  {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                    <li key={p} className={`page-item${p === page ? ' active' : ''}`}>
                      <button className="page-link" onClick={() => goToPage(p)}>{p}</button>
                    </li>
                  ))}
                  <li className={`page-item${page === lastPage ? ' disabled' : ''}`}>
                    <button className="page-link" onClick={() => goToPage(page + 1)}>»</button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
