import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/ui/Page'
import Field from '../components/ui/Field'
import { ctl } from '../components/ui/form'
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
  const { t } = useTranslation()
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
        // Keys, not sentences: this effect must not depend on `t`.
        .catch(() => setServerError('session_form.load_failed'))
        .finally(() => setLoading(false))
    } else {
      fetchCourses
        .catch(() => setServerError('session_form.load_courses_failed'))
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
    if (!form.course_id) errs.course_id = t('session_form.err_course')
    if (!form.title.trim()) errs.title = t('session_form.err_title')
    if (!form.starts_at) errs.starts_at = t('session_form.err_starts_at')
    if (!form.ends_at) errs.ends_at = t('session_form.err_ends_at')
    else if (form.starts_at && form.ends_at <= form.starts_at)
      errs.ends_at = t('session_form.err_ends_after')
    if (form.max_attendees && Number(form.max_attendees) < 1)
      errs.max_attendees = t('session_form.err_max_attendees')
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
      description: form.description || null,
      starts_at: toApiFormat(form.starts_at),
      ends_at: toApiFormat(form.ends_at),
      location: form.location || null,
      max_attendees: form.max_attendees ? Number(form.max_attendees) : null,
      status: form.status as TrainingSession['status'],
    }

    try {
      if (isEdit) {
        await updateTrainingSession(Number(id), payload)
        showToast(t('session_form.updated'))
      } else {
        await createTrainingSession(payload)
        showToast(t('session_form.created'))
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
    <section className="content">
      <div className="container-fluid lmsd">
        <PageHeader
          title={isEdit ? t('session_form.edit_title') : t('session_form.new_title')}
          crumbs={[
            { label: t('sessions.title'), to: '/training-sessions' },
            { label: isEdit ? t('session_form.crumb_edit') : t('session_form.crumb_new') },
          ]}
        />

        <form onSubmit={handleSubmit}>
          <section className="lmsd-surface lmsd-panel" style={{ maxWidth: 860 }}>
            <div className="lmsd-panel-body">
              {serverError && (
                <div className="lmsd-note lmsd-note--warn" role="alert" style={{ marginBottom: 16 }}>
                  <span className="lmsd-chip"><i className="fas fa-exclamation-triangle" aria-hidden="true" /></span>
                  <span className="lmsd-note-text">{t(serverError)}</span>
                </div>
              )}

              <div className="lmsd-form-grid">
                <Field label={t('session_form.course')} htmlFor="session-course" required error={errors.course_id} span={6}>
                  <select id="session-course" name="course_id" className={ctl('select', errors.course_id)}
                    value={form.course_id} onChange={handleChange}>
                    <option value="">{t('session_form.select_course')}</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </Field>

                <Field label={t('session_form.status')} htmlFor="session-status" required span={6}>
                  <select id="session-status" name="status" className={ctl('select')} value={form.status} onChange={handleChange}>
                    <option value="scheduled">{t('status.scheduled')}</option>
                    <option value="ongoing">{t('status.ongoing')}</option>
                    <option value="completed">{t('status.completed')}</option>
                    <option value="cancelled">{t('status.cancelled')}</option>
                  </select>
                </Field>

                <Field label={t('session_form.title')} htmlFor="session-title" required error={errors.title}>
                  <input id="session-title" name="title" type="text" className={ctl('input', errors.title)}
                    placeholder={t('session_form.title_placeholder')} value={form.title} onChange={handleChange} />
                </Field>

                <Field label={t('session_form.description')} htmlFor="session-description">
                  <textarea id="session-description" name="description" rows={3} className={ctl('textarea')}
                    placeholder={t('session_form.description_placeholder')} value={form.description} onChange={handleChange} />
                </Field>

                <Field label={t('session_form.starts_at')} htmlFor="session-starts-at" required error={errors.starts_at} span={6}>
                  <input id="session-starts-at" name="starts_at" type="datetime-local"
                    className={ctl('input', errors.starts_at)} value={form.starts_at} onChange={handleChange} />
                </Field>

                <Field label={t('session_form.ends_at')} htmlFor="session-ends-at" required error={errors.ends_at} span={6}>
                  <input id="session-ends-at" name="ends_at" type="datetime-local"
                    className={ctl('input', errors.ends_at)} value={form.ends_at} onChange={handleChange} />
                </Field>

                <Field label={t('session_form.location')} htmlFor="session-location" span={6}>
                  <input id="session-location" name="location" type="text" className={ctl('input')}
                    placeholder={t('session_form.location_placeholder')} value={form.location} onChange={handleChange} />
                </Field>

                <Field label={t('session_form.max_attendees')} htmlFor="session-max-attendees" error={errors.max_attendees} span={6}>
                  <input id="session-max-attendees" name="max_attendees" type="number" min={1}
                    className={ctl('input', errors.max_attendees)}
                    placeholder={t('session_form.max_attendees_placeholder')}
                    value={form.max_attendees} onChange={handleChange} />
                </Field>
              </div>
            </div>

            <div className="lmsd-form-foot">
              <button type="submit" className="lmsd-btn lmsd-btn--primary" disabled={saving}>
                {saving && <i className="fas fa-spinner fa-spin" aria-hidden="true" />}
                {isEdit ? t('session_form.submit_edit') : t('session_form.submit_new')}
              </button>
              <Link to="/training-sessions" className="lmsd-btn lmsd-btn--ghost">{t('common.cancel')}</Link>
            </div>
          </section>
        </form>
      </div>
    </section>
  )
}
