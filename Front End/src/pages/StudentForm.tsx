import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getStudent, createStudent, updateStudent, getStudentDocuments, uploadStudentDocument, deleteStudentDocument } from '../api/students'
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
      .catch(() => setServerError('Failed to load student.'))
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
    if (!form.name.trim()) errs.name = 'Name is required.'
    if (!form.email.trim()) errs.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email.'
    if (form.phone && !/^[0-9+\-() ]{5,20}$/.test(form.phone)) errs.phone = 'Enter a valid phone number.'
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
        showToast('Student updated successfully.')
      } else {
        await createStudent(fd)
        showToast('Student added successfully.')
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
        setServerError(ax.response?.data?.message ?? 'An error occurred.')
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
      showToast('Document uploaded successfully.')
      loadDocuments()
    } catch {
      showToast('Failed to upload document.', 'error')
    } finally {
      setUploadingDoc(false)
      if (docRef.current) docRef.current.value = ''
    }
  }

  const handleDocumentDelete = async (docId: number) => {
    if (!confirm('Delete this document?') || !id) return
    setDeletingDocId(docId)
    try {
      await deleteStudentDocument(Number(id), docId)
      showToast('Document deleted.')
      loadDocuments()
    } catch {
      showToast('Failed to delete document.', 'error')
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
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">{isEdit ? 'Edit Student' : 'Add Student'}</h1>
            </div>
            <div className="col-sm-6 text-right">
              <Link to="/students" className="btn btn-default btn-sm">
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
                    {isEdit ? `Editing: ${student?.name}` : 'New Student'}
                  </h3>
                </div>
                <form onSubmit={handleSubmit} encType="multipart/form-data">
                  <div className="card-body">
                    {serverError && (
                      <div className="alert alert-danger">{serverError}</div>
                    )}

                    <div className="form-group text-center">
                      <div className="mb-2">
                        {photoPreview ? (
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="img-circle elevation-2"
                            style={{ width: 80, height: 80, objectFit: 'cover' }}
                          />
                        ) : (
                          <span className="img-circle bg-secondary d-inline-flex align-items-center justify-content-center"
                            style={{ width: 80, height: 80 }}>
                            <i className="fas fa-user fa-2x text-white" />
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-default btn-sm"
                        onClick={() => fileRef.current?.click()}
                      >
                        <i className="fas fa-camera mr-1" />
                        {photoPreview ? 'Change Photo' : 'Upload Photo'}
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="d-none"
                        onChange={handlePhotoChange}
                      />
                      {errors.photo && <div className="text-danger small mt-1">{errors.photo}</div>}
                    </div>

                    <div className="form-group">
                      <label>Full Name <span className="text-danger">*</span></label>
                      <input
                        name="name"
                        type="text"
                        className={`form-control${errors.name ? ' is-invalid' : ''}`}
                        placeholder="Enter full name"
                        value={form.name}
                        onChange={handleChange}
                      />
                      {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                    </div>

                    <div className="form-group">
                      <label>Email <span className="text-danger">*</span></label>
                      <input
                        name="email"
                        type="email"
                        className={`form-control${errors.email ? ' is-invalid' : ''}`}
                        placeholder="Enter email address"
                        value={form.email}
                        onChange={handleChange}
                      />
                      {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>

                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        name="phone"
                        type="text"
                        className={`form-control${errors.phone ? ' is-invalid' : ''}`}
                        placeholder="e.g. 0512345678"
                        value={form.phone}
                        onChange={handleChange}
                      />
                      {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                    </div>

                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input
                        name="date_of_birth"
                        type="date"
                        className={`form-control${errors.date_of_birth ? ' is-invalid' : ''}`}
                        value={form.date_of_birth}
                        onChange={handleChange}
                      />
                      {errors.date_of_birth && <div className="invalid-feedback">{errors.date_of_birth}</div>}
                    </div>

                    <div className="form-group">
                      <label>Address</label>
                      <textarea
                        name="address"
                        rows={3}
                        className={`form-control${errors.address ? ' is-invalid' : ''}`}
                        placeholder="Enter address"
                        value={form.address}
                        onChange={handleChange}
                      />
                      {errors.address && <div className="invalid-feedback">{errors.address}</div>}
                    </div>
                  </div>

                  <div className="card-footer">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving
                        ? <><i className="fas fa-spinner fa-spin mr-1" /> Saving...</>
                        : <><i className="fas fa-save mr-1" /> {isEdit ? 'Update Student' : 'Add Student'}</>
                      }
                    </button>
                    <Link to="/students" className="btn btn-default ml-2">Cancel</Link>
                  </div>
                </form>
              </div>
            </div>

            {isEdit && (
              <div className="col-md-8 mt-4">
                <div className="card card-secondary">
                  <div className="card-header d-flex align-items-center justify-content-between">
                    <h3 className="card-title">Attached Documents</h3>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => docRef.current?.click()}
                      disabled={uploadingDoc}
                    >
                      {uploadingDoc
                        ? <><i className="fas fa-spinner fa-spin mr-1" /> Uploading...</>
                        : <><i className="fas fa-upload mr-1" /> Upload Document</>
                      }
                    </button>
                    <input
                      ref={docRef}
                      type="file"
                      className="d-none"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                      onChange={handleDocumentUpload}
                    />
                  </div>
                  <div className="card-body p-0">
                    {documents.length === 0 ? (
                      <div className="text-center text-muted p-4">
                        <i className="fas fa-folder-open fa-2x mb-2 d-block" />
                        No documents uploaded yet.
                      </div>
                    ) : (
                      <table className="table table-hover mb-0">
                        <thead>
                          <tr>
                            <th>File</th>
                            <th>Size</th>
                            <th>Uploaded</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.map(doc => (
                            <tr key={doc.id}>
                              <td>
                                <i className={`${fileIcon(doc.mime_type)} mr-2`} />
                                <a href={doc.url} target="_blank" rel="noreferrer">{doc.original_name}</a>
                              </td>
                              <td className="text-muted small">{formatFileSize(doc.size)}</td>
                              <td className="text-muted small">{new Date(doc.created_at).toLocaleDateString()}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-xs btn-danger"
                                  disabled={deletingDocId === doc.id}
                                  onClick={() => handleDocumentDelete(doc.id)}
                                >
                                  {deletingDocId === doc.id
                                    ? <i className="fas fa-spinner fa-spin" />
                                    : <i className="fas fa-trash" />
                                  }
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
