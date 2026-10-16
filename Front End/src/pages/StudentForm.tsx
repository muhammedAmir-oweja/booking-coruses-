import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import PageHeader from '../components/ui/Page'
import Field from '../components/ui/Field'
import { ctl } from '../components/ui/form'
import { initialsOf } from '../components/ui/identity'
import { useFormat } from '../format'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getStudent, createStudent, updateStudent, getStudentDocuments, uploadStudentDocument, deleteStudentDocument, downloadStudentDocument } from '../api/students'
import type { Student, StudentDocument } from '../types'
import type { AxiosError } from 'axios'
import { useToast } from '../context/ToastContext'

interface FormState {
  name: string
  email: string
  phone: string
  date_of_birth: string
  address: string
}

const empty: FormState = {
  name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  address: '',
}

export default function StudentForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const fmt = useFormat()
  const { showToast } = useToast()

  const [form, setForm] = useState<FormState>(empty)
  const [student, setStudent] = useState<Student | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)

  const [documents, setDocuments] = useState<StudentDocument[]>([])
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null)

  const loadDocuments = () => {
    if (!isEdit || !id) return
    getStudentDocuments(Number(id)).then(({ data }) => setDocuments(data))
  }

  useEffect(() => {
    loadDocuments()
  }, [id, isEdit])

  useEffect(() => {
    if (!isEdit) return
    getStudent(Number(id))
      .then(({ data }) => {
        setStudent(data)
        setForm({
          name: data.name,
          email: data.email,
          phone: data.phone ?? '',
          date_of_birth: data.date_of_birth ?? '',
          address: data.address ?? '',
        })
        if (data.photo_url) setPhotoPreview(data.photo_url)
      })
      // A key, not a sentence - see the same note in Courses.tsx.
      .catch(() => setServerError('student_form.load_failed'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n })
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = t('student_form.err_name')
    if (!form.email.trim()) errs.email = t('student_form.err_email_required')
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = t('student_form.err_email_invalid')
    if (form.phone && !/^[0-9+\-() ]{5,20}$/.test(form.phone)) errs.phone = t('student_form.err_phone')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setServerError('')

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    if (photoFile) fd.append('photo', photoFile)

    try {
      if (isEdit) {
        await updateStudent(Number(id), fd)
        showToast(t('student_form.updated'))
      } else {
        await createStudent(fd)
        showToast(t('student_form.created'))
      }
      navigate('/students')
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

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setUploadingDoc(true)
    try {
      await uploadStudentDocument(Number(id), file)
      showToast(t('student_form.doc_uploaded'))
      loadDocuments()
    } catch {
      showToast(t('student_form.doc_upload_failed'), 'error')
    } finally {
      setUploadingDoc(false)
      if (docRef.current) docRef.current.value = ''
    }
  }

  const handleDocumentDownload = async (doc: StudentDocument) => {
    if (!id) return
    try {
      await downloadStudentDocument(Number(id), doc.id, doc.original_name)
    } catch {
      showToast(t('student_form.doc_download_failed'), 'error')
    }
  }

  const handleDocumentDelete = async (docId: number) => {
    if (!confirm(t('student_form.doc_delete_confirm')) || !id) return
    setDeletingDocId(docId)
    try {
      await deleteStudentDocument(Number(id), docId)
      showToast(t('student_form.doc_deleted'))
      loadDocuments()
    } catch {
      showToast(t('student_form.doc_delete_failed'), 'error')
    } finally {
      setDeletingDocId(null)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const fileIcon = (mime?: string) => {
    if (!mime) return 'fas fa-file'
    if (mime.includes('pdf')) return 'fas fa-file-pdf text-danger'
    if (mime.includes('word') || mime.includes('doc')) return 'fas fa-file-word text-primary'
    if (mime.includes('excel') || mime.includes('sheet')) return 'fas fa-file-excel text-success'
    if (mime.includes('image')) return 'fas fa-file-image text-info'
    if (mime.includes('zip')) return 'fas fa-file-archive text-warning'
    return 'fas fa-file'
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
          title={isEdit ? t('student_form.edit_title') : t('student_form.new_title')}
          subtitle={isEdit ? t('student_form.card_edit', { name: student?.name ?? '' }) : t('student_form.card_new')}
          crumbs={[
            { label: t('students.title'), to: '/students' },
            { label: isEdit ? t('student_form.crumb_edit') : t('student_form.crumb_new') },
          ]}
        />

        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <section className="lmsd-surface lmsd-panel" style={{ maxWidth: 860 }}>
            <div className="lmsd-panel-body">
              {serverError && (
                <div className="lmsd-note lmsd-note--warn" role="alert" style={{ marginBottom: 16 }}>
                  <span className="lmsd-chip"><i className="fas fa-exclamation-triangle" aria-hidden="true" /></span>
                  <span className="lmsd-note-text">{t(serverError)}</span>
                </div>
              )}

              {/* The photo sits beside the name rather than centred above the
                  form: it is one field among several, not a banner. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                {photoPreview
                  ? <img src={photoPreview} alt={t('student_form.photo_preview')} className="lms-avatar"
                      style={{ width: 72, height: 72, objectFit: 'cover' }} />
                  : <span className="lms-avatar" style={{ width: 72, height: 72, fontSize: 24 }} aria-hidden="true">
                      {initialsOf(form.name || '?')}
                    </span>}
                <div>
                  <button type="button" className="lmsd-btn lmsd-btn--ghost" onClick={() => fileRef.current?.click()}>
                    <i className="fas fa-camera" aria-hidden="true" />
                    {photoPreview ? t('student_form.change_photo') : t('student_form.upload_photo')}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                  {errors.photo && (
                    <span className="lmsd-error" style={{ marginTop: 6 }}>
                      <i className="fas fa-exclamation-circle" aria-hidden="true" />{errors.photo}
                    </span>
                  )}
                </div>
              </div>

              <div className="lmsd-form-grid">
                <Field label={t('student_form.name')} htmlFor="student-name" required error={errors.name} span={6}>
                  <input id="student-name" name="name" type="text" className={ctl('input', errors.name)}
                    placeholder={t('student_form.name_placeholder')} value={form.name} onChange={handleChange} />
                </Field>

                <Field label={t('student_form.email')} htmlFor="student-email" required error={errors.email} span={6}>
                  <input id="student-email" name="email" type="email" className={ctl('input', errors.email)}
                    placeholder={t('student_form.email_placeholder')} value={form.email} onChange={handleChange} />
                </Field>

                <Field label={t('student_form.phone')} htmlFor="student-phone" error={errors.phone} span={6}>
                  <input id="student-phone" name="phone" type="text" className={ctl('input', errors.phone)}
                    placeholder={t('student_form.phone_placeholder')} value={form.phone} onChange={handleChange} />
                </Field>

                <Field label={t('student_form.date_of_birth')} htmlFor="student-dob" error={errors.date_of_birth} span={6}>
                  <input id="student-dob" name="date_of_birth" type="date" className={ctl('input', errors.date_of_birth)}
                    value={form.date_of_birth} onChange={handleChange} />
                </Field>

                <Field label={t('student_form.address')} htmlFor="student-address">
                  <textarea id="student-address" name="address" rows={3} className={ctl('textarea')}
                    value={form.address} onChange={handleChange} />
                </Field>
              </div>
            </div>

            <div className="lmsd-form-foot">
              <button type="submit" className="lmsd-btn lmsd-btn--primary" disabled={saving}>
                <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'} aria-hidden="true" />
                {saving ? t('common.saving') : isEdit ? t('student_form.submit_edit') : t('student_form.submit_new')}
              </button>
              <Link to="/students" className="lmsd-btn lmsd-btn--ghost">{t('common.cancel')}</Link>
            </div>
          </section>
        </form>

        {isEdit && (
          <section className="lmsd-surface lmsd-panel" style={{ maxWidth: 860 }}>
            <header className="lmsd-panel-head">
              <span className="lmsd-chip"><i className="fas fa-paperclip" aria-hidden="true" /></span>
              <div className="lmsd-panel-heading">
                <h2 className="lmsd-panel-title">{t('student_form.documents')}</h2>
                <p className="lmsd-panel-sub">{t('common.total_count', { count: documents.length })}</p>
              </div>
              <div className="lmsd-panel-tools">
                <button type="button" className="lmsd-btn lmsd-btn--ghost"
                  onClick={() => docRef.current?.click()} disabled={uploadingDoc}>
                  <i className={uploadingDoc ? 'fas fa-spinner fa-spin' : 'fas fa-upload'} aria-hidden="true" />
                  {uploadingDoc ? t('student_form.uploading') : t('student_form.upload_document')}
                </button>
                <input ref={docRef} type="file" style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                  onChange={handleDocumentUpload} />
              </div>
            </header>

            <div className="lmsd-scroll">
              <table className="lmsd-table">
                <thead>
                  <tr>
                    <th>{t('student_form.doc_col.file')}</th>
                    <th>{t('student_form.doc_col.size')}</th>
                    <th>{t('student_form.doc_col.uploaded')}</th>
                    <th className="lmsd-th-num">{t('common.actions')}</th>
                  </tr>
                </thead>
                {!documents.length ? (
                  <tbody>
                    <tr>
                      <td colSpan={4}>
                        <div className="lmsd-empty">
                          <i className="far fa-folder-open" aria-hidden="true" />
                          {t('student_form.no_documents')}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td data-lead className="lmsd-cell-lead">
                          <div className="lmsd-who">
                            <i className={fileIcon(doc.mime_type)} aria-hidden="true" style={{ color: 'var(--ink-3)' }} />
                            <button type="button" className="lmsd-strong"
                              style={{ background: 'none', border: 0, padding: 0, textAlign: 'start', cursor: 'pointer' }}
                              onClick={() => handleDocumentDownload(doc)}>
                              {doc.original_name}
                            </button>
                          </div>
                        </td>
                        <td data-label={t('student_form.doc_col.size')}>{formatFileSize(doc.size)}</td>
                        <td data-label={t('student_form.doc_col.uploaded')}>{fmt.date(doc.created_at)}</td>
                        <td data-label={t('common.actions')}>
                          <div className="lmsd-actions">
                            <button type="button" className="lmsd-iconbtn lmsd-iconbtn--danger"
                              title={t('common.delete')} aria-label={t('common.delete')}
                              disabled={deletingDocId === doc.id}
                              onClick={() => handleDocumentDelete(doc.id)}>
                              <i className={deletingDocId === doc.id ? 'fas fa-spinner fa-spin' : 'fas fa-trash'} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </section>
        )}
      </div>
    </section>
  )
}
