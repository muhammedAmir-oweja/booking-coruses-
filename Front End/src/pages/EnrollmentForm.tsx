import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createEnrollment } from '../api/enrollments'
import { getCourses } from '../api/courses'
import { getStudents } from '../api/students'
import type { Course, Student } from '../types'
import type { AxiosError } from 'axios'
import { useToast } from '../context/ToastContext'

interface FormState {
  student_id: string
  course_id: string
  enrolled_at: string
  status: string
}

const empty: FormState = {
  student_id: '',
  course_id: '',
  enrolled_at: new Date().toISOString().slice(0, 10),
  status: 'confirmed',
}

export default function EnrollmentForm() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [form, setForm] = useState<FormState>(empty)
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    Promise.all([
      getCourses({ page: 1, per_page: 200 }).then(({ data }) => setCourses(data.data)),
      getStudents({ page: 1, per_page: 200 }).then(({ data }) => setStudents(data.data)),
    ])
      .catch(() => setServerError('Failed to load courses or students.'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n })
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.student_id) errs.student_id = 'Student is required.'
    if (!form.course_id) errs.course_id = 'Course is required.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setServerError('')

    try {
      await createEnrollment({
        student_id: Number(form.student_id),
        course_id: Number(form.course_id),
        enrolled_at: form.enrolled_at || undefined,
        status: form.status,
      })
      showToast('Student enrolled successfully.')
      navigate('/enrollments')
    } catch (err) {
      const ax = err as AxiosError<{ message: string; errors?: Record<string, string[]> }>
      if (ax.response?.status === 422) {
        const serverErrs: Record<string, string> = {}
        Object.entries(ax.response.data.errors ?? {}).forEach(([k, msgs]) => {
          serverErrs[k] = msgs[0]
        })
        setErrors(serverErrs)
      } else {
        setServerError(ax.response?.data?.message ?? 'An error occurred.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="content">
        <div className="container-fluid text-center p-5">
          <i className="fas fa-spinner fa-spin fa-2x" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Enroll Student</h1>
            </div>
            <div className="col-sm-6 text-right">
              <Link to="/enrollments" className="btn btn-default btn-sm">
                <i className="fas fa-arrow-left mr-1" /> Back
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-6">
              <div className="card card-primary">
                <div className="card-header">
                  <h3 className="card-title">New Enrollment</h3>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="card-body">
                    {serverError && (
                      <div className="alert alert-danger">{serverError}</div>
                    )}

                    <div className="form-group">
                      <label>Student <span className="text-danger">*</span></label>
                      <select
                        name="student_id"
                        className={`form-control${errors.student_id ? ' is-invalid' : ''}`}
                        value={form.student_id}
                        onChange={handleChange}
                      >
                        <option value="">— Select a student —</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                        ))}
                      </select>
                      {errors.student_id && <div className="invalid-feedback">{errors.student_id}</div>}
                    </div>

                    <div className="form-group">
                      <label>Course <span className="text-danger">*</span></label>
                      <select
                        name="course_id"
                        className={`form-control${errors.course_id ? ' is-invalid' : ''}`}
                        value={form.course_id}
                        onChange={handleChange}
                      >
                        <option value="">— Select a course —</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                      {errors.course_id && <div className="invalid-feedback">{errors.course_id}</div>}
                    </div>

                    <div className="form-group">
                      <label>Enrollment Date</label>
                      <input
                        name="enrolled_at"
                        type="date"
                        className="form-control"
                        value={form.enrolled_at}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="form-group">
                      <label>Status</label>
                      <select
                        name="status"
                        className="form-control"
                        value={form.status}
                        onChange={handleChange}
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="card-footer">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving
                        ? <><i className="fas fa-spinner fa-spin mr-1" /> Saving...</>
                        : <><i className="fas fa-user-plus mr-1" /> Enroll Student</>
                      }
                    </button>
                    <Link to="/enrollments" className="btn btn-default ml-2">Cancel</Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
