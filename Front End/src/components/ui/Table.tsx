import type { ReactNode } from 'react'

/**
 * The two states every data table needs besides its rows.
 *
 * Both were written inline on each list page, which is how five pages ended up
 * with five different spinners and five different ways of saying "nothing
 * here".
 */
export function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }, (_, c) => (
            <td key={c}>
              <span className="lmsd-skel" style={{ height: 13, width: c === 0 ? '70%' : '48%' }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

export function EmptyRow({ cols, icon, label, action }: {
  cols: number
  icon: string
  label: string
  action?: ReactNode
}) {
  return (
    <tbody>
      <tr>
        <td colSpan={cols}>
          <div className="lmsd-empty">
            <i className={icon} aria-hidden="true" />
            {label}
            {action}
          </div>
        </td>
      </tr>
    </tbody>
  )
}
