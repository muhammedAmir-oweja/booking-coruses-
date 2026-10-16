import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/ui/Page'
import Field from '../components/ui/Field'
import { ctl } from '../components/ui/form'
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
    <section className="content">
      <div className="container-fluid lmsd">
        <PageHeader
          title={isEdit ? t('course_form.edit_title') : t('course_form.new_title')}
          subtitle={isEdit ? t('course_form.card_edit') : t('course_form.card_new')}
          crumbs={[
            { label: t('courses.title'), to: '/courses' },
            { label: isEdit ? t('course_form.crumb_edit') : t('course_form.crumb_new') },
          ]}
        />

        <form onSubmit={handleSubmit}>
          <section className="lmsd-surface lmsd-panel" style={{ maxWidth: 860 }}>
            <div className="lmsd-panel-body">
              {apiError && (
                <div className="lmsd-note lmsd-note--warn" role="alert" style={{ marginBottom: 16 }}>
                  <span className="lmsd-chip"><i className="fas fa-exclamation-triangle" aria-hidden="true" /></span>
                  <span className="lmsd-note-text">{t(apiError)}</span>
                </div>
              )}

              <div className="lmsd-form-grid">
                <Field label={t('course_form.instructor')} htmlFor="course-instructor" required error={errors.instructor_id} span={6}>
                  <select
                    id="course-instructor"
                    name="instructor_id"
                    className={ctl('select', errors.instructor_id)}
                    value={form.instructor_id}
                    onChange={handleChange}
                  >
                    <option value="">{t('course_form.select_instructor')}</option>
                    {instructors.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </Field>

                <Field label={t('course_form.status')} htmlFor="course-status" span={6}>
                  <select id="course-status" name="status" className={ctl('select')} value={form.status} onChange={handleChange}>
                    <option value="draft">{t('status.draft')}</option>
                    <option value="active">{t('status.active')}</option>
                    <option value="inactive">{t('status.inactive')}</option>
                    <option value="completed">{t('status.completed')}</option>
                  </select>
                </Field>

                <Field label={t('course_form.course_title')} htmlFor="course-title" required error={errors.title}>
                  <input
                    id="course-title"
                    name="title"
                    type="text"
                    className={ctl('input', errors.title)}
                    placeholder={t('course_form.title_placeholder')}
                    value={form.title}
                    onChange={handleChange}
                  />
                </Field>

                <Field label={t('course_form.description')} htmlFor="course-description">
                  <textarea
                    id="course-description"
                    name="description"
                    className={ctl('textarea')}
                    rows={4}
                    placeholder={t('course_form.description_placeholder')}
                    value={form.description}
                    onChange={handleChange}
                  />
                </Field>

                <Field label={t('course_form.price')} htmlFor="course-price" error={errors.price} span={4}>
                  <input id="course-price" name="price" type="number" min={0} step={0.01}
                    className={ctl('input', errors.price)} value={form.price} onChange={handleChange} />
                </Field>

                <Field label={t('course_form.capacity')} htmlFor="course-capacity" error={errors.capacity} span={4}>
                  <input id="course-capacity" name="capacity" type="number" min={1}
                    className={ctl('input', errors.capacity)} value={form.capacity} onChange={handleChange} />
                </Field>

                <Field label={t('course_form.hours')} htmlFor="course-hours" span={4}>
                  <input id="course-hours" name="hours" type="number" min={0}
                    className={ctl('input')} value={form.hours} onChange={handleChange} />
                </Field>

                <Field label={t('course_form.start_date')} htmlFor="course-start-date" required error={errors.start_date} span={6}>
                  <input id="course-start-date" name="start_date" type="date"
                    className={ctl('input', errors.start_date)} value={form.start_date} onChange={handleChange} />
                </Field>

                <Field label={t('course_form.end_date')} htmlFor="course-end-date" span={6}>
                  <input id="course-end-date" name="end_date" type="date"
                    className={ctl('input')} value={form.end_date} onChange={handleChange} />
                </Field>
              </div>
            </div>

            <div className="lmsd-form-foot">
              <button type="submit" className="lmsd-btn lmsd-btn--primary" disabled={saving}>
                {saving && <i className="fas fa-spinner fa-spin" aria-hidden="true" />}
                {isEdit ? t('course_form.submit_edit') : t('course_form.submit_new')}
              </button>
              <Link to="/courses" className="lmsd-btn lmsd-btn--ghost">{t('common.cancel')}</Link>
            </div>
          </section>
        </form>
      </div>
    </section>
  )
}
