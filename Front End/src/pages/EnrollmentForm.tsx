import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/ui/Page'
import Field from '../components/ui/Field'
import { ctl } from '../components/ui/form'
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
  const { t } = useTranslation()
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
      // `serverError` holds either one of our own keys or a message the API
      // already localized (SetLocale honours X-Locale). It is rendered through
      // t(), which passes an unrecognised string straight back - so our keys
      // re-localize on a language switch and server text is shown verbatim.
      .catch(() => setServerError('enrollment_form.load_failed'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n })
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.student_id) errs.student_id = t('enrollment_form.err_student')
    if (!form.course_id) errs.course_id = t('enrollment_form.err_course')
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
      showToast(t('enrollment_form.created'))
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
        setServerError(ax.response?.data?.message ?? 'errors.generic')
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
          title={t('enrollment_form.title')}
          subtitle={t('enrollment_form.card')}
          crumbs={[
            { label: t('enrollments.title'), to: '/enrollments' },
            { label: t('enrollment_form.card') },
          ]}
        />

        <form onSubmit={handleSubmit}>
          <section className="lmsd-surface lmsd-panel" style={{ maxWidth: 720 }}>
            <div className="lmsd-panel-body">
              {serverError && (
                <div className="lmsd-note lmsd-note--warn" role="alert" style={{ marginBottom: 16 }}>
                  <span className="lmsd-chip"><i className="fas fa-exclamation-triangle" aria-hidden="true" /></span>
                  <span className="lmsd-note-text">{t(serverError)}</span>
                </div>
              )}

              <div className="lmsd-form-grid">
                <Field label={t('enrollment_form.student')} htmlFor="enrollment-student" required error={errors.student_id}>
                  <select id="enrollment-student" name="student_id" className={ctl('select', errors.student_id)}
                    value={form.student_id} onChange={handleChange}>
                    <option value="">{t('enrollment_form.select_student')}</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                  </select>
                </Field>

                <Field label={t('enrollment_form.course')} htmlFor="enrollment-course" required error={errors.course_id}>
                  <select id="enrollment-course" name="course_id" className={ctl('select', errors.course_id)}
                    value={form.course_id} onChange={handleChange}>
                    <option value="">{t('enrollment_form.select_course')}</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id} disabled={!c.is_available}>
                        {c.is_available
                          ? t('enrollment_form.course_seats_left', { title: c.title, count: c.remaining_seats })
                          : t('enrollment_form.course_full', { title: c.title })}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={t('enrollment_form.enrollment_date')} htmlFor="enrollment-date" span={6}>
                  <input id="enrollment-date" name="enrolled_at" type="date" className={ctl('input')}
                    value={form.enrolled_at} onChange={handleChange} />
                </Field>

                <Field label={t('enrollment_form.status')} htmlFor="enrollment-status" span={6}>
                  <select id="enrollment-status" name="status" className={ctl('select')} value={form.status} onChange={handleChange}>
                    <option value="confirmed">{t('status.confirmed')}</option>
                    <option value="pending">{t('status.pending')}</option>
                    <option value="cancelled">{t('status.cancelled')}</option>
                  </select>
                </Field>
              </div>
            </div>

            <div className="lmsd-form-foot">
              <button type="submit" className="lmsd-btn lmsd-btn--primary" disabled={saving}>
                {saving && <i className="fas fa-spinner fa-spin" aria-hidden="true" />}
                {t('enrollment_form.title')}
              </button>
              <Link to="/enrollments" className="lmsd-btn lmsd-btn--ghost">{t('common.cancel')}</Link>
            </div>
          </section>
        </form>
      </div>
    </section>
  )
}
