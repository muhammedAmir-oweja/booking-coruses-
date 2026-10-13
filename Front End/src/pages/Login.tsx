import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
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
      setError(msg ?? 'auth.login_failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page} className="lms-auth-page">
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <i className="fas fa-graduation-cap" style={styles.leftIcon} />
          <h1 style={styles.leftTitle}>{t('app.name')}</h1>
          <p style={styles.leftSub}>{t('auth.brand_tagline')}</p>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.formBox}>
          <h2 style={styles.heading}>{t('auth.login_title')}</h2>
          <p style={styles.subHeading}>{t('auth.login_subtitle')}</p>

          {error && (
            <div style={styles.errorBox}>
              <i className="fas fa-exclamation-circle" style={{ marginInlineEnd: 8 }} />
              {t(error)}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div style={styles.field}>
              <label style={styles.label}>{t('auth.email')}</label>
              <input
                type="email"
                style={styles.input}
                placeholder={t('auth.email_placeholder')}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>{t('auth.password')}</label>
              <div style={styles.inputWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={{ ...styles.input, paddingInlineEnd: 44 }}
                  placeholder={t('auth.password_placeholder')}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  tabIndex={-1}
                  aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
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
                  style={{ marginInlineEnd: 6 }}
                />
                {t('auth.remember_me')}
              </label>
            </div>

            <button type="submit" style={loading ? { ...styles.btn, opacity: 0.75 } : styles.btn} disabled={loading}>
              {loading
                ? <><i className="fas fa-spinner fa-spin" style={{ marginInlineEnd: 8 }} />{t('auth.signing_in')}</>
                : t('auth.sign_in')}
            </button>
          </form>

          <p style={styles.bottomText}>
            {t('auth.no_account')}{' '}
            <Link to="/register" style={styles.link}>{t('auth.create_one')}</Link>
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
    // Arabic first in the stack: this inline style beats the html[dir='rtl']
    // rule in index.css, so without it the login page alone would fall back
    // to a font with no Arabic glyphs.
    fontFamily: "'IBM Plex Sans Arabic', 'Source Sans Pro', 'Helvetica Neue', Arial, sans-serif",
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
    width: 'clamp(320px, 38vw, 460px)',
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
    insetInlineEnd: 12,
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
