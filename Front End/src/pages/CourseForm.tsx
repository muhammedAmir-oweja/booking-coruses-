import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getCourse, createCourse, updateCourse } from '../api/courses'
import { getUsers } from '../api/users'
import type { Course, User } from '../types'
import { useToast } from '../context/ToastContext'

interface FormState {
  instructor_id: string
  title: string
  description: string
  price: string
  capacity: string
  hours: string
  status: string
  start_date: string
  end_date: string
}

const empty: FormState = {
  instructor_id: '',
  title: '',
  description: '',
  price: '0',
  capacity: '1',
  hours: '0',
  status: 'draft',
  start_date: '',
  end_date: '',
}

export default function CourseForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const { showToast } = useToast()

  const [form, setForm] = useState<FormState>(empty)
  const [instructors, setInstructors] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInstructors = getUsers({ role: 'instructor', per_page: 200 }).then(
      ({ data }) => setInstructors(data.data)
    )

    if (isEdit) {
      Promise.all([
        fetchInstructors,
        getCourse(Number(id)).then(({ data: c }) =>
          setForm({
            instructor_id: String(c.instructor_id),
            title: c.title,
            description: c.description ?? '',
            price: String(c.price),
            capacity: String(c.capacity),
            hours: String(c.hours ?? 0),
            status: c.status,
            start_date: c.start_date?.slice(0, 10) ?? '',
            end_date: c.end_date?.slice(0, 10) ?? '',
          })
        ),
      ])
        .catch(() => setApiError('Failed to load course data.'))
        .finally(() => setLoading(false))
    } else {
      fetchInstructors
        .catch(() => setApiError('Failed to load instructors.'))
        .finally(() => setLoading(false))
    }
  }, [id, isEdit])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n })
  }

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {}
    if (!form.instructor_id) e.instructor_id = 'Instructor is required.'
    if (!form.title.trim()) e.title = 'Title is required.'
    if (Number(form.price) < 0) e.price = 'Price must be ≥ 0.'
    if (Number(form.capacity) < 1) e.capacity = 'Capacity must be ≥ 1.'
    if (!form.start_date) e.start_date = 'Start date is required.'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }
    setSaving(true)
    setApiError(null)

    const payload: Partial<Course> = {
      instructor_id: Number(form.instructor_id),
      title: form.title,
      description: form.description,
      price: Number(form.price),
      capacity: Number(form.capacity),
      hours: Number(form.hours),
      status: form.status as Course['status'],
      start_date: form.start_date,
      end_date: form.end_date || null,
    }

    try {
      if (isEdit) {
        await updateCourse(Number(id), payload)
        showToast('Course updated successfully.')
      } else {
        await createCourse(payload)
        showToast('Course added successfully.')
      }
      navigate('/courses')
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }).response?.data
      if (resp?.errors) {
        setErrors(Object.fromEntries(Object.entries(resp.errors).map(([k, v]) => [k, v[0]])))
      } else {
        setApiError(resp?.message ?? 'An error occurred.')
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
              <h1 className="m-0">{isEdit ? 'Edit Course' : 'New Course'}</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/">Home</Link></li>
                <li className="breadcrumb-item"><Link to="/courses">Courses</Link></li>
                <li className="breadcrumb-item active">{isEdit ? 'Edit' : 'New'}</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-8">
              <div className="card card-primary">
                <div className="card-header">
                  <h3 className="card-title">{isEdit ? 'Edit Course' : 'Add New Course'}</h3>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="card-body">
                    {apiError && (
                      <div className="alert alert-danger">
                        <i className="fas fa-exclamation-triangle mr-2" />{apiError}
                      </div>
                    )}

                    <div className="form-group">
                      <label>Instructor <span className="text-danger">*</span></label>
                      <select
                        name="instructor_id"
                        className={`form-control${errors.instructor_id ? ' is-invalid' : ''}`}
                        value={form.instructor_id}
                        onChange={handleChange}
                      >
                        <option value="">— Select an instructor —</option>
                        {instructors.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      {errors.instructor_id && (
                        <div className="invalid-feedback">{errors.instructor_id}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Course Title <span className="text-danger">*</span></label>
                      <input
                        name="title"
                        type="text"
                        className={`form-control${errors.title ? ' is-invalid' : ''}`}
                        placeholder="Enter course title"
                        value={form.title}
                        onChange={handleChange}
                      />
                      {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        name="description"
                        className="form-control"
                        rows={4}
                        placeholder="Enter course description"
                        value={form.description}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="row">
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Price ($)</label>
                          <input
                            name="price"
                            type="number"
                            min={0}
                            step={0.01}
                            className={`form-control${errors.price ? ' is-invalid' : ''}`}
                            value={form.price}
                            onChange={handleChange}
                          />
                          {errors.price && <div className="invalid-feedback">{errors.price}</div>}
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Capacity</label>
                          <input
                            name="capacity"
                            type="number"
                            min={1}
                            className={`form-control${errors.capacity ? ' is-invalid' : ''}`}
                            value={form.capacity}
                            onChange={handleChange}
                          />
                          {errors.capacity && <div className="invalid-feedback">{errors.capacity}</div>}
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Hours / عدد الساعات</label>
                          <input
                            name="hours"
                            type="number"
                            min={0}
                            className="form-control"
                            value={form.hours}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="form-group">
                          <label>Status</label>
                          <select
                            name="status"
                            className="form-control"
                            value={form.status}
                            onChange={handleChange}
                          >
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Start Date <span className="text-danger">*</span></label>
                          <input
                            name="start_date"
                            type="date"
                            className={`form-control${errors.start_date ? ' is-invalid' : ''}`}
                            value={form.start_date}
                            onChange={handleChange}
                          />
                          {errors.start_date && <div className="invalid-feedback">{errors.start_date}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>End Date</label>
                          <input
                            name="end_date"
                            type="date"
                            className="form-control"
                            value={form.end_date}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving && <i className="fas fa-spinner fa-spin mr-2" />}
                      {isEdit ? 'Update Course' : 'Create Course'}
                    </button>
                    <Link to="/courses" className="btn btn-default ml-2">Cancel</Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
