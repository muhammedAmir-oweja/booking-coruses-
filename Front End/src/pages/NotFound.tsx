import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <h1 className="m-0">{t('not_found.title')}</h1>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid">
          <div className="error-page">
            <h2 className="headline text-warning">404</h2>
            <div className="error-content">
              <h3>
                <i className="fas fa-exclamation-triangle text-warning mr-2" />
                {t('not_found.heading')}
              </h3>
              <p>
                {t('not_found.body')}{' '}
                <Link to="/">{t('not_found.back')}</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
