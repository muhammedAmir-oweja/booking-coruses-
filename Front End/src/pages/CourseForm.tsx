import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
        // Keys, not sentences: this effect must not depend on `t`.
        .catch(() => setApiError('course_form.load_failed'))
        .finally(() => setLoading(false))
    } else {
      fetchInstructors
        .catch(() => setApiError('course_form.load_instructors_failed'))
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
    if (!form.instructor_id) e.instructor_id = t('course_form.err_instructor')
    if (!form.title.trim()) e.title = t('course_form.err_title')
    if (Number(form.price) < 0) e.price = t('course_form.err_price')
    if (Number(form.capacity) < 1) e.capacity = t('course_form.err_capacity')
    if (!form.start_date) e.start_date = t('course_form.err_start_date')
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
        showToast(t('course_form.updated'))
      } else {
        await createCourse(payload)
        showToast(t('course_form.created'))
      }
      navigate('/courses')
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }).response?.data
      if (resp?.errors) {
        setErrors(Object.fromEntries(Object.entries(resp.errors).map(([k, v]) => [k, v[0]])))
      } else {
        setApiError(resp?.message ?? 'errors.generic')
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
              <h1 className="m-0">{isEdit ? t('course_form.edit_title') : t('course_form.new_title')}</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/">{t('common.home')}</Link></li>
                <li className="breadcrumb-item"><Link to="/courses">{t('courses.title')}</Link></li>
                <li className="breadcrumb-item active">{isEdit ? t('course_form.crumb_edit') : t('course_form.crumb_new')}</li>
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
                  <h3 className="card-title">{isEdit ? t('course_form.card_edit') : t('course_form.card_new')}</h3>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="card-body">
                    {apiError && (
                      <div className="alert alert-danger">
                        <i className="fas fa-exclamation-triangle mr-2" />{t(apiError)}
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="course-instructor">{t('course_form.instructor')} <span className="text-danger">*</span></label>
                      <select id="course-instructor"
                        name="instructor_id"
                        className={`form-control${errors.instructor_id ? ' is-invalid' : ''}`}
                        value={form.instructor_id}
                        onChange={handleChange}
                      >
                        <option value="">{t('course_form.select_instructor')}</option>
                        {instructors.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      {errors.instructor_id && (
                        <div className="invalid-feedback">{errors.instructor_id}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="course-title">{t('course_form.course_title')} <span className="text-danger">*</span></label>
                      <input id="course-title"
                        name="title"
                        type="text"
                        className={`form-control${errors.title ? ' is-invalid' : ''}`}
                        placeholder={t('course_form.title_placeholder')}
                        value={form.title}
                        onChange={handleChange}
                      />
                      {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="course-description">{t('course_form.description')}</label>
                      <textarea id="course-description"
                        name="description"
                        className="form-control"
                        rows={4}
                        placeholder={t('course_form.description_placeholder')}
                        value={form.description}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="row">
                      <div className="col-md-3">
                        <div className="form-group">
                          <label htmlFor="course-price">{t('course_form.price')}</label>
                          <input id="course-price"
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
                          <label htmlFor="course-capacity">{t('course_form.capacity')}</label>
                          <input id="course-capacity"
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
                          <label htmlFor="course-hours">{t('course_form.hours')}</label>
                          <input id="course-hours"
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
                          <label htmlFor="course-status">{t('course_form.status')}</label>
                          <select id="course-status"
                            name="status"
                            className="form-control"
                            value={form.status}
                            onChange={handleChange}
                          >
                            <option value="draft">{t('status.draft')}</option>
                            <option value="active">{t('status.active')}</option>
                            <option value="inactive">{t('status.inactive')}</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group">
                          <label htmlFor="course-start-date">{t('course_form.start_date')} <span className="text-danger">*</span></label>
                          <input id="course-start-date"
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
                          <label htmlFor="course-end-date">{t('course_form.end_date')}</label>
                          <input id="course-end-date"
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
                      {isEdit ? t('course_form.submit_edit') : t('course_form.submit_new')}
                    </button>
                    <Link to="/courses" className="btn btn-default ml-2">{t('common.cancel')}</Link>
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
