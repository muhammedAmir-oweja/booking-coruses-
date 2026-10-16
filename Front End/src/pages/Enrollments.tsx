import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../format'
import Pagination from '../components/ui/Pagination'
import PageHeader from '../components/ui/Page'
import StatusPill from '../components/ui/StatusPill'
import { EmptyRow, TableSkeleton } from '../components/ui/Table'
import { initialsOf } from '../components/ui/identity'
import { Link } from 'react-router-dom'
import { getEnrollments, deleteEnrollment, updateEnrollment } from '../api/enrollments'
import type { Enrollment } from '../types'
import { useToast } from '../context/ToastContext'
import { usePreferences } from '../context/PreferencesContext'
import { useAuth } from '../context/AuthContext'

export default function Enrollments() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const { prefs } = usePreferences()
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
        const { data } = await getEnrollments({ page, per_page: prefs.per_page, status: statusFilter || undefined })
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
  }, [page, prefs.per_page, statusFilter, reloadKey])

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

  const canManage = isAdmin || isInstructor
  const cols = isAdmin ? 5 : 4

  return (
    <section className="content">
      <div className="container-fluid lmsd">
        <PageHeader
          title={t('enrollments.title')}
          subtitle={t('common.total_count', { count: total })}
          crumbs={[{ label: t('enrollments.title') }]}
          actions={canManage && (
            <Link to="/enrollments/new" className="lmsd-btn lmsd-btn--primary">
              <i className="fas fa-plus" aria-hidden="true" /> {t('nav.enroll_student')}
            </Link>
          )}
        />

        {error && (
          <div className="lmsd-note lmsd-note--warn" role="alert">
            <span className="lmsd-chip"><i className="fas fa-exclamation-triangle" aria-hidden="true" /></span>
            <span className="lmsd-note-text">{t(error)}</span>
          </div>
        )}

        <section className="lmsd-surface lmsd-panel">
          <div className="lmsd-toolbar">
            <select
              className="lmsd-select"
              style={{ width: 'auto' }}
              aria-label={t('enrollments.col.status')}
              value={statusFilter}
              onChange={(e) => { setLoading(true); setStatusFilter(e.target.value); setPage(1) }}
            >
              <option value="">{t('common.all_statuses')}</option>
              <option value="pending">{t('status.pending')}</option>
              <option value="confirmed">{t('status.confirmed')}</option>
              <option value="cancelled">{t('status.cancelled')}</option>
              <option value="completed">{t('status.completed')}</option>
            </select>
            {statusFilter && (
              <button
                type="button"
                className="lmsd-btn lmsd-btn--ghost"
                onClick={() => { setLoading(true); setStatusFilter(''); setPage(1) }}
              >
                <i className="fas fa-times" aria-hidden="true" /> {t('common.clear')}
              </button>
            )}
          </div>

          <div className="lmsd-scroll">
            <table className="lmsd-table">
              <thead>
                <tr>
                  <th>{t('enrollments.col.student')}</th>
                  <th>{t('enrollments.col.course')}</th>
                  <th>{t('enrollments.col.enrolled_at')}</th>
                  <th>{t('enrollments.col.status')}</th>
                  {isAdmin && <th className="lmsd-th-num">{t('common.actions')}</th>}
                </tr>
              </thead>

              {loading ? <TableSkeleton rows={6} cols={cols} /> : !enrollments.length ? (
                <EmptyRow cols={cols} icon="far fa-user" label={t('enrollments.none_found')} />
              ) : (
                <tbody>
                  {enrollments.map((e) => (
                    <tr key={e.id}>
                      <td data-lead className="lmsd-cell-lead">
                        <div className="lmsd-who">
                          <span className="lmsd-avatar" aria-hidden="true">
                            {initialsOf(e.student?.name ?? '?')}
                          </span>
                          <span style={{ minWidth: 0 }}>
                            <span className="lmsd-strong">{e.student?.name ?? `#${e.student_id}`}</span>
                            {e.student?.email && <span className="lmsd-sub">{e.student.email}</span>}
                          </span>
                        </div>
                      </td>
                      <td className="lmsd-cell-wide" data-label={t('enrollments.col.course')}>
                        <span className="lmsd-strong">{e.course?.title ?? `#${e.course_id}`}</span>
                      </td>
                      <td data-label={t('enrollments.col.enrolled_at')}>
                        {fmt.date(e.enrolled_at, t('common.none'))}
                      </td>
                      <td data-label={t('enrollments.col.status')}><StatusPill status={e.status} /></td>
                      {isAdmin && (
                        <td data-label={t('common.actions')}>
                          <div className="lmsd-actions">
                            {e.status !== 'confirmed' && (
                              <button
                                type="button"
                                className="lmsd-iconbtn lmsd-iconbtn--good"
                                title={t('common.confirm')}
                                aria-label={t('common.confirm')}
                                disabled={actionId === e.id}
                                onClick={() => handleStatusChange(e, 'confirmed')}
                              >
                                <i className="fas fa-check" aria-hidden="true" />
                              </button>
                            )}
                            {e.status !== 'cancelled' && (
                              <button
                                type="button"
                                className="lmsd-iconbtn"
                                title={t('common.cancel')}
                                aria-label={t('common.cancel')}
                                disabled={actionId === e.id}
                                onClick={() => handleStatusChange(e, 'cancelled')}
                              >
                                <i className="fas fa-ban" aria-hidden="true" />
                              </button>
                            )}
                            <button
                              type="button"
                              className="lmsd-iconbtn lmsd-iconbtn--danger"
                              title={t('common.delete')}
                              aria-label={t('common.delete')}
                              disabled={actionId === e.id}
                              onClick={() => handleDelete(e)}
                            >
                              <i className={actionId === e.id ? 'fas fa-spinner fa-spin' : 'fas fa-trash'} aria-hidden="true" />
                            </button>
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
