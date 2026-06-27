import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { useAuth } from '../context/AuthContext'

interface FormState {
  name: string
  email: string
  role: 'student' | 'instructor'
  password: string
  password_confirmation: string
}

interface FieldErrors {
  name?: string
  email?: string
  password?: string
  password_confirmation?: string
}

export default function Register() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    role: 'student',
    password: '',
    password_confirmation: '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [field]: e.target.value }))
      setErrors(prev => { const n = { ...prev }; delete n[field as keyof FieldErrors]; return n })
    }

  const validate = (): FieldErrors => {
    const e: FieldErrors = {}
    if (!form.name.trim()) e.name = 'Full name is required.'
    if (!form.email.trim()) e.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email.'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (form.password !== form.password_confirmation) e.password_confirmation = 'Passwords do not match.'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = validate()
    if (Object.keys(v).length) { setErrors(v); return }
    setLoading(true)
    setApiError(null)
    try {
      const { token } = await register(form.name, form.email, form.password, form.password_confirmation, form.role)
      localStorage.setItem('auth_token', token)
      sessionStorage.removeItem('auth_token')
      refresh()
      navigate('/')
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }).response?.data
      if (data?.errors) {
        setErrors(Object.fromEntries(Object.entries(data.errors).map(([k, v]) => [k, (v as string[])[0]])))
      } else {
        setApiError(data?.message ?? 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      {/* Left panel */}
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <i className="fas fa-graduation-cap" style={styles.leftIcon} />
          <h1 style={styles.leftTitle}>Course Booking</h1>
          <p style={styles.leftSub}>Join us to access courses, training sessions, and more.</p>
        </div>
      </div>

      {/* Right panel */}
      <div style={styles.right}>
        <div style={styles.formBox}>
          <h2 style={styles.heading}>Create an account</h2>
          <p style={styles.subHeading}>Fill in the details below to get started</p>

          {apiError && (
            <div style={styles.errorBox}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                style={errors.name ? { ...styles.input, ...styles.inputError } : styles.input}
                placeholder="John Smith"
                autoComplete="name"
                value={form.name}
                onChange={set('name')}
              />
              {errors.name && <span style={styles.fieldError}>{errors.name}</span>}
            </div>

            {/* Email */}
            <div style={styles.field}>
              <label style={styles.label}>Email address</label>
              <input
                type="email"
                style={errors.email ? { ...styles.input, ...styles.inputError } : styles.input}
                placeholder="you@example.com"
                autoComplete="email"
                value={form.email}
                onChange={set('email')}
              />
              {errors.email && <span style={styles.fieldError}>{errors.email}</span>}
            </div>

            {/* Role */}
            <div style={styles.field}>
              <label style={styles.label}>I am a</label>
              <div style={styles.roleRow}>
                {(['student', 'instructor'] as const).map(r => (
                  <label
                    key={r}
                    style={form.role === r ? { ...styles.roleOption, ...styles.roleOptionActive } : styles.roleOption}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r}
                      checked={form.role === r}
                      onChange={set('role')}
                      style={{ display: 'none' }}
                    />
                    <i className={r === 'student' ? 'fas fa-user-graduate' : 'fas fa-chalkboard-teacher'} style={{ marginRight: 8 }} />
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {/* Password */}
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={errors.password
                    ? { ...styles.input, ...styles.inputError, paddingRight: 44 }
                    : { ...styles.input, paddingRight: 44 }}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set('password')}
                />
                <button type="button" style={styles.eyeBtn} tabIndex={-1} onClick={() => setShowPassword(v => !v)}>
                  <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                </button>
              </div>
              {errors.password && <span style={styles.fieldError}>{errors.password}</span>}
            </div>

            {/* Confirm Password */}
            <div style={styles.field}>
              <label style={styles.label}>Confirm Password</label>
              <div style={styles.inputWrap}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  style={errors.password_confirmation
                    ? { ...styles.input, ...styles.inputError, paddingRight: 44 }
                    : { ...styles.input, paddingRight: 44 }}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  value={form.password_confirmation}
                  onChange={set('password_confirmation')}
                />
                <button type="button" style={styles.eyeBtn} tabIndex={-1} onClick={() => setShowConfirm(v => !v)}>
                  <i className={showConfirm ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                </button>
              </div>
              {errors.password_confirmation && <span style={styles.fieldError}>{errors.password_confirmation}</span>}
            </div>

            <button type="submit" style={loading ? { ...styles.btn, opacity: 0.75 } : styles.btn} disabled={loading}>
              {loading
                ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Creating account…</>
                : 'Create Account'}
            </button>
          </form>

          <p style={styles.bottomText}>
            Already have an account?{' '}
            <Link to="/login" style={styles.link}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Source Sans Pro', 'Helvetica Neue', Arial, sans-serif",
  },
  left: {
    flex: 1,
    background: 'linear-gradient(135deg, #1a6fc4 0%, #0d3d6e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 40px',
  },
  leftInner: {
    textAlign: 'center',
    color: '#fff',
    maxWidth: 340,
  },
  leftIcon: {
    fontSize: 56,
    marginBottom: 20,
    opacity: 0.95,
  },
  leftTitle: {
    fontSize: 32,
    fontWeight: 700,
    margin: '0 0 16px',
    letterSpacing: '-0.5px',
  },
  leftSub: {
    fontSize: 16,
    opacity: 0.82,
    lineHeight: 1.6,
    margin: 0,
  },
  right: {
    width: '500px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f4f6f9',
    padding: '48px 32px',
    overflowY: 'auto',
  },
  formBox: {
    width: '100%',
    maxWidth: 420,
  },
  heading: {
    fontSize: 26,
    fontWeight: 700,
    color: '#1d2d44',
    margin: '0 0 6px',
  },
  subHeading: {
    fontSize: 14,
    color: '#6c757d',
    margin: '0 0 28px',
  },
  errorBox: {
    background: '#fde8e8',
    border: '1px solid #f5c6cb',
    color: '#721c24',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 14,
    marginBottom: 20,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#495057',
    marginBottom: 6,
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    border: '1px solid #ced4da',
    borderRadius: 8,
    outline: 'none',
    background: '#fff',
    color: '#343a40',
    boxSizing: 'border-box',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  fieldError: {
    display: 'block',
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
  inputWrap: {
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6c757d',
    fontSize: 14,
    padding: 0,
  },
  roleRow: {
    display: 'flex',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 14px',
    border: '1px solid #ced4da',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    color: '#495057',
    background: '#fff',
    transition: 'all 0.15s',
    userSelect: 'none',
  },
  roleOptionActive: {
    border: '2px solid #1a6fc4',
    color: '#1a6fc4',
    fontWeight: 600,
    background: '#eaf2fb',
  },
  btn: {
    display: 'block',
    width: '100%',
    padding: '11px',
    background: '#1a6fc4',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 20,
    marginTop: 8,
  },
  bottomText: {
    fontSize: 13,
    color: '#6c757d',
    textAlign: 'center',
    margin: 0,
  },
  link: {
    color: '#1a6fc4',
    textDecoration: 'none',
    fontWeight: 600,
  },
}
