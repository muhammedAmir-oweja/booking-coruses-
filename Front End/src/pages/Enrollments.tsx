import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getEnrollments, deleteEnrollment, updateEnrollment } from '../api/enrollments'
import type { Enrollment } from '../types'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const STATUS_BADGES: Record<string, string> = {
  confirmed: 'badge-success',
  pending:   'badge-warning',
  cancelled: 'badge-danger',
}

export default function Enrollments() {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // The spinner is switched on by whatever the user did (paged, filtered,
  // changed a status), not inside the effect - that would cascade a render.
  const reload = () => { setLoading(true); setReloadKey(k => k + 1) }
  const goToPage = (p: number) => { setLoading(true); setPage(p) }

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const { data } = await getEnrollments({ page, status: statusFilter || undefined })
        if (cancelled) return
        setEnrollments(data.data)
        setLastPage(data.last_page)
        setTotal(data.total)
        setError('')
      } catch {
        if (!cancelled) setError('Failed to load enrollments.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    // A newer request supersedes this one - drop its response on the floor
    // so fast pagination clicks cannot land out of order.
    return () => { cancelled = true }
  }, [page, statusFilter, reloadKey])

  const handleStatusChange = async (enrollment: Enrollment, status: Enrollment['status']) => {
    setActionId(enrollment.id)
    try {
      await updateEnrollment(enrollment.id, { status })
      showToast(`Enrollment status updated to ${status}.`)
      reload()
    } catch {
      showToast('Failed to update enrollment status.', 'error')
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (enrollment: Enrollment) => {
    if (!confirm(`Remove enrollment of "${enrollment.student?.name}" from "${enrollment.course?.title}"?`)) return
    setActionId(enrollment.id)
    try {
      await deleteEnrollment(enrollment.id)
      showToast('Enrollment removed successfully.')
      reload()
    } catch {
      showToast('Failed to remove enrollment.', 'error')
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
              <h1 className="m-0">Enrollments</h1>
            </div>
            <div className="col-sm-6 text-right">
              {isAdmin && (
                <Link to="/enrollments/new" className="btn btn-primary btn-sm">
                  <i className="fas fa-plus mr-1" /> Enroll Student
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header d-flex align-items-center" style={{ gap: 8 }}>
              <h3 className="card-title mr-3">All Enrollments</h3>
              <select
                className="form-control form-control-sm"
                style={{ maxWidth: 160 }}
                value={statusFilter}
                onChange={(e) => { setLoading(true); setStatusFilter(e.target.value); setPage(1) }}
              >
                <option value="">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
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
              ) : error ? (
                <div className="alert alert-danger m-3">{error}</div>
              ) : enrollments.length === 0 ? (
                <div className="text-center p-4 text-muted">No enrollments found.</div>
              ) : (
                <table className="table table-hover table-striped">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Enrolled At</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((e) => (
                      <tr key={e.id}>
                        <td>{e.id}</td>
                        <td>
                          <strong>{e.student?.name ?? `#${e.student_id}`}</strong>
                          <br />
                          <small className="text-muted">{e.student?.email}</small>
                        </td>
                        <td>{e.course?.title ?? `#${e.course_id}`}</td>
                        <td>{e.enrolled_at ?? '—'}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGES[e.status] ?? 'badge-secondary'}`}>
                            {e.status}
                          </span>
                        </td>
                        <td>
                          {isAdmin && e.status !== 'confirmed' && (
                            <button
                              className="btn btn-xs btn-success mr-1"
                              title="Confirm"
                              disabled={actionId === e.id}
                              onClick={() => handleStatusChange(e, 'confirmed')}
                            >
                              <i className="fas fa-check" />
                            </button>
                          )}
                          {isAdmin && e.status !== 'cancelled' && (
                            <button
                              className="btn btn-xs btn-warning mr-1"
                              title="Cancel"
                              disabled={actionId === e.id}
                              onClick={() => handleStatusChange(e, 'cancelled')}
                            >
                              <i className="fas fa-ban" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              className="btn btn-xs btn-danger"
                              title="Delete"
                              disabled={actionId === e.id}
                              onClick={() => handleDelete(e)}
                            >
                              {actionId === e.id
                                ? <i className="fas fa-spinner fa-spin" />
                                : <i className="fas fa-trash" />
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
