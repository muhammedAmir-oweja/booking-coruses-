/**
 * Control class names for the form fields.
 *
 * Kept out of Field.tsx so that file only exports a component - the
 * fast-refresh lint rule, and a fair one: a module that mixes the two reloads
 * badly in dev.
 */
export const ctl = (base: 'input' | 'select' | 'textarea', error?: string) =>
  `lmsd-${base}${error ? ` lmsd-${base}--bad` : ''}`
