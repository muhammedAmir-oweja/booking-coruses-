import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getTrainingSession, createTrainingSession, updateTrainingSession } from '../api/trainingSessions'
import { getCourses } from '../api/courses'
import type { TrainingSession, Course } from '../types'
import type { AxiosError } from 'axios'
import { useToast } from '../context/ToastContext'

interface FormState {
  course_id: string
  title: string
  description: string
  starts_at: string
  ends_at: string
  location: string
  max_attendees: string
  status: string
}

const empty: FormState = {
  course_id: '',
  title: '',
  description: '',
  starts_at: '',
  ends_at: '',
  location: '',
  max_attendees: '',
  status: 'scheduled',
}

function toInputFormat(dt: string): string {
  if (!dt) return ''
  return dt.replace(' ', 'T').slice(0, 16)
}

function toApiFormat(dt: string): string {
  if (!dt) return ''
  return dt.replace('T', ' ') + ':00'
}

export default function TrainingSessionForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [form, setForm] = useState<FormState>(empty)
  const [courses, setCourses] = useState<Course[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')

  useEffect(() => {
    const fetchCourses = getCourses({ page: 1, per_page: 200 }).then(({ data }) => setCourses(data.data))

    if (isEdit) {
      Promise.all([
        fetchCourses,
        getTrainingSession(Number(id)).then(({ data }) => {
          setForm({
            course_id: String(data.course_id),
            title: data.title,
            description: data.description ?? '',
            starts_at: toInputFormat(data.starts_at),
            ends_at: toInputFormat(data.ends_at),
            location: data.location ?? '',
            max_attendees: data.max_attendees != null ? String(data.max_attendees) : '',
            status: data.status,
          })
        }),
      ])
        .catch(() => setServerError('Failed to load data.'))
        .finally(() => setLoading(false))
    } else {
      fetchCourses
        .catch(() => setServerError('Failed to load courses.'))
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

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.course_id) errs.course_id = 'Course is required.'
    if (!form.title.trim()) errs.title = 'Title is required.'
    if (!form.starts_at) errs.starts_at = 'Start time is required.'
    if (!form.ends_at) errs.ends_at = 'End time is required.'
    else if (form.starts_at && form.ends_at <= form.starts_at)
      errs.ends_at = 'End time must be after start time.'
    if (form.max_attendees && Number(form.max_attendees) < 1)
      errs.max_attendees = 'Must be at least 1.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setServerError('')

    const payload: Partial<TrainingSession> = {
      course_id: Number(form.course_id),
      title: form.title,
      description: form.description || undefined,
      starts_at: toApiFormat(form.starts_at),
      ends_at: toApiFormat(form.ends_at),
      location: form.location || undefined,
      max_attendees: form.max_attendees ? Number(form.max_attendees) : undefined,
      status: form.status as TrainingSession['status'],
    }

    try {
      if (isEdit) {
        await updateTrainingSession(Number(id), payload)
        showToast('Training session updated successfully.')
      } else {
        await createTrainingSession(payload)
        showToast('Training session added successfully.')
      }
      navigate('/training-sessions')
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
              <h1 className="m-0">{isEdit ? 'Edit Session' : 'Add Session'}</h1>
            </div>
            <div className="col-sm-6 text-right">
              <Link to="/training-sessions" className="btn btn-default btn-sm">
                <i className="fas fa-arrow-left mr-1" /> Back
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-8">
              <div className="card card-primary">
                <div className="card-header">
                  <h3 className="card-title">
                    {isEdit ? 'Edit Training Session' : 'New Training Session'}
                  </h3>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="card-body">
                    {serverError && (
                      <div className="alert alert-danger">{serverError}</div>
                    )}

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
                      <label>Session Title <span className="text-danger">*</span></label>
                      <input
                        name="title"
                        type="text"
                        className={`form-control${errors.title ? ' is-invalid' : ''}`}
                        placeholder="e.g. Introduction to Routing"
                        value={form.title}
                        onChange={handleChange}
                      />
                      {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        name="description"
                        rows={3}
                        className="form-control"
                        placeholder="Optional description"
                        value={form.description}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Starts At <span className="text-danger">*</span></label>
                          <input
                            name="starts_at"
                            type="datetime-local"
                            className={`form-control${errors.starts_at ? ' is-invalid' : ''}`}
                            value={form.starts_at}
                            onChange={handleChange}
                          />
                          {errors.starts_at && <div className="invalid-feedback">{errors.starts_at}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Ends At <span className="text-danger">*</span></label>
                          <input
                            name="ends_at"
                            type="datetime-local"
                            className={`form-control${errors.ends_at ? ' is-invalid' : ''}`}
                            value={form.ends_at}
                            onChange={handleChange}
                          />
                          {errors.ends_at && <div className="invalid-feedback">{errors.ends_at}</div>}
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Location</label>
                      <input
                        name="location"
                        type="text"
                        className="form-control"
                        placeholder="e.g. Room 101 / Online"
                        value={form.location}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Max Attendees</label>
                          <input
                            name="max_attendees"
                            type="number"
                            min={1}
                            className={`form-control${errors.max_attendees ? ' is-invalid' : ''}`}
                            placeholder="Leave blank for unlimited"
                            value={form.max_attendees}
                            onChange={handleChange}
                          />
                          {errors.max_attendees && <div className="invalid-feedback">{errors.max_attendees}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group">
                          <label>Status <span className="text-danger">*</span></label>
                          <select
                            name="status"
                            className="form-control"
                            value={form.status}
                            onChange={handleChange}
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-footer">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving
                        ? <><i className="fas fa-spinner fa-spin mr-1" /> Saving...</>
                        : <><i className="fas fa-save mr-1" /> {isEdit ? 'Update Session' : 'Add Session'}</>
                      }
                    </button>
                    <Link to="/training-sessions" className="btn btn-default ml-2">Cancel</Link>
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
