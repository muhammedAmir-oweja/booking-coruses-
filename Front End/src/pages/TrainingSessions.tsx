import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTrainingSessions, deleteTrainingSession } from '../api/trainingSessions'
import type { TrainingSession } from '../types'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const STATUS_BADGES: Record<string, string> = {
  scheduled:  'badge-info',
  ongoing:    'badge-warning',
  completed:  'badge-success',
  cancelled:  'badge-danger',
}

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function TrainingSessions() {
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
          search: search || undefined,
          status: statusFilter || undefined,
        })
        if (cancelled) return
        setSessions(data.data)
        setLastPage(data.last_page)
        setTotal(data.total)
        setError('')
      } catch {
        if (!cancelled) setError('Failed to load training sessions.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    // A newer request supersedes this one - drop its response on the floor
    // so fast pagination clicks cannot land out of order.
    return () => { cancelled = true }
  }, [page, search, statusFilter, reloadKey])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setPage(1)
    setSearch(searchInput)
  }

  const handleDelete = async (session: TrainingSession) => {
    if (!confirm(`Delete "${session.title}"? This cannot be undone.`)) return
    setDeleting(session.id)
    try {
      await deleteTrainingSession(session.id)
      showToast('Training session deleted successfully.')
      reload()
    } catch {
      showToast('Failed to delete training session.', 'error')
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
              <h1 className="m-0">Training Sessions</h1>
            </div>
            <div className="col-sm-6 text-right">
              {(isAdmin || isInstructor) && (
                <Link to="/training-sessions/new" className="btn btn-primary btn-sm">
                  <i className="fas fa-plus mr-1" /> Add Session
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
                  placeholder="Search by title..."
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
                    Clear
                  </button>
                )}
              </form>

              <select
                className="form-control form-control-sm"
                style={{ maxWidth: 150 }}
                value={statusFilter}
                onChange={(e) => { setLoading(true); setStatusFilter(e.target.value); setPage(1) }}
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <div className="card-tools ml-auto">
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
              ) : sessions.length === 0 ? (
                <div className="text-center p-4 text-muted">No training sessions found.</div>
              ) : (
                <table className="table table-hover table-striped">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Title</th>
                      <th>Course</th>
                      <th>Starts At</th>
                      <th>Duration</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id}>
                        <td>{s.id}</td>
                        <td>{s.title}</td>
                        <td>{s.course?.title ?? '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(s.starts_at)}</td>
                        <td>{s.duration_minutes != null ? `${s.duration_minutes} min` : '—'}</td>
                        <td>{s.location || '—'}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGES[s.status] ?? 'badge-secondary'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td>
                          {(isAdmin || isInstructor) && (
                            <Link
                              to={`/training-sessions/${s.id}/edit`}
                              className="btn btn-xs btn-info mr-1"
                            >
                              <i className="fas fa-edit" />
                            </Link>
                          )}
                          {isAdmin && (
                            <button
                              className="btn btn-xs btn-danger"
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
