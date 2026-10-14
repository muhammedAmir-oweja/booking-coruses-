import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../format'
import Pagination from '../components/ui/Pagination'
import { Link } from 'react-router-dom'
import { getTrainingSessions, deleteTrainingSession } from '../api/trainingSessions'
import type { TrainingSession } from '../types'
import { useToast } from '../context/ToastContext'
import { usePreferences } from '../context/PreferencesContext'
import { useAuth } from '../context/AuthContext'

const STATUS_BADGES: Record<string, string> = {
  scheduled:  'badge-info',
  ongoing:    'badge-warning',
  completed:  'badge-success',
  cancelled:  'badge-danger',
}



export default function TrainingSessions() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const { prefs } = usePreferences()
  const { isAdmin, isInstructor } = useAuth()
  const { showToast } = useToast()
  const [sessions, setSessions] = useState<TrainingSession[]>([])
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // The spinner is switched on by whatever the user did (paged, searched,
  // filtered, deleted), not inside the effect - that would cascade a render.
  const reload = () => { setLoading(true); setReloadKey(k => k + 1) }
  const goToPage = (p: number) => { setLoading(true); setPage(p) }

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const { data } = await getTrainingSessions({
          page,
          per_page: prefs.per_page,
          search: search || undefined,
          status: statusFilter || undefined,
        })
        if (cancelled) return
        setSessions(data.data)
        setLastPage(data.last_page)
        setTotal(data.total)
        setError('')
      } catch {
        // A key, not a sentence - see the same note in Courses.tsx.
        if (!cancelled) setError('sessions.load_failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    // A newer request supersedes this one - drop its response on the floor
    // so fast pagination clicks cannot land out of order.
    return () => { cancelled = true }
  }, [page, prefs.per_page, search, statusFilter, reloadKey])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setPage(1)
    setSearch(searchInput)
  }

  const handleDelete = async (session: TrainingSession) => {
    if (!confirm(t('sessions.delete_confirm', { title: session.title }))) return
    setDeleting(session.id)
    try {
      await deleteTrainingSession(session.id)
      showToast(t('sessions.deleted'))
      reload()
    } catch {
      showToast(t('sessions.delete_failed'), 'error')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">{t('sessions.title')}</h1>
            </div>
            <div className="col-sm-6 text-right">
              {(isAdmin || isInstructor) && (
                <Link to="/training-sessions/new" className="btn btn-primary btn-sm">
                  <i className="fas fa-plus mr-1" /> {t('nav.add_session')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header d-flex flex-wrap align-items-center" style={{ gap: 8 }}>
              <form onSubmit={handleSearch} className="d-flex" style={{ gap: 8 }}>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder={t('sessions.search_placeholder')}
                  style={{ maxWidth: 260 }}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button type="submit" className="btn btn-default btn-sm">
                  <i className="fas fa-search" />
                </button>
                {search && (
                  <button type="button" className="btn btn-default btn-sm"
                    onClick={() => { setLoading(true); setSearchInput(''); setSearch(''); setPage(1) }}>
                    {t('common.clear')}
                  </button>
                )}
              </form>

              <select
                className="form-control form-control-sm"
                style={{ maxWidth: 150 }}
                value={statusFilter}
                onChange={(e) => { setLoading(true); setStatusFilter(e.target.value); setPage(1) }}
              >
                <option value="">{t('common.all_statuses')}</option>
                <option value="scheduled">{t('status.scheduled')}</option>
                <option value="ongoing">{t('status.ongoing')}</option>
                <option value="completed">{t('status.completed')}</option>
                <option value="cancelled">{t('status.cancelled')}</option>
              </select>

              <div className="card-tools ml-auto">
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
              ) : sessions.length === 0 ? (
                <div className="text-center p-4 text-muted">{t('sessions.none_found')}</div>
              ) : (
                <table className="table table-hover table-striped">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('sessions.col.title')}</th>
                      <th>{t('sessions.col.course')}</th>
                      <th>{t('sessions.col.starts_at')}</th>
                      <th>{t('sessions.col.duration')}</th>
                      <th>{t('sessions.col.location')}</th>
                      <th>{t('sessions.col.status')}</th>
                      <th>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id}>
                        <td>{s.id}</td>
                        <td>{s.title}</td>
                        <td>{s.course?.title ?? t('common.none')}</td>
                        <td className="text-ltr" style={{ whiteSpace: 'nowrap' }}>{fmt.dateTime(s.starts_at)}</td>
                        <td>{s.duration_minutes != null ? t('sessions.minutes', { count: s.duration_minutes }) : t('common.none')}</td>
                        <td>{s.location || t('common.none')}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGES[s.status] ?? 'badge-secondary'}`}>
                            {t(`status.${s.status}`)}
                          </span>
                        </td>
                        <td>
                          {(isAdmin || isInstructor) && (
                            <Link
                              to={`/training-sessions/${s.id}/edit`}
                              className="btn btn-xs btn-info mr-1"
                              title={t('common.edit')}
                            >
                              <i className="fas fa-edit" />
                            </Link>
                          )}
                          {isAdmin && (
                            <button
                              className="btn btn-xs btn-danger"
                              title={t('common.delete')}
                              disabled={deleting === s.id}
                              onClick={() => handleDelete(s)}
                            >
                              {deleting === s.id
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

            {(lastPage) > 0 && (
              <Pagination
                page={page}
                lastPage={lastPage}
                total={total}
                onPage={goToPage}
                onPageSizeChange={() => goToPage(1)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
