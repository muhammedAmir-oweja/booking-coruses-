import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../../api/auth'
import { DEV_NO_AUTH } from '../../devAuth'
import type { User } from '../../types'

interface NavbarProps {
  onToggleSidebar: () => void
  user: User | null
}

interface Destination {
  label: string
  to: string
  icon: string
  keywords: string
}

/**
 * Everywhere the admin app can go. This intentionally mirrors the sidebar's
 * groups; if it drifts, lift both onto a shared `src/navigation.ts`.
 */
const DESTINATIONS: Destination[] = [
  { label: 'Dashboard',          to: '/',                       icon: 'fas fa-tachometer-alt',      keywords: 'home overview stats revenue' },
  { label: 'Courses',            to: '/courses',                icon: 'fas fa-book',                keywords: 'catalogue catalog classes list' },
  { label: 'New course',         to: '/courses/new',            icon: 'fas fa-plus',                keywords: 'add create course' },
  { label: 'Students',           to: '/students',               icon: 'fas fa-user-graduate',       keywords: 'people learners roster' },
  { label: 'New student',        to: '/students/new',           icon: 'fas fa-plus',                keywords: 'add create student enrol' },
  { label: 'Training sessions',  to: '/training-sessions',      icon: 'fas fa-chalkboard-teacher',  keywords: 'schedule calendar classes' },
  { label: 'New session',        to: '/training-sessions/new',  icon: 'fas fa-plus',                keywords: 'add create session schedule' },
  { label: 'Enrollments',        to: '/enrollments',            icon: 'fas fa-user-plus',           keywords: 'enrolments signups registrations' },
  { label: 'Enroll a student',   to: '/enrollments/new',        icon: 'fas fa-plus',                keywords: 'add create enrollment signup' },
  { label: 'Bookings',           to: '/bookings',               icon: 'fas fa-calendar-check',      keywords: 'payments paid unpaid revenue' },
  { label: 'My profile',         to: '/profile',                icon: 'fas fa-user',                keywords: 'account password settings me' },
]

const ROLE_TINTS: Record<string, { bg: string; fg: string }> = {
  admin:      { bg: '#fdeceb', fg: '#b42318' },
  instructor: { bg: '#e6f2f6', fg: '#0e6070' },
  student:    { bg: '#e7f4ec', fg: '#136c3c' },
}
const NEUTRAL_TINT = { bg: '#eef1f5', fg: '#5b6b7d' }

const ROLE_LABELS: Record<string, string> = {
  admin:      'Administrator',
  instructor: 'Instructor',
  student:    'Student',
}

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'

const isApplePlatform = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)

