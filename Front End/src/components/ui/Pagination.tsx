import { useTranslation } from 'react-i18next'
import { usePreferences } from '../../context/PreferencesContext'
import { PER_PAGE_OPTIONS, type PerPage } from '../../prefs'

interface PaginationProps {
  page: number
  lastPage: number
  /** Total row count, when the caller knows it - shown beside the page size. */
  total?: number
  onPage: (page: number) => void
  /** Re-fetch at page 1 after the page size changes. */
  onPageSizeChange: () => void
}

/**
 * The shared list footer: page size on one end, windowed page numbers on the
 * other.
 *
 * Every list page used to inline `Array.from({ length: lastPage })`, which
 * renders one button per page - 100 of them for 1,000 rows at the default 10,
 * wrapping across several lines of the footer. This windows to first / last /
 * current +-2 with ellipses, so the control is a fixed size whatever the row
 * count.
 *
 * The size selector is also the only way the stored `per_page` preference can
 * ever be set. It was read, validated and synced to the server but no list ever
 * passed it to the API and no screen offered to change it, so the value in the
 * cookie did nothing at all.
 */
export default function Pagination({ page, lastPage, total, onPage, onPageSizeChange }: PaginationProps) {
  const { t } = useTranslation()
  const { prefs, update } = usePreferences()

  const changeSize = (value: PerPage) => {
    void update({ per_page: value })
    // The current page almost certainly does not exist at the new size, so the
    // caller resets to page 1 rather than asking for a page off the end.
    onPageSizeChange()
  }

  // first, last, and a window around the current page - with an ellipsis
  // standing in for whatever that skips.
  const pages: (number | 'gap')[] = []
  for (let p = 1; p <= lastPage; p++) {
    if (p === 1 || p === lastPage || Math.abs(p - page) <= 2) pages.push(p)
    else if (pages[pages.length - 1] !== 'gap') pages.push('gap')
  }

  return (
    <div className="lmsd-tfoot">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label htmlFor="lms-page-size" className="lmsd-label" style={{ margin: 0 }}>
          {t('common.per_page')}
        </label>
        <select
          id="lms-page-size"
          className="lmsd-select"
          style={{ width: 'auto' }}
          value={prefs.per_page}
          onChange={(e) => changeSize(Number(e.target.value) as PerPage)}
        >
          {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        {typeof total === 'number' && (
          <span>{t('common.total_count', { count: total })}</span>
        )}
      </div>

      {lastPage > 1 && (
        <div className="lmsd-pages">
          <button
            type="button"
            className="lmsd-pagebtn"
            aria-label={t('common.previous_page')}
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            {/* index.css mirrors .fa-chevron-left under RTL, so "previous"
                keeps pointing at the start of the list in both directions. */}
            <i className="fas fa-chevron-left" aria-hidden="true" />
          </button>

          {pages.map((p, i) => p === 'gap' ? (
            <span key={`gap${i}`} style={{ padding: '0 2px', color: 'var(--ink-3)' }}>&hellip;</span>
          ) : (
            <button
              key={p}
              type="button"
              className="lmsd-pagebtn"
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPage(p)}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            className="lmsd-pagebtn"
            aria-label={t('common.next_page')}
            disabled={page >= lastPage}
            onClick={() => onPage(page + 1)}
          >
            <i className="fas fa-chevron-right" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
