import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getStudents, deleteStudent } from '../api/students'
import type { Student } from '../types'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

export default function Students() {
  const { t } = useTranslation()
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
        const { data } = await getStudents({ page, search: search || undefined })
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
  }, [page, search, reloadKey])

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
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">{t('students.title')}</h1>
            </div>
            <div className="col-sm-6 text-right">
              {isAdmin && (
                <Link to="/students/new" className="btn btn-primary btn-sm">
                  <i className="fas fa-plus mr-1" /> {t('nav.add_student')}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <form onSubmit={handleSearch} className="d-flex" style={{ gap: 8 }}>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder={t('students.search_placeholder')}
                  style={{ maxWidth: 300 }}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                <button type="submit" className="btn btn-default btn-sm">
                  <i className="fas fa-search" />
                </button>
                {search && (
                  <button
                    type="button"
                    className="btn btn-default btn-sm"
                    onClick={() => { setLoading(true); setSearchInput(''); setSearch(''); setPage(1) }}
                  >
                    {t('common.clear')}
                  </button>
                )}
              </form>
              <div className="card-tools">
                <span className="badge badge-info">{t('common.total_count', { count: total })}</span>
              </div>
            </div>

            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4">
                  <i className="fas fa-spinner fa-spin mr-2" /> {t('common.loading')}
                </div>
              ) : error ? (
                <div className="alert alert-danger m-3">{t(error)}</div>
              ) : students.length === 0 ? (
                <div className="text-center p-4 text-muted">{t('students.none_found')}</div>
              ) : (
                <table className="table table-hover table-striped">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('students.col.photo')}</th>
                      <th>{t('students.col.name')}</th>
                      <th>{t('students.col.email')}</th>
                      <th>{t('students.col.phone')}</th>
                      <th>{t('students.col.date_of_birth')}</th>
                      <th>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td>{s.id}</td>
                        <td>
                          {s.photo_url ? (
                            <img
                              src={s.photo_url}
                              alt={s.name}
                              className="img-circle elevation-2"
                              style={{ width: 35, height: 35, objectFit: 'cover' }}
                            />
                          ) : (
                            <span className="img-circle bg-secondary d-inline-flex align-items-center justify-content-center"
                              style={{ width: 35, height: 35 }}>
                              <i className="fas fa-user text-white" />
                            </span>
                          )}
                        </td>
                        <td>{s.name}</td>
                        <td className="text-ltr">{s.email}</td>
                        <td className="text-ltr">{s.phone || t('common.none')}</td>
                        <td className="text-ltr">{s.date_of_birth || t('common.none')}</td>
                        <td>
                          {isAdmin && (
                            <>
                              <Link
                                to={`/students/${s.id}/edit`}
                                className="btn btn-xs btn-info mr-1"
                                title={t('common.edit')}
                              >
                                <i className="fas fa-edit" />
                              </Link>
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
                            </>
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
