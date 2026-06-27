import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMe, changePassword } from '../api/auth'
import type { User } from '../types'
import { useToast } from '../context/ToastContext'

const ROLE_BADGES: Record<string, string> = {
  admin:      'badge-danger',
  instructor: 'badge-info',
  student:    'badge-success',
}

export default function Profile() {
  const { showToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [pwForm, setPwForm] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({})
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false))
  }, [])

  const handlePwChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPwForm(prev => ({ ...prev, [name]: value }))
    if (pwErrors[name]) setPwErrors(prev => { const n = { ...prev }; delete n[name]; return n })
  }

  const handlePwSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!pwForm.current_password) errs.current_password = 'Current password is required.'
    if (!pwForm.password) errs.password = 'New password is required.'
    if (pwForm.password.length < 8) errs.password = 'Password must be at least 8 characters.'
    if (pwForm.password !== pwForm.password_confirmation) errs.password_confirmation = 'Passwords do not match.'
    if (Object.keys(errs).length) { setPwErrors(errs); return }

    setPwSaving(true)
    try {
      await changePassword(pwForm.current_password, pwForm.password, pwForm.password_confirmation)
      showToast('Password changed successfully.')
      setPwForm({ current_password: '', password: '', password_confirmation: '' })
      setPwErrors({})
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }).response?.data
      if (resp?.errors) {
        setPwErrors(Object.fromEntries(Object.entries(resp.errors).map(([k, v]) => [k, v[0]])))
      } else {
        showToast(resp?.message ?? 'Failed to change password.', 'error')
      }
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">My Profile</h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/">Home</Link></li>
                <li className="breadcrumb-item active">Profile</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {loading && (
            <div className="text-center p-5">
              <i className="fas fa-spinner fa-spin fa-2x" />
            </div>
          )}

          {error && (
            <div className="alert alert-danger">{error}</div>
          )}

          {user && (
            <div className="row">
              <div className="col-md-4">
                <div className="card card-primary card-outline">
                  <div className="card-body box-profile text-center">
                    <div className="mb-3">
                      <span
                        className="img-circle bg-secondary d-inline-flex align-items-center justify-content-center elevation-2"
                        style={{ width: 90, height: 90 }}
                      >
                        <i className="fas fa-user fa-2x text-white" />
                      </span>
                    </div>
                    <h3 className="profile-username">{user.name}</h3>
                    <p className="text-muted">
                      <span className={`badge ${ROLE_BADGES[user.role] ?? 'badge-secondary'}`}>
                        {user.role}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-8">
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Account Information</h3>
                  </div>
                  <div className="card-body">
                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label font-weight-bold">Full Name</label>
                      <div className="col-sm-9">
                        <p className="form-control-plaintext">{user.name}</p>
                      </div>
                    </div>
                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label font-weight-bold">Email</label>
                      <div className="col-sm-9">
                        <p className="form-control-plaintext">{user.email}</p>
                      </div>
                    </div>
                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label font-weight-bold">Role</label>
                      <div className="col-sm-9">
                        <p className="form-control-plaintext text-capitalize">{user.role}</p>
                      </div>
                    </div>
                    <div className="form-group row">
                      <label className="col-sm-3 col-form-label font-weight-bold">Member Since</label>
                      <div className="col-sm-9">
                        <p className="form-control-plaintext">
                          {new Date(user.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'long', year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card card-warning">
                  <div className="card-header">
                    <h3 className="card-title"><i className="fas fa-lock mr-2" />Change Password</h3>
                  </div>
                  <form onSubmit={handlePwSubmit}>
                    <div className="card-body">
                      <div className="form-group">
                        <label>Current Password</label>
                        <input
                          name="current_password"
                          type="password"
                          className={`form-control${pwErrors.current_password ? ' is-invalid' : ''}`}
                          value={pwForm.current_password}
                          onChange={handlePwChange}
                          autoComplete="current-password"
                        />
                        {pwErrors.current_password && <div className="invalid-feedback">{pwErrors.current_password}</div>}
                      </div>
                      <div className="form-group">
                        <label>New Password</label>
                        <input
                          name="password"
                          type="password"
                          className={`form-control${pwErrors.password ? ' is-invalid' : ''}`}
                          value={pwForm.password}
                          onChange={handlePwChange}
                          autoComplete="new-password"
                        />
                        {pwErrors.password && <div className="invalid-feedback">{pwErrors.password}</div>}
                      </div>
                      <div className="form-group">
                        <label>Confirm New Password</label>
                        <input
                          name="password_confirmation"
                          type="password"
                          className={`form-control${pwErrors.password_confirmation ? ' is-invalid' : ''}`}
                          value={pwForm.password_confirmation}
                          onChange={handlePwChange}
                          autoComplete="new-password"
                        />
                        {pwErrors.password_confirmation && <div className="invalid-feedback">{pwErrors.password_confirmation}</div>}
                      </div>
                    </div>
                    <div className="card-footer">
                      <button type="submit" className="btn btn-warning" disabled={pwSaving}>
                        {pwSaving && <i className="fas fa-spinner fa-spin mr-2" />}
                        Change Password
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
