import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCourses, deleteCourse } from '../api/courses'
import type { Course, PaginatedResponse } from '../types'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

export default function Courses() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { isAdmin, isInstructor } = useAuth()
  const [data, setData] = useState<PaginatedResponse<Course> | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = (p = page, s = search) => {
    setLoading(true)
    getCourses({ page: p, search: s || undefined })
      .then(({ data }) => setData(data))
      .catch(() => setError('Failed to load courses.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load(1, search)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this course?')) return
    setDeletingId(id)
    try {
      await deleteCourse(id)
      showToast('Course deleted successfully.')
      load()
    } catch {
      showToast('Failed to delete course.', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const statusBadge = (status: Course['status']) => {
    const map = { active: 'success', inactive: 'secondary', draft: 'warning' }
    return <span className={`badge badge-${map[status]}`}>{status}</span>
  }

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Courses</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/">Home</Link></li>
                <li className="breadcrumb-item active">Courses</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {error && (
            <div className="alert alert-danger">
              <i className="fas fa-exclamation-triangle mr-2" />{error}
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">All Courses</h3>
              <div className="card-tools d-flex align-items-center gap-2">
                <form onSubmit={handleSearch} className="input-group input-group-sm mr-2" style={{ width: 250 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search courses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
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
                    <i className="fas fa-plus mr-1" /> Add Course
                  </button>
                )}
              </div>
            </div>

            <div className="card-body p-0">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Instructor</th>
                    <th>Price</th>
                    <th>Hours</th>
                    <th>Enrolled</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={9} className="text-center py-4">
                        <i className="fas fa-spinner fa-spin mr-2" />Loading...
                      </td>
                    </tr>
                  )}
                  {!loading && !data?.data?.length && (
                    <tr>
                      <td colSpan={9} className="text-center py-4 text-muted">
                        No courses found
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
                      <td>${course.price}</td>
                      <td>{course.hours ?? 0}</td>
                      <td>
                        {course.enrolled_count} / {course.capacity}
                      </td>
                      <td>{statusBadge(course.status)}</td>
                      <td>{course.start_date ? new Date(course.start_date).toLocaleDateString() : '—'}</td>
                      <td>
                        {(isAdmin || isInstructor) && (
                          <Link
                            to={`/courses/${course.id}/edit`}
                            className="btn btn-sm btn-info mr-1"
                            title="Edit"
                          >
                            <i className="fas fa-edit" />
                          </Link>
                        )}
                        {isAdmin && (
                          <button
                            className="btn btn-sm btn-danger"
                            title="Delete"
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

            {/* Pagination */}
            {data && data.last_page > 1 && (
              <div className="card-footer clearfix">
                <ul className="pagination pagination-sm m-0 float-right">
                  <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(page - 1)}>
                      &laquo;
                    </button>
                  </li>
                  {Array.from({ length: data.last_page }, (_, i) => i + 1).map((p) => (
                    <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                    </li>
                  ))}
                  <li className={`page-item ${page >= data.last_page ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(page + 1)}>
                      &raquo;
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
