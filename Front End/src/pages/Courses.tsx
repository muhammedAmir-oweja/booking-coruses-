import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../format'
import Pagination from '../components/ui/Pagination'
import { Link, useNavigate } from 'react-router-dom'
import { getCourses, deleteCourse } from '../api/courses'
import type { Course, PaginatedResponse } from '../types'
import { useToast } from '../context/ToastContext'
import { usePreferences } from '../context/PreferencesContext'
import { useAuth } from '../context/AuthContext'

export default function Courses() {
  const navigate = useNavigate()
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

  const statusBadge = (status: Course['status']) => {
    const map = { active: 'success', inactive: 'secondary', draft: 'warning' }
    return <span className={`badge badge-${map[status]}`}>{t(`status.${status}`)}</span>
  }

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">{t('courses.title')}</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/">{t('common.home')}</Link></li>
                <li className="breadcrumb-item active">{t('courses.title')}</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-triangle mr-2" />{t(error)}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{t('courses.all')}</h3>
              <div className="card-tools d-flex align-items-center gap-2">
                <form onSubmit={handleSearch} className="input-group input-group-sm" style={{ width: 250 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={t('courses.search_placeholder')}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  <div className="input-group-append">
                    <button type="submit" className="btn btn-default">
                      <i className="fas fa-search" />
                    </button>
                  </div>
                </form>
                {(isAdmin || isInstructor) && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate('/courses/new')}
                  >
                    <i className="fas fa-plus mr-1" /> {t('nav.add_course')}
                  </button>
                )}
              </div>
            </div>

            <div className="card-body table-responsive p-0">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('courses.col.title')}</th>
                    <th>{t('courses.col.instructor')}</th>
                    <th>{t('courses.col.price')}</th>
                    <th>{t('courses.col.hours')}</th>
                    <th>{t('courses.col.enrolled')}</th>
                    <th>{t('courses.col.status')}</th>
                    <th>{t('courses.col.start_date')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={9} className="text-center py-4">
                        <i className="fas fa-spinner fa-spin mr-2" />{t('common.loading')}
                      </td>
                    </tr>
                  )}
                  {!loading && !data?.data?.length && (
                    <tr>
                      <td colSpan={9} className="text-center py-4 text-muted">
                        {t('courses.none_found')}
                      </td>
                    </tr>
                  )}
                  {data?.data?.map((course) => (
                    <tr key={course.id}>
                      <td>{course.id}</td>
                      <td>
                        <Link to={`/courses/${course.id}/edit`}>{course.title}</Link>
                      </td>
                      <td>{course.instructor?.name ?? `#${course.instructor_id}`}</td>
                      <td className="text-ltr">{fmt.money(course.price)}</td>
                      <td className="text-ltr">{course.hours ?? 0}</td>
                      <td>
                        <span className="text-ltr">{course.taken_seats} / {course.capacity}</span>
                      {/* is_available folds three different refusals together -
                          not active, already ended, and no seats left - so it
                          cannot be the whole story on its own. Only an actually
                          full course gets "Full"; a draft or finished one with
                          seats to spare is "Unavailable", not a lie about
                          capacity. */}
                      {course.is_available
                        ? <span className="badge badge-success ml-1">{t('courses.seats_left', { count: course.remaining_seats })}</span>
                        : course.remaining_seats === 0
                          ? <span className="badge badge-danger ml-1">{t('courses.full')}</span>
                          : <span className="badge badge-secondary ml-1">{t('courses.unavailable')}</span>}
                      </td>
                      <td>{statusBadge(course.status)}</td>
                      <td className="text-ltr">{fmt.date(course.start_date, t('common.none'))}</td>
                      <td>
                        {(isAdmin || isInstructor) && (
                          <Link
                            to={`/courses/${course.id}/edit`}
                            className="btn btn-sm btn-info mr-1"
                            title={t('common.edit')}
                          >
                            <i className="fas fa-edit" />
                          </Link>
                        )}
                        {isAdmin && (
                          <button
                            className="btn btn-sm btn-danger"
                            title={t('common.delete')}
                            disabled={deletingId === course.id}
                            onClick={() => handleDelete(course.id)}
                          >
                            {deletingId === course.id
                              ? <i className="fas fa-spinner fa-spin" />
                              : <i className="fas fa-trash" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(data?.last_page ?? 1) > 0 && (
              <Pagination
                page={page}
                lastPage={data?.last_page ?? 1}
                total={data?.total}
                onPage={goToPage}
                onPageSizeChange={() => goToPage(1)}
              />
            )}
          </div>
        </div>
      </section>
    </>
  )
}