export default function Navbar({ onToggleSidebar, user }: NavbarProps) {
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const userRef = useRef<HTMLDivElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)

  const tint = user ? (ROLE_TINTS[user.role] ?? NEUTRAL_TINT) : NEUTRAL_TINT
  const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : ''
  const modKey = isApplePlatform() ? '⌘' : 'Ctrl'

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return DESTINATIONS
    return DESTINATIONS.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.to.toLowerCase().includes(q) ||
        d.keywords.includes(q)
    )
  }, [query])

  // Derived, not stored: the list shrinks as you type, and a stored index
  // would point past the end of it.
  const activeIndex = matches.length ? Math.min(active, matches.length - 1) : -1

  const openPalette = () => {
    setQuery('')
    setActive(0)
    setPaletteOpen(true)
  }

  const goTo = (to: string) => {
    setPaletteOpen(false)
    setMenuOpen(false)
    navigate(to)
  }

  // Cmd/Ctrl-K from anywhere in the app.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setQuery('')
        setActive(0)
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Close the account menu on an outside click, and on Escape - returning
  // focus to the trigger so keyboard users are not dropped at the top.
  useEffect(() => {
    if (!menuOpen) return

    const onPointerDown = (e: MouseEvent) => {
      if (!userRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMenuOpen(false)
      menuTriggerRef.current?.focus()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  // Don't let the page scroll behind the palette.
  useEffect(() => {
    if (!paletteOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [paletteOpen])

  const onPaletteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0) goTo(matches[activeIndex].to)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setPaletteOpen(false)
    }
  }

  const handleLogout = async () => {
    await logout().catch(() => null)
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  const avatar = (size: number, fontSize: number) => (
    <span
      className="lmsnav-avatar"
      style={{ width: size, height: size, fontSize, background: tint.bg, color: tint.fg }}
      aria-hidden="true"
    >
      {user ? initialsOf(user.name) : ''}
    </span>
  )

  return (
    <nav className="main-header lmsnav">
      <style>{NAVBAR_CSS}</style>

      <button
        type="button"
        className="lmsnav-icon"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
      >
        <i className="fas fa-bars" />
      </button>

      <button type="button" className="lmsnav-jump" onClick={openPalette}>
        <i className="fas fa-search" aria-hidden="true" />
        <span className="lmsnav-jump-label">Jump to a page</span>
        <kbd className="lmsnav-kbd">{modKey} K</kbd>
      </button>

      <div className="lmsnav-spacer" />

      <div className="lmsnav-user" ref={userRef}>
        <button
          ref={menuTriggerRef}
          type="button"
          className="lmsnav-trigger"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {avatar(32, 11.5)}
          {user ? (
            <span className="lmsnav-meta">
              <span className="lmsnav-name">{user.name}</span>
              <span className="lmsnav-role">{roleLabel}</span>
            </span>
          ) : (
            <span className="lmsnav-meta" role="status" aria-label="Loading account">
              <span className="lmsnav-skel" style={{ width: 82, height: 10 }} />
              <span className="lmsnav-skel" style={{ width: 54, height: 8 }} />
            </span>
          )}
          <i className="fas fa-chevron-down lmsnav-chev" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div className="lmsnav-menu" role="menu">
            <div className="lmsnav-id">
              {avatar(38, 13)}
              <div className="lmsnav-id-text">
                <div className="lmsnav-id-name">{user?.name ?? 'Loading account'}</div>
                {user?.email && <div className="lmsnav-id-mail">{user.email}</div>}
              </div>
            </div>

            {user && (
              <div className="lmsnav-pill-row">
                <span className="lmsnav-pill" style={{ background: tint.bg, color: tint.fg }}>
                  {roleLabel}
                </span>
              </div>
            )}

            <div className="lmsnav-sep" />

            <Link to="/profile" className="lmsnav-item" role="menuitem" onClick={() => setMenuOpen(false)}>
              <i className="fas fa-user" aria-hidden="true" /> My profile
            </Link>
            <button
              type="button"
              className="lmsnav-item"
              role="menuitem"
              onClick={() => { setMenuOpen(false); openPalette() }}
            >
              <i className="fas fa-search" aria-hidden="true" /> Jump to a page
              <kbd className="lmsnav-kbd lmsnav-kbd-sm">{modKey} K</kbd>
            </button>

            <div className="lmsnav-sep" />

            {DEV_NO_AUTH ? (
              <div className="lmsnav-note">
                <i className="fas fa-unlock" aria-hidden="true" />
                <span>Dev mode &mdash; authentication bypassed</span>
              </div>
            ) : (
              <button type="button" className="lmsnav-item lmsnav-danger" role="menuitem" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt" aria-hidden="true" /> Sign out
              </button>
            )}
          </div>
        )}
      </div>

      {paletteOpen && (
        <div
          className="lmsnav-scrim"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setPaletteOpen(false) }}
        >
          <div className="lmsnav-pal" role="dialog" aria-modal="true" aria-label="Jump to a page">
            <div className="lmsnav-pal-search">
              <i className="fas fa-search" aria-hidden="true" />
              <input
                autoFocus
                className="lmsnav-pal-input"
                type="text"
                placeholder="Search pages…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0) }}
                onKeyDown={onPaletteKeyDown}
                aria-label="Search pages"
                role="combobox"
                aria-expanded="true"
                aria-controls="lmsnav-pal-list"
                aria-activedescendant={activeIndex >= 0 ? `lmsnav-opt-${activeIndex}` : undefined}
              />
              <button
                type="button"
                className="lmsnav-pal-close"
                onClick={() => setPaletteOpen(false)}
                aria-label="Close"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {matches.length > 0 ? (
              <ul className="lmsnav-pal-list" id="lmsnav-pal-list" role="listbox">
                {matches.map((d, i) => (
                  <li
                    key={d.to + d.label}
                    id={`lmsnav-opt-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    className="lmsnav-opt"
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => { e.preventDefault(); goTo(d.to) }}
                  >
                    <i className={d.icon} aria-hidden="true" />
                    <span>{d.label}</span>
                    <code className="lmsnav-path">{d.to}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lmsnav-pal-empty">
                Nothing matches &ldquo;{query}&rdquo;
              </p>
            )}

            <div className="lmsnav-pal-foot">
              <span><kbd className="lmsnav-kbd lmsnav-kbd-sm">&uarr;&darr;</kbd> move</span>
              <span><kbd className="lmsnav-kbd lmsnav-kbd-sm">&crarr;</kbd> open</span>
              <span><kbd className="lmsnav-kbd lmsnav-kbd-sm">esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

/**
 * Scoped to `lmsnav-*` so none of it collides with AdminLTE, and so the
 * navbar owns its own look rather than inheriting Bootstrap's defaults.
 * `.main-header` stays on the <nav> because AdminLTE's sidebar-collapse rule
 * keys off it.
 */
const NAVBAR_CSS = `
.lmsnav {
  position: relative; z-index: 1000;
  display: flex; align-items: center; gap: 10px;
  height: 62px; padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #e6e9ef;
  box-shadow: 0 1px 2px rgba(16,24,40,.04);
}
.lmsnav-spacer { margin-left: auto; }
.lmsnav kbd { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

.lmsnav-icon {
  display: grid; place-items: center; flex: none;
  width: 38px; height: 38px;
  border: 0; border-radius: 9px;
  background: transparent; color: #5b6b7d; font-size: 16px; cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.lmsnav-icon:hover { background: #f1f4f8; color: #1b2733; }

.lmsnav-jump {
  display: flex; align-items: center; gap: 9px;
  height: 38px; min-width: 264px; padding: 0 8px 0 12px;
  border: 1px solid #e6e9ef; border-radius: 10px;
  background: #f7f9fb; color: #8a99aa;
  font: 400 13.5px/1 inherit; cursor: pointer;
  transition: background .15s ease, border-color .15s ease, color .15s ease;
}
.lmsnav-jump:hover { background: #fff; border-color: #cfd8e3; color: #5b6b7d; }
.lmsnav-jump > i { font-size: 12.5px; }
.lmsnav-jump-label { flex: 1; text-align: left; }

.lmsnav-kbd {
  font-size: 10.5px; font-weight: 500; line-height: 1; color: #8a99aa;
  background: #fff; border: 1px solid #e0e5ec; border-bottom-width: 2px;
  border-radius: 5px; padding: 4px 5px; white-space: nowrap;
}
.lmsnav-kbd-sm { padding: 3px 4px; font-size: 10px; }

.lmsnav-user { position: relative; flex: none; }
.lmsnav-trigger {
  display: flex; align-items: center; gap: 10px;
  height: 46px; padding: 0 8px 0 6px;
  border: 0; border-radius: 10px; background: transparent; cursor: pointer;
  transition: background .15s ease;
}
.lmsnav-trigger:hover { background: #f1f4f8; }
.lmsnav-avatar {
  display: grid; place-items: center; flex: none;
  border-radius: 50%; font-weight: 700; letter-spacing: .03em;
}
.lmsnav-meta { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
.lmsnav-name { font-size: 13.5px; font-weight: 600; color: #1b2733; line-height: 1.2; }
.lmsnav-role { font-size: 11px; color: #8a99aa; line-height: 1.2; }
.lmsnav-chev { font-size: 9px; color: #a8b4c2; transition: transform .18s ease; }
.lmsnav-trigger[aria-expanded="true"] .lmsnav-chev { transform: rotate(180deg); }

.lmsnav-skel { display: block; border-radius: 4px; background: #e3e8ee; animation: lmsnav-pulse 1.5s ease-in-out infinite; }
@keyframes lmsnav-pulse { 0%,100% { opacity: .5 } 50% { opacity: 1 } }

.lmsnav-menu {
  position: absolute; top: calc(100% + 6px); right: 0; width: 274px; padding: 6px;
  background: #fff; border: 1px solid #e6e9ef; border-radius: 12px;
  box-shadow: 0 14px 36px rgba(16,24,40,.13), 0 2px 6px rgba(16,24,40,.05);
  animation: lmsnav-pop .15s ease;
}
@keyframes lmsnav-pop { from { opacity: 0; transform: translateY(-5px) } to { opacity: 1; transform: none } }
.lmsnav-id { display: flex; align-items: center; gap: 11px; padding: 10px 10px 8px; }
.lmsnav-id-text { min-width: 0; }
.lmsnav-id-name { font-size: 13.5px; font-weight: 600; color: #1b2733; }
.lmsnav-id-mail { font-size: 11.5px; color: #8a99aa; overflow-wrap: anywhere; }
.lmsnav-pill-row { padding: 0 10px 10px; }
.lmsnav-pill {
  display: inline-block; font-size: 9.5px; font-weight: 700;
  letter-spacing: .07em; text-transform: uppercase; padding: 4px 7px; border-radius: 5px;
}
.lmsnav-sep { height: 1px; background: #eef1f5; margin: 4px 0; }
.lmsnav-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 9px 10px; border: 0; border-radius: 8px;
  background: transparent; color: #33455a;
  font: 400 13.5px/1.3 inherit; text-align: left; text-decoration: none; cursor: pointer;
  transition: background .12s ease, color .12s ease;
}
.lmsnav-item > i { width: 15px; text-align: center; color: #8a99aa; font-size: 13px; }
.lmsnav-item > .lmsnav-kbd { margin-left: auto; }
.lmsnav-item:hover { background: #f1f4f8; color: #1b2733; text-decoration: none; }
.lmsnav-item:hover > i { color: #5b6b7d; }
.lmsnav-danger { color: #b42318; }
.lmsnav-danger > i { color: #d1685e; }
.lmsnav-danger:hover { background: #fdeceb; color: #912018; }
.lmsnav-danger:hover > i { color: #b42318; }
.lmsnav-note { display: flex; gap: 9px; padding: 9px 10px; font-size: 11.5px; color: #8a99aa; line-height: 1.45; }
.lmsnav-note > i { margin-top: 2px; }

.lmsnav-scrim {
  position: fixed; inset: 0; z-index: 2000;
  display: flex; justify-content: center; padding: 12vh 16px 16px;
  background: rgba(16,24,40,.34); backdrop-filter: blur(3px);
  animation: lmsnav-fade .14s ease;
}
@keyframes lmsnav-fade { from { opacity: 0 } to { opacity: 1 } }
.lmsnav-pal {
  display: flex; flex-direction: column; width: 100%; max-width: 540px; max-height: 64vh;
  background: #fff; border-radius: 14px; overflow: hidden;
  box-shadow: 0 24px 64px rgba(16,24,40,.26);
  animation: lmsnav-rise .17s ease;
}
@keyframes lmsnav-rise { from { opacity: 0; transform: translateY(-10px) } to { opacity: 1; transform: none } }
.lmsnav-pal-search { display: flex; align-items: center; gap: 11px; padding: 13px 14px; border-bottom: 1px solid #eef1f5; }
.lmsnav-pal-search > i { color: #a8b4c2; font-size: 14px; }
.lmsnav-pal-input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: 400 15px/1.4 inherit; color: #1b2733; }
.lmsnav-pal-input::placeholder { color: #a8b4c2; }
.lmsnav-pal-close { flex: none; border: 0; background: transparent; color: #a8b4c2; font-size: 13px; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
.lmsnav-pal-close:hover { background: #f1f4f8; color: #5b6b7d; }
.lmsnav-pal-list { list-style: none; margin: 0; padding: 6px; overflow-y: auto; }
.lmsnav-opt {
  display: flex; align-items: center; gap: 11px; padding: 10px 11px;
  border-radius: 9px; cursor: pointer; color: #33455a; font-size: 13.5px;
}
.lmsnav-opt > i { width: 16px; text-align: center; color: #8a99aa; font-size: 13px; }
.lmsnav-opt[aria-selected="true"] { background: #eef4ff; color: #12467f; }
.lmsnav-opt[aria-selected="true"] > i { color: #2b7cf3; }
.lmsnav-path { margin-left: auto; font-size: 11px; color: #a8b4c2; background: none; padding: 0; }
.lmsnav-opt[aria-selected="true"] .lmsnav-path { color: #6f9fd8; }
.lmsnav-pal-empty { margin: 0; padding: 26px 16px; text-align: center; color: #8a99aa; font-size: 13px; }
.lmsnav-pal-foot { display: flex; gap: 15px; padding: 9px 14px; border-top: 1px solid #eef1f5; background: #fafbfc; font-size: 11px; color: #8a99aa; }
.lmsnav-pal-foot span { display: flex; align-items: center; gap: 5px; }

.lmsnav :focus-visible, .lmsnav-pal :focus-visible { outline: 2px solid #2b7cf3; outline-offset: 2px; }

@media (max-width: 767px) {
  .lmsnav { height: 58px; padding: 0 10px; gap: 6px; }
  .lmsnav-jump { min-width: 0; width: 38px; padding: 0; justify-content: center; }
  .lmsnav-jump-label, .lmsnav-jump .lmsnav-kbd { display: none; }
  .lmsnav-meta { display: none; }
  .lmsnav-scrim { padding-top: 8vh; }
}
@media (prefers-reduced-motion: reduce) {
  .lmsnav *, .lmsnav-menu, .lmsnav-scrim, .lmsnav-pal { animation: none !important; transition: none !important; }
}
`
