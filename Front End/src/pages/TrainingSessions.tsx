import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../format'
import Pagination from '../components/ui/Pagination'
import PageHeader from '../components/ui/Page'
import StatusPill from '../components/ui/StatusPill'
import { EmptyRow, TableSkeleton } from '../components/ui/Table'
import { Link } from 'react-router-dom'
import { getTrainingSessions, deleteTrainingSession } from '../api/trainingSessions'
import type { TrainingSession } from '../types'
import { useToast } from '../context/ToastContext'
import { usePreferences } from '../context/PreferencesContext'
import { useAuth } from '../context/AuthContext'

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

  const canManage = isAdmin || isInstructor
  const cols = canManage ? 6 : 5

  return (
    <section className="content">
      <div className="container-fluid lmsd">
        <PageHeader
          title={t('sessions.title')}
          subtitle={t('common.total_count', { count: total })}
          crumbs={[{ label: t('sessions.title') }]}
          actions={canManage && (
            <Link to="/training-sessions/new" className="lmsd-btn lmsd-btn--primary">
              <i className="fas fa-plus" aria-hidden="true" /> {t('nav.add_session')}
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
          <form className="lmsd-toolbar" onSubmit={handleSearch} role="search">
            <div className="lmsd-search">
              <i className="fas fa-search" aria-hidden="true" />
              <input
                type="search"
                className="lmsd-input"
                placeholder={t('sessions.search_placeholder')}
                aria-label={t('sessions.search_placeholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="lmsd-btn lmsd-btn--ghost">{t('common.search')}</button>
            <select
              className="lmsd-select"
              style={{ width: 'auto' }}
              aria-label={t('sessions.col.status')}
              value={statusFilter}
              onChange={(e) => { setLoading(true); setStatusFilter(e.target.value); setPage(1) }}
            >
              <option value="">{t('common.all_statuses')}</option>
              <option value="scheduled">{t('status.scheduled')}</option>
              <option value="ongoing">{t('status.ongoing')}</option>
              <option value="completed">{t('status.completed')}</option>
              <option value="cancelled">{t('status.cancelled')}</option>
            </select>
          </form>

          <div className="lmsd-scroll">
            <table className="lmsd-table">
              <thead>
                <tr>
                  <th>{t('sessions.col.title')}</th>
                  <th>{t('sessions.col.course')}</th>
                  <th>{t('sessions.col.starts_at')}</th>
                  <th>{t('sessions.col.location')}</th>
                  <th>{t('sessions.col.status')}</th>
                  {canManage && <th className="lmsd-th-num">{t('common.actions')}</th>}
                </tr>
              </thead>

              {loading ? <TableSkeleton rows={6} cols={cols} /> : !sessions.length ? (
                <EmptyRow cols={cols} icon="far fa-calendar" label={t('sessions.none_found')} />
              ) : (
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td data-lead className="lmsd-cell-lead">
                        <span className="lmsd-strong" title={s.title}>{s.title}</span>
                        <span className="lmsd-sub">
                          {s.duration_minutes != null
                            ? t('sessions.minutes', { count: s.duration_minutes })
                            : t('common.none')}
                        </span>
                      </td>
                      <td className="lmsd-cell-wide" data-label={t('sessions.col.course')}>
                        {s.course?.title ?? t('common.none')}
                      </td>
                      <td data-label={t('sessions.col.starts_at')}>{fmt.dateTime(s.starts_at)}</td>
                      <td data-label={t('sessions.col.location')}>{s.location || t('common.none')}</td>
                      <td data-label={t('sessions.col.status')}><StatusPill status={s.status} /></td>
                      {canManage && (
                        <td data-label={t('common.actions')}>
                          <div className="lmsd-actions">
                            <Link
                              to={`/training-sessions/${s.id}/edit`}
                              className="lmsd-iconbtn"
                              title={t('common.edit')}
                              aria-label={t('common.edit')}
                            >
                              <i className="fas fa-pen" aria-hidden="true" />
                            </Link>
                            {isAdmin && (
                              <button
                                type="button"
                                className="lmsd-iconbtn lmsd-iconbtn--danger"
                                title={t('common.delete')}
                                aria-label={t('common.delete')}
                                disabled={deleting === s.id}
                                onClick={() => handleDelete(s)}
                              >
                                <i className={deleting === s.id ? 'fas fa-spinner fa-spin' : 'fas fa-trash'} aria-hidden="true" />
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
