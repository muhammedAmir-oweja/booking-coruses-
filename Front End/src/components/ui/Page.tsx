import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export interface Crumb {
  label: string
  to?: string
}

/**
 * The band every screen opens with: title, one line of context, the trail back,
 * and the screen's own actions.
 *
 * It replaces the AdminLTE `content-header` block that each page had copied -
 * nine near-identical slabs of Bootstrap grid, each with its own breadcrumb
 * markup, none of them agreeing on spacing.
 */
export default function PageHeader({ title, subtitle, crumbs = [], actions }: {
  title: string
  subtitle?: string
  crumbs?: Crumb[]
  actions?: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <header className="lmsd-head">
      <div className="lmsd-head-text">
        <h1>{title}</h1>
        {subtitle && <p className="lmsd-head-sub">{subtitle}</p>}
        <nav aria-label="breadcrumb" style={{ marginTop: 6 }}>
          <ol className="breadcrumb" style={{ background: 'transparent', padding: 0, margin: 0, fontSize: 'var(--fs-xs)' }}>
            <li className="breadcrumb-item"><Link to="/">{t('common.home')}</Link></li>
            {crumbs.map((c, i) => (
              <li
                key={c.label + i}
                className={`breadcrumb-item${i === crumbs.length - 1 ? ' active' : ''}`}
                aria-current={i === crumbs.length - 1 ? 'page' : undefined}
              >
                {c.to ? <Link to={c.to}>{c.label}</Link> : c.label}
              </li>
            ))}
          </ol>
        </nav>
      </div>
      {actions && <div className="lmsd-head-actions">{actions}</div>}
    </header>
  )
}
