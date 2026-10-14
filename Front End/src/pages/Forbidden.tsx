import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * Shown when a signed-in user reaches a route their role cannot open.
 *
 * Deliberately a screen and not a silent redirect to the dashboard: these
 * routes are reachable by a bookmark, a shared link or the back button, and
 * bouncing someone somewhere else without a word reads as the app losing their
 * click. Saying "you are signed in, this page is not yours" is the honest
 * answer - and it is a very different statement from NotFound's "no such page".
 */
export default function Forbidden() {
  const { t } = useTranslation()

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <h1 className="m-0">{t('forbidden.title')}</h1>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid">
          <div className="error-page">
            <h2 className="headline text-warning">403</h2>
            <div className="error-content">
              <h3>
                <i className="fas fa-lock text-warning mr-2" />
                {t('forbidden.heading')}
              </h3>
              <p>
                {t('forbidden.body')}{' '}
                <Link to="/">{t('forbidden.back')}</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
