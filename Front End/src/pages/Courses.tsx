import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../format'
import Pagination from '../components/ui/Pagination'
import PageHeader from '../components/ui/Page'
import StatusPill from '../components/ui/StatusPill'
import { EmptyRow, TableSkeleton } from '../components/ui/Table'
import { Link } from 'react-router-dom'
import { getCourses, deleteCourse } from '../api/courses'
import type { Course, PaginatedResponse } from '../types'
import { useToast } from '../context/ToastContext'
import { usePreferences } from '../context/PreferencesContext'
import { useAuth } from '../context/AuthContext'

export default function Courses() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const { prefs } = usePreferences()
  const { showToast } = useToast()
  const { isAdmin, isInstructor } = useAuth()
  const [data, setData] = useState<PaginatedResponse<Course> | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // The spinner is switched on by whatever the user did (paged, searched,
  // deleted), not inside the effect - setting it here would cascade a render.
  const reload = () => { setLoading(true); setReloadKey(k => k + 1) }
  const goToPage = (p: number) => { setLoading(true); setPage(p) }

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const { data } = await getCourses({ page, per_page: prefs.per_page, search: search || undefined })
        if (cancelled) return
        setData(data)
        setError(null)
      } catch {
        // Stored as a key, not a sentence: the effect does not depend on `t`
        // (so a language switch costs no refetch) and the banner re-localizes
        // itself on the next render.
        if (!cancelled) setError('courses.load_failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    // A newer request supersedes this one - drop its response on the floor
    // so fast pagination clicks cannot land out of order.
    return () => { cancelled = true }
  }, [page, prefs.per_page, search, reloadKey])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setPage(1)
    setSearch(searchInput)
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('courses.delete_confirm'))) return
    setDeletingId(id)
    try {
      await deleteCourse(id)
      showToast(t('courses.deleted'))
      reload()
    } catch {
      showToast(t('courses.delete_failed'), 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const canManage = isAdmin || isInstructor

  return (
    <section className="content">
      <div className="container-fluid lmsd">
        <PageHeader
          title={t('courses.title')}
          subtitle={typeof data?.total === 'number' ? t('common.total_count', { count: data.total }) : undefined}
          crumbs={[{ label: t('courses.title') }]}
          actions={canManage && (
            <Link to="/courses/new" className="lmsd-btn lmsd-btn--primary">
              <i className="fas fa-plus" aria-hidden="true" /> {t('nav.add_course')}
            </Link>
          )}
        />

        {error && (
          <div className="lmsd-note lmsd-note--warn" role="alert">
            <span className="lmsd-chip"><i className="fas fa-exclamation-triangle" aria-hidden="true" /></span>
            <span className="lmsd-note-text">{t(error)}</span>
            <button type="button" className="lmsd-btn lmsd-btn--ghost" onClick={reload}>
              {t('common.retry')}
            </button>
          </div>
        )}

        <section className="lmsd-surface lmsd-panel">
          <form className="lmsd-toolbar" onSubmit={handleSearch} role="search">
            <div className="lmsd-search">
              <i className="fas fa-search" aria-hidden="true" />
              <input
                type="search"
                className="lmsd-input"
                placeholder={t('courses.search_placeholder')}
                aria-label={t('courses.search_placeholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="lmsd-btn lmsd-btn--ghost">{t('common.search')}</button>
            {search && (
              <button
                type="button"
                className="lmsd-btn lmsd-btn--ghost"
                onClick={() => { setSearchInput(''); setSearch(''); goToPage(1) }}
              >
                <i className="fas fa-times" aria-hidden="true" /> {t('common.clear')}
              </button>
            )}
          </form>

          <div className="lmsd-scroll">
            <table className="lmsd-table">
              <thead>
                <tr>
                  <th>{t('courses.col.title')}</th>
                  <th>{t('courses.col.instructor')}</th>
                  <th className="lmsd-th-num">{t('courses.col.price')}</th>
                  <th>{t('courses.col.enrolled')}</th>
                  <th>{t('courses.col.status')}</th>
                  <th>{t('courses.col.start_date')}</th>
                  {canManage && <th className="lmsd-th-num">{t('common.actions')}</th>}
                </tr>
              </thead>

              {loading ? <TableSkeleton rows={6} cols={canManage ? 7 : 6} /> : !data?.data?.length ? (
                <EmptyRow
                  cols={canManage ? 7 : 6}
                  icon="far fa-folder-open"
                  label={t('courses.none_found')}
                />
              ) : (
                <tbody>
                  {data.data.map((course) => (
                    <tr key={course.id}>
                      <td data-lead className="lmsd-cell-lead">
                        <Link to={`/courses/${course.id}/edit`} className="lmsd-strong" title={course.title}>
                          {course.title}
                        </Link>
                        <span className="lmsd-sub">
                          {t('courses.col.hours')}: {course.hours ?? 0}
                        </span>
                      </td>
                      <td data-label={t('courses.col.instructor')}>
                        {course.instructor?.name ?? `#${course.instructor_id}`}
                      </td>
                      <td className="lmsd-num" data-label={t('courses.col.price')}>{fmt.money(course.price)}</td>
                      <td data-label={t('courses.col.enrolled')}>
                        <SeatCell
                          taken={course.taken_seats}
                          capacity={course.capacity}
                          remaining={course.remaining_seats}
                          available={course.is_available}
                        />
                      </td>
                      <td data-label={t('courses.col.status')}><StatusPill status={course.status} /></td>
                      <td data-label={t('courses.col.start_date')}>
                        {fmt.date(course.start_date, t('common.none'))}
                      </td>
                      {canManage && (
                        <td data-label={t('common.actions')}>
                          <div className="lmsd-actions">
                            <Link
                              to={`/courses/${course.id}/edit`}
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
                                disabled={deletingId === course.id}
                                onClick={() => handleDelete(course.id)}
                              >
                                <i className={deletingId === course.id ? 'fas fa-spinner fa-spin' : 'fas fa-trash'} aria-hidden="true" />
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
            lastPage={data?.last_page ?? 1}
            total={data?.total}
            onPage={goToPage}
            onPageSizeChange={() => goToPage(1)}
          />
        </section>
      </div>
    </section>
  )
}

/**
 * Seats taken, as a meter plus the words.
 *
 * `is_available` folds three different refusals together - not active, already
 * ended, and no seats left - so it cannot be the whole story on its own. Only
 * an actually full course reads "Full"; a draft or finished one with seats to
 * spare is "Unavailable", not a lie about capacity.
 */
function SeatCell({ taken, capacity, remaining, available }: {
  taken: number
  capacity: number
  remaining: number
  available: boolean
}) {
  const { t } = useTranslation()
  const ratio = capacity > 0 ? taken / capacity : 0
  const pct = Math.min(100, Math.max(0, ratio * 100))
  const tone = ratio >= 1 ? ' lmsd-meter--full' : ratio >= 0.8 ? ' lmsd-meter--warn' : ''

  return (
    <div className="lmsd-meter-wrap">
      <div className="lmsd-meter-label">
        <b>{`\u2068${taken} / ${capacity}\u2069`}</b>
        <span>
          {available
            ? t('courses.seats_left', { count: remaining })
            : remaining === 0 ? t('courses.full') : t('courses.unavailable')}
        </span>
      </div>
      <div className={`lmsd-meter${tone}`}>
        <div className="lmsd-meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
