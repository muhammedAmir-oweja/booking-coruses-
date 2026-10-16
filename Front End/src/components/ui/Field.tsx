import type { ReactNode } from 'react'

/**
 * One labelled form control, with its own error slot.
 *
 * The forms used Bootstrap's `form-group` + `invalid-feedback`, which only
 * shows the message when a sibling carries `.is-invalid` - so an error that
 * came back from the API without that class was rendered into the DOM and
 * never seen. Here the message is plain markup: if it is passed, it shows.
 *
 * `span` is a column count on the 12-column form grid, so a field states its
 * own width instead of being wrapped in a row/col pair.
 */
export default function Field({ label, htmlFor, required, error, hint, span = 12, children }: {
  label: string
  htmlFor?: string
  required?: boolean
  error?: string
  hint?: string
  span?: 3 | 4 | 6 | 8 | 12
  children: ReactNode
}) {
  return (
    <div className={`lmsd-field lmsd-col-${span}`}>
      <label className="lmsd-label" htmlFor={htmlFor}>
        {label}
        {required && <span className="lmsd-req" aria-hidden="true">*</span>}
      </label>
      {children}
      {error
        ? (
          <span className="lmsd-error">
            <i className="fas fa-exclamation-circle" aria-hidden="true" />
            {error}
          </span>
        )
        : hint && <span className="lmsd-hint">{hint}</span>}
    </div>
  )
}
