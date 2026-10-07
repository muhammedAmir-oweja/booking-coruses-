import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const { t } = useTranslation()

  return (
    <div className="hold-transition login-page">
      <div className="login-box">
        <div className="login-logo">
          <i className="fas fa-graduation-cap mr-2" style={{ color: '#007bff' }} />
          <b>{t('app.name')}</b>
        </div>

        <div className="card">
          <div className="card-body login-card-body">
            <p className="login-box-msg">{t('auth.forgot_title')}</p>

            <div className="alert alert-info text-center">
              <i className="fas fa-info-circle mr-2" />
              {t('auth.forgot_unavailable')}
              <br />
              {t('auth.forgot_contact_admin')}
            </div>

            <div className="mt-3 text-center">
              <Link to="/login" className="btn btn-default btn-block">
                <i className="fas fa-arrow-left mr-1" /> {t('auth.back_to_login')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
