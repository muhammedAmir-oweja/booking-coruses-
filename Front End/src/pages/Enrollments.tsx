import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const { isAdmin, isInstructor } = useAuth()
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
        // A key, not a sentence - see the same note in Courses.tsx.
        if (!cancelled) setError('enrollments.load_failed')
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
      showToast(t('enrollments.status_updated', { status: t(`status.${status}`) }))
      reload()
    } catch {
      showToast(t('enrollments.status_update_failed'), 'error')
    } finally {
      setActionId(null)
    }
  }

  const handleDelete = async (enrollment: Enrollment) => {
    if (!confirm(t('enrollments.remove_confirm', {
      student: enrollment.student?.name,
      course: enrollment.course?.title,
    }))) return
    setActionId(enrollment.id)
    try {
      await deleteEnrollment(enrollment.id)
      showToast(t('enrollments.removed'))
      reload()
    } catch {
      showToast(t('enrollments.remove_failed'), 'error')
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
              <h1 className="m-0">{t('enrollments.title')}</h1>
            </div>
            <div className="col-sm-6 text-right">
              {(isAdmin || isInstructor) && (
                <Link to="/enrollments/new" className="btn btn-primary btn-sm">
                  <i className="fas fa-plus mr-1" /> {t('nav.enroll_student')}
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
              <h3 className="card-title mr-3">{t('enrollments.all')}</h3>
              <select
                className="form-control form-control-sm"
                style={{ maxWidth: 160 }}
                value={statusFilter}
                onChange={(e) => { setLoading(true); setStatusFilter(e.target.value); setPage(1) }}
              >
                <option value="">{t('common.all_statuses')}</option>
                <option value="confirmed">{t('status.confirmed')}</option>
                <option value="pending">{t('status.pending')}</option>
                <option value="cancelled">{t('status.cancelled')}</option>
              </select>
              <div className="ml-auto">
                <span className="badge badge-info">{t('common.total_count', { count: total })}</span>
              </div>
            </div>

            <div className="card-body table-responsive p-0">
              {loading ? (
                <div className="text-center p-4">
                  <i className="fas fa-spinner fa-spin mr-2" /> {t('common.loading')}
                </div>
              ) : error ? (
                <div className="alert alert-danger m-3">{t(error)}</div>
              ) : enrollments.length === 0 ? (
                <div className="text-center p-4 text-muted">{t('enrollments.none_found')}</div>
              ) : (
                <table className="table table-hover table-striped">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('enrollments.col.student')}</th>
                      <th>{t('enrollments.col.course')}</th>
                      <th>{t('enrollments.col.enrolled_at')}</th>
                      <th>{t('enrollments.col.status')}</th>
                      <th>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((e) => (
                      <tr key={e.id}>
                        <td>{e.id}</td>
                        <td>
                          <strong>{e.student?.name ?? `#${e.student_id}`}</strong>
                          <br />
                          <small className="text-muted text-ltr">{e.student?.email}</small>
                        </td>
                        <td>{e.course?.title ?? `#${e.course_id}`}</td>
                        <td className="text-ltr">{e.enrolled_at ?? t('common.none')}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGES[e.status] ?? 'badge-secondary'}`}>
                            {t(`status.${e.status}`)}
                          </span>
                        </td>
                        <td>
                          {isAdmin && e.status !== 'confirmed' && (
                            <button
                              className="btn btn-xs btn-success mr-1"
                              title={t('common.confirm')}
                              disabled={actionId === e.id}
                              onClick={() => handleStatusChange(e, 'confirmed')}
                            >
                              <i className="fas fa-check" />
                            </button>
                          )}
                          {isAdmin && e.status !== 'cancelled' && (
                            <button
                              className="btn btn-xs btn-warning mr-1"
                              title={t('common.cancel')}
                              disabled={actionId === e.id}
                              onClick={() => handleStatusChange(e, 'cancelled')}
                            >
                              <i className="fas fa-ban" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              className="btn btn-xs btn-danger"
                              title={t('common.delete')}
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
