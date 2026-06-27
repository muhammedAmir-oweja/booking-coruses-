import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { token } = await login(email, password)
      if (remember) {
        localStorage.setItem('auth_token', token)
        sessionStorage.removeItem('auth_token')
      } else {
        sessionStorage.setItem('auth_token', token)
        localStorage.removeItem('auth_token')
      }
      refresh()
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(msg ?? 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <i className="fas fa-graduation-cap" style={styles.leftIcon} />
          <h1 style={styles.leftTitle}>Course Booking</h1>
          <p style={styles.leftSub}>Manage courses, students, and sessions all in one place.</p>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.formBox}>
          <h2 style={styles.heading}>Welcome back</h2>
          <p style={styles.subHeading}>Administration Portal</p>

          {error && (
            <div style={styles.errorBox}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={styles.field}>
              <label style={styles.label}>Email address</label>
              <input
                type="email"
                style={styles.input}
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={{ ...styles.input, paddingRight: 44 }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                >
                  <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                </button>
              </div>
            </div>

            <div style={styles.rememberRow}>
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ marginRight: 6 }}
                />
                Keep me signed in
              </label>
            </div>

            <button type="submit" style={loading ? { ...styles.btn, opacity: 0.75 } : styles.btn} disabled={loading}>
              {loading
                ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }} />Signing in…</>
                : 'Sign In'}
            </button>
          </form>

          <p style={styles.bottomText}>
            Don't have an account?{' '}
            <Link to="/register" style={styles.link}>Create one</Link>
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
    width: '460px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f4f6f9',
    padding: '48px 32px',
  },
  formBox: {
    width: '100%',
    maxWidth: 380,
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
    transition: 'border-color 0.2s',
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
  rememberRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkLabel: {
    fontSize: 13,
    color: '#495057',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  forgotLink: {
    fontSize: 13,
    color: '#1a6fc4',
    textDecoration: 'none',
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
    transition: 'background 0.2s',
    marginBottom: 20,
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
