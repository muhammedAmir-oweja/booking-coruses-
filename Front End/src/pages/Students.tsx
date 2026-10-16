import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../format'
import Pagination from '../components/ui/Pagination'
import PageHeader from '../components/ui/Page'
import { EmptyRow, TableSkeleton } from '../components/ui/Table'
import { initialsOf } from '../components/ui/identity'
import { Link } from 'react-router-dom'
import { getStudents, deleteStudent } from '../api/students'
import type { Student } from '../types'
import { useToast } from '../context/ToastContext'
import { usePreferences } from '../context/PreferencesContext'
import { useAuth } from '../context/AuthContext'

export default function Students() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const { prefs } = usePreferences()
  const { showToast } = useToast()
  const { isAdmin } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // The spinner is switched on by whatever the user did (paged, searched,
  // deleted), not inside the effect - setting it here would cascade a render.
  const reload = () => { setLoading(true); setReloadKey(k => k + 1) }
  const goToPage = (p: number) => { setLoading(true); setPage(p) }

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const { data } = await getStudents({ page, per_page: prefs.per_page, search: search || undefined })
        if (cancelled) return
        setStudents(data.data)
        setLastPage(data.last_page)
        setTotal(data.total)
        setError('')
      } catch {
        // A key, not a sentence - see the same note in Courses.tsx.
        if (!cancelled) setError('students.load_failed')
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

  const handleDelete = async (student: Student) => {
    if (!confirm(t('students.delete_confirm', { name: student.name }))) return
    setDeleting(student.id)
    try {
      await deleteStudent(student.id)
      showToast(t('students.deleted'))
      reload()
    } catch {
      showToast(t('students.delete_failed'), 'error')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <section className="content">
      <div className="container-fluid lmsd">
        <PageHeader
          title={t('students.title')}
          subtitle={t('common.total_count', { count: total })}
          crumbs={[{ label: t('students.title') }]}
          actions={isAdmin && (
            <Link to="/students/new" className="lmsd-btn lmsd-btn--primary">
              <i className="fas fa-plus" aria-hidden="true" /> {t('nav.add_student')}
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
                placeholder={t('students.search_placeholder')}
                aria-label={t('students.search_placeholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="lmsd-btn lmsd-btn--ghost">{t('common.search')}</button>
            {search && (
              <button
                type="button"
                className="lmsd-btn lmsd-btn--ghost"
                onClick={() => { setLoading(true); setSearchInput(''); setSearch(''); setPage(1) }}
              >
                <i className="fas fa-times" aria-hidden="true" /> {t('common.clear')}
              </button>
            )}
          </form>

          <div className="lmsd-scroll">
            <table className="lmsd-table">
              <thead>
                <tr>
                  <th>{t('students.col.name')}</th>
                  <th>{t('students.col.email')}</th>
                  <th>{t('students.col.phone')}</th>
                  <th>{t('students.col.date_of_birth')}</th>
                  {isAdmin && <th className="lmsd-th-num">{t('common.actions')}</th>}
                </tr>
              </thead>

              {loading ? <TableSkeleton rows={6} cols={isAdmin ? 5 : 4} /> : !students.length ? (
                <EmptyRow cols={isAdmin ? 5 : 4} icon="far fa-user" label={t('students.none_found')} />
              ) : (
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td data-lead className="lmsd-cell-lead">
                        <div className="lmsd-who">
                          {/* The photo when there is one, initials when there
                              is not - the same tile the rest of the app uses,
                              instead of a grey silhouette box. */}
                          {s.photo_url
                            ? <img src={s.photo_url} alt="" className="lmsd-avatar" style={{ objectFit: 'cover' }} />
                            : <span className="lmsd-avatar" aria-hidden="true">{initialsOf(s.name)}</span>}
                          <span style={{ minWidth: 0 }}>
                            <span className="lmsd-strong" title={s.name}>{s.name}</span>
                            <span className="lmsd-sub">#{s.id}</span>
                          </span>
                        </div>
                      </td>
                      <td data-label={t('students.col.email')}>{s.email}</td>
                      <td data-label={t('students.col.phone')}>{s.phone || t('common.none')}</td>
                      <td data-label={t('students.col.date_of_birth')}>
                        {fmt.date(s.date_of_birth, t('common.none'))}
                      </td>
                      {isAdmin && (
                        <td data-label={t('common.actions')}>
                          <div className="lmsd-actions">
                            <Link
                              to={`/students/${s.id}/edit`}
                              className="lmsd-iconbtn"
                              title={t('common.edit')}
                              aria-label={t('common.edit')}
                            >
                              <i className="fas fa-pen" aria-hidden="true" />
                            </Link>
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
