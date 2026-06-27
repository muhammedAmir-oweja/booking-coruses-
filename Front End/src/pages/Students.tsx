import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getStudents, deleteStudent } from '../api/students'
import type { Student } from '../types'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

export default function Students() {
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

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getStudents({ page, search: search || undefined })
      setStudents(data.data)
      setLastPage(data.last_page)
      setTotal(data.total)
    } catch {
      setError('Failed to load students.')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  const handleDelete = async (student: Student) => {
    if (!confirm(`Delete "${student.name}"? This cannot be undone.`)) return
    setDeleting(student.id)
    try {
      await deleteStudent(student.id)
      showToast('Student deleted successfully.')
      load()
    } catch {
      showToast('Failed to delete student.', 'error')
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
              <h1 className="m-0">Students</h1>
            </div>
            <div className="col-sm-6 text-right">
              {isAdmin && (
                <Link to="/students/new" className="btn btn-primary btn-sm">
                  <i className="fas fa-plus mr-1" /> Add Student
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
                  placeholder="Search by name, email, or phone..."
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
                    onClick={() => { setSearchInput(''); setSearch(''); setPage(1) }}
                  >
                    Clear
                  </button>
                )}
              </form>
              <div className="card-tools">
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
              ) : students.length === 0 ? (
                <div className="text-center p-4 text-muted">No students found.</div>
              ) : (
                <table className="table table-hover table-striped">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Photo</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Date of Birth</th>
                      <th>Actions</th>
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
                        <td>{s.email}</td>
                        <td>{s.phone || '—'}</td>
                        <td>{s.date_of_birth || '—'}</td>
                        <td>
                          {isAdmin && (
                            <>
                              <Link
                                to={`/students/${s.id}/edit`}
                                className="btn btn-xs btn-info mr-1"
                              >
                                <i className="fas fa-edit" />
                              </Link>
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
                    <button className="page-link" onClick={() => setPage(p => p - 1)}>«</button>
                  </li>
                  {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                    <li key={p} className={`page-item${p === page ? ' active' : ''}`}>
                      <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                    </li>
                  ))}
                  <li className={`page-item${page === lastPage ? ' disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(p => p + 1)}>»</button>
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
