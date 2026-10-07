import { useTranslation } from 'react-i18next'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="main-footer">
      <strong>{t('app.full_name')}</strong> &mdash; {t('app.rights')}
      <div className="float-right d-none d-sm-inline-block">
        <b>{t('app.version')}</b> <span className="text-ltr">1.0.0</span>
      </div>
    </footer>
  )
}
