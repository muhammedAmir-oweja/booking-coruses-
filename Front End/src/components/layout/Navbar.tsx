import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../../api/auth'
import { getNotifications, markAllRead, markRead } from '../../api/notifications'
import { DEV_NO_AUTH } from '../../devAuth'
import type { AppNotification, User } from '../../types'

interface NavbarProps {
  onToggleSidebar: () => void
  user: User | null
}

type Role = 'admin' | 'instructor' | 'student'

interface Destination {
  label: string
  to: string
  icon: string
  keywords: string
  roles: Role[]
}

/**
 * Everywhere the app can go, with the same role gating the sidebar applies -
 * an unfiltered palette would offer people pages the sidebar deliberately
 * hides, and every one of those lands on a 403.
 *
 * This mirrors Sidebar.tsx's groups. If the two drift, lift them both onto a
 * shared `src/navigation.ts`.
 *
 * Only the untranslatable half lives at module level: route, icon and roles
 * never change with the language. `key` names the `nav.*` entries that supply
 * the label and the search keywords, and those are resolved inside the
 * component so a language switch rebuilds them. Put a t() call in this array
 * and every label freezes to whatever language the bundle booted in.
 */
const ROUTES: { key: string; to: string; icon: string; roles: Role[] }[] = [
  { key: 'dashboard',         to: '/',                      icon: 'fas fa-tachometer-alt',     roles: ['admin', 'instructor', 'student'] },
  { key: 'courses',           to: '/courses',               icon: 'fas fa-book',               roles: ['admin', 'instructor', 'student'] },
  { key: 'new_course',        to: '/courses/new',           icon: 'fas fa-plus',               roles: ['admin', 'instructor'] },
  { key: 'students',          to: '/students',              icon: 'fas fa-user-graduate',      roles: ['admin'] },
  { key: 'new_student',       to: '/students/new',          icon: 'fas fa-plus',               roles: ['admin'] },
  { key: 'training_sessions', to: '/training-sessions',     icon: 'fas fa-chalkboard-teacher', roles: ['admin', 'instructor'] },
  { key: 'new_session',       to: '/training-sessions/new', icon: 'fas fa-plus',               roles: ['admin', 'instructor'] },
  { key: 'enrollments',       to: '/enrollments',           icon: 'fas fa-user-plus',          roles: ['admin', 'instructor', 'student'] },
  { key: 'enroll_student',    to: '/enrollments/new',       icon: 'fas fa-plus',               roles: ['admin', 'instructor'] },
  { key: 'bookings',          to: '/bookings',              icon: 'fas fa-calendar-check',     roles: ['admin', 'student'] },
  { key: 'profile',           to: '/profile',               icon: 'fas fa-user',               roles: ['admin', 'instructor', 'student'] },
]

// Saturated enough to hold their own against the #343a40 bar.
const ROLE_FILLS: Record<string, string> = {
  admin:      '#b4463c',
  instructor: '#16798f',
  student:    '#1e7a4b',
}
const NEUTRAL_FILL = '#5a6470'

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?'

const isApplePlatform = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)

export default function Navbar({ onToggleSidebar, user }: NavbarProps) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const userRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const bellTriggerRef = useRef<HTMLButtonElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const jumpTriggerRef = useRef<HTMLButtonElement>(null)

  const fill = user ? (ROLE_FILLS[user.role] ?? NEUTRAL_FILL) : NEUTRAL_FILL
  const roleLabel = user ? t(`roles.${user.role}`, { defaultValue: user.role }) : ''
  const modKey = isApplePlatform() ? '⌘' : 'Ctrl'
  const isArabic = i18n.resolvedLanguage === 'ar'

  // Rebuilt whenever the language changes, because `t` is a dependency.
  // useTranslation() hands back a new `t` on languageChanged - that identity
  // change is the signal that re-renders the labels. An empty dependency array
  // would reintroduce exactly the bug ROUTES exists to avoid.
  const destinations = useMemo<Destination[]>(
    () => ROUTES.map((r) => ({
      label: t(`nav.${r.key}`),
      keywords: t(`nav.${r.key}_keywords`, { defaultValue: '' }),
      to: r.to,
      icon: r.icon,
      roles: r.roles,
    })),
    [t]
  )

  const reachable = useMemo(
    () => (user ? destinations.filter((d) => d.roles.includes(user.role)) : destinations),
    [user, destinations]
  )

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return reachable
    return reachable.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.to.toLowerCase().includes(q) ||
        d.keywords.includes(q)
    )
  }, [query, reachable])

  // Derived, not stored: the list shrinks as you type and a stored index
  // would point past the end of it.
  const activeIndex = matches.length ? Math.min(active, matches.length - 1) : -1

  const openPalette = () => {
    setQuery('')
    setActive(0)
    setPaletteOpen(true)
  }

  const closePalette = () => {
    setPaletteOpen(false)
    jumpTriggerRef.current?.focus()
  }

  const goTo = (to: string) => {
    setPaletteOpen(false)
    setMenuOpen(false)
    navigate(to)
  }

  const openNotification = (n: AppNotification) => {
    // Optimistic: mark it locally, then navigate. The request can lose.
    if (!n.read_at) {
      setUnread((u) => Math.max(0, u - 1))
      setItems((list) => list.map((x) =>
        x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
      void markRead(n.id).catch(() => {})
    }
    setBellOpen(false)
    navigate(n.data.url)
  }

  const readAll = () => {
    setUnread(0)
    setItems((list) => list.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })))
    void markAllRead().catch(() => {})
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

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    if (!paletteOpen || activeIndex < 0) return
    document.getElementById(`lmsnav-opt-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [paletteOpen, activeIndex])

  // Load on mount, and again whenever the panel is opened, so the list is not
  // stale the one time someone actually looks at it.
  useEffect(() => {
    if (!user) return
    let cancelled = false

    void getNotifications()
      .then((r) => {
        if (cancelled) return
        setItems(r.data)
        setUnread(r.unread_count)
      })
      .catch(() => { /* a dead bell must not break the navbar */ })

    return () => { cancelled = true }
  }, [user, bellOpen])

  // Close the account menu and the bell on an outside click, and on Escape -
  // handing focus back to the trigger so keyboard users are not dropped at the
  // top. One handler for both: two independent listeners would fight over
  // which dropdown closes first.
  useEffect(() => {
    if (!menuOpen && !bellOpen) return

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (!userRef.current?.contains(target)) setMenuOpen(false)
      if (!bellRef.current?.contains(target)) setBellOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (bellOpen) {
        setBellOpen(false)
        bellTriggerRef.current?.focus()
      }
      if (menuOpen) {
        setMenuOpen(false)
        menuTriggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen, bellOpen])

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
      closePalette()
    } else if (e.key === 'Tab') {
      // aria-modal promises the background is inert, so honour it: the input
      // is the only tab stop, and Escape is the documented way out.
      e.preventDefault()
    }
  }

  const handleLogout = async () => {
    await logout().catch(() => null)
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  const avatar = (size: number, fontSize: number) =>
    user ? (
      <span
        className="lmsnav-avatar"
        style={{ width: size, height: size, fontSize, background: fill }}
        aria-hidden="true"
      >
        {initialsOf(user.name)}
      </span>
    ) : (
      <span
        className="lmsnav-avatar lmsnav-pulse"
        style={{ width: size, height: size, background: 'rgba(255,255,255,.13)' }}
        aria-hidden="true"
      />
    )

  return (
    <nav className="main-header lmsnav">
      <style>{NAVBAR_CSS}</style>

      <button
        type="button"
        className="lmsnav-icon"
        onClick={onToggleSidebar}
        aria-label={t('navbar.toggle_sidebar')}
        title={t('navbar.toggle_sidebar')}
      >
        <i className="fas fa-bars" />
      </button>

      <span className="lmsnav-rule" aria-hidden="true" />

      <button ref={jumpTriggerRef} type="button" className="lmsnav-jump" onClick={openPalette}>
        <i className="fas fa-search" aria-hidden="true" />
        <span className="lmsnav-jump-label">{t('navbar.jump_to_page')}</span>
        <kbd className="lmsnav-kbd">{modKey} K</kbd>
      </button>

      <div className="lmsnav-spacer" />

      {/* The switch is instant: changeLanguage re-renders every t() consumer,
          and i18n's languageChanged handler persists it to the prefs cookie
          and flips <html lang>/<html dir>. Nothing reloads. */}
      <button
        type="button"
        className="lmsnav-lang"
        onClick={() => void i18n.changeLanguage(isArabic ? 'en' : 'ar')}
        aria-label={isArabic ? t('navbar.switch_to_english') : t('navbar.switch_to_arabic')}
        title={isArabic ? t('navbar.switch_to_english') : t('navbar.switch_to_arabic')}
      >
        {isArabic ? 'EN' : 'ع'}
      </button>

      <div className="lmsnav-bell-wrap" ref={bellRef}>
        <button
          ref={bellTriggerRef}
          type="button"
          className="lmsnav-icon"
          aria-haspopup="menu"
          aria-expanded={bellOpen}
          aria-label={unread
            ? t('navbar.notifications_unread', { count: unread })
            : t('navbar.notifications')}
          onClick={() => setBellOpen((open) => !open)}
        >
          <i className="far fa-bell" />
          {unread > 0 && (
            <span className="lmsnav-badge">{unread > 9 ? '9+' : unread}</span>
          )}
        </button>

        {bellOpen && (
          <div className="lmsnav-menu" role="menu">
            {items.length === 0
              ? <div className="lmsnav-empty">{t('navbar.nothing_new')}</div>
              : items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    role="menuitem"
                    className="lmsnav-item"
                    onClick={() => openNotification(n)}
                  >
                    <i className="fas fa-calendar-check" />
                    <span>
                      {t('navbar.booked', {
                        student: n.data.student_name,
                        course: n.data.course_title,
                      })}
                      {!n.read_at && <span className="lmsnav-dot" />}
                    </span>
                  </button>
                ))}
            {unread > 0 && (
              <>
                <div className="lmsnav-sep" />
                <button type="button" className="lmsnav-item" onClick={readAll}>
                  <i className="fas fa-check-double" />
                  {t('navbar.mark_all_read')}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="lmsnav-user" ref={userRef}>
        <button
          ref={menuTriggerRef}
          type="button"
          className="lmsnav-trigger"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {avatar(30, 11)}
          {user ? (
            <span className="lmsnav-meta">
              <span className="lmsnav-name">{user.name}</span>
              <span className="lmsnav-role">{roleLabel}</span>
            </span>
          ) : (
            <span className="lmsnav-meta" role="status" aria-label={t('navbar.loading_account')}>
              <span className="lmsnav-skel lmsnav-pulse" style={{ width: 78, height: 9 }} />
              <span className="lmsnav-skel lmsnav-pulse" style={{ width: 50, height: 8 }} />
            </span>
          )}
          <i className="fas fa-chevron-down lmsnav-chev" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div className="lmsnav-menu" role="menu">
            <div className="lmsnav-id">
              {avatar(38, 13)}
              <div className="lmsnav-id-text">
                <div className="lmsnav-id-name">{user?.name ?? t('navbar.loading_account')}</div>
                {user?.email && <div className="lmsnav-id-mail">{user.email}</div>}
              </div>
            </div>

            <div className="lmsnav-sep" />

            <Link to="/profile" className="lmsnav-item" role="menuitem" onClick={() => setMenuOpen(false)}>
              <i className="fas fa-user" aria-hidden="true" /> {t('navbar.my_profile')}
            </Link>
            <button
              type="button"
              className="lmsnav-item"
              role="menuitem"
              onClick={() => { setMenuOpen(false); openPalette() }}
            >
              <i className="fas fa-search" aria-hidden="true" /> {t('navbar.jump_to_page')}
              <kbd className="lmsnav-kbd lmsnav-kbd-sm">{modKey} K</kbd>
            </button>

            <div className="lmsnav-sep" />

            {DEV_NO_AUTH ? (
              <div className="lmsnav-note">
                <i className="fas fa-unlock" aria-hidden="true" />
                <span>{t('navbar.dev_mode')}</span>
              </div>
            ) : (
              <button type="button" className="lmsnav-item lmsnav-danger" role="menuitem" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt" aria-hidden="true" /> {t('navbar.sign_out')}
              </button>
            )}
          </div>
        )}
      </div>

      {paletteOpen && (
        <div
          className="lmsnav-scrim"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closePalette() }}
        >
          <div className="lmsnav-pal" role="dialog" aria-modal="true" aria-label={t('navbar.jump_to_page')}>
            <div className="lmsnav-pal-search">
              <i className="fas fa-search" aria-hidden="true" />
              <input
                autoFocus
                className="lmsnav-pal-input"
                type="text"
                placeholder={t('navbar.jump_placeholder')}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0) }}
                onKeyDown={onPaletteKeyDown}
                aria-label={t('navbar.search_pages')}
                role="combobox"
                aria-expanded="true"
                aria-controls="lmsnav-pal-list"
                aria-activedescendant={activeIndex >= 0 ? `lmsnav-opt-${activeIndex}` : undefined}
              />
              <button
                type="button"
                className="lmsnav-pal-close"
                onClick={closePalette}
                tabIndex={-1}
                aria-hidden="true"
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
                    onClick={() => goTo(d.to)}
                  >
                    <i className={d.icon} aria-hidden="true" />
                    <span>{d.label}</span>
                    <code className="lmsnav-path">{d.to}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="lmsnav-pal-empty">{t('navbar.nothing_matches', { query })}</p>
            )}

            <div className="lmsnav-pal-foot">
              <span><kbd className="lmsnav-kbd lmsnav-kbd-sm">&uarr;&darr;</kbd> {t('navbar.hint_move')}</span>
              <span><kbd className="lmsnav-kbd lmsnav-kbd-sm">&crarr;</kbd> {t('navbar.hint_open')}</span>
              <span><kbd className="lmsnav-kbd lmsnav-kbd-sm">esc</kbd> {t('navbar.hint_close')}</span>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

/**
 * The navbar is part of the app's dark chrome, not a light bar sitting on top
 * of it. Two numbers are load-bearing and both come from AdminLTE:
 *   #343a40  the sidebar background
 *   #4b545c  the sidebar brand's bottom border
 * Matching them, at exactly 57px tall, turns the navbar's bottom edge and the
 * sidebar's brand divider into one unbroken line across the top of the app.
 *
 * Everything is scoped `lmsnav-*` so none of it collides with Bootstrap.
 * `.main-header` stays on the <nav> because AdminLTE's collapse rule keys off it.
 */
const NAVBAR_CSS = `
.lmsnav {
  position: relative; z-index: 1000;
  display: flex; align-items: center; gap: 8px;
  height: 57px; padding: 0 14px;
  background: #343a40;
  border-bottom: 1px solid #4b545c;
}
/* Logical properties throughout this block, not left/right: they mirror
   themselves under dir="rtl" and need no [dir='rtl'] override in index.css. */
.lmsnav-spacer { margin-inline-start: auto; }
.lmsnav kbd { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.lmsnav-rule { width: 1px; height: 22px; background: rgba(255,255,255,.11); margin: 0 4px; flex: none; }

.lmsnav-icon {
  display: grid; place-items: center; flex: none;
  width: 34px; height: 34px;
  border: 0; border-radius: 8px;
  background: transparent; color: rgba(255,255,255,.62);
  font-size: 15px; cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.lmsnav-icon:hover { background: rgba(255,255,255,.09); color: #fff; }

.lmsnav-jump {
  display: flex; align-items: center; gap: 9px;
  flex: 0 1 400px; height: 34px; padding-block: 0;
  padding-inline: 11px 7px;
  border: 1px solid rgba(255,255,255,.10); border-radius: 8px;
  background: rgba(0,0,0,.20); color: rgba(255,255,255,.42);
  font: 400 13px/1 inherit; cursor: pointer;
  transition: background .15s ease, border-color .15s ease, color .15s ease;
}
.lmsnav-jump:hover {
  background: rgba(0,0,0,.30); border-color: rgba(255,255,255,.20); color: rgba(255,255,255,.68);
}
.lmsnav-jump > i { font-size: 12px; }
.lmsnav-jump-label { flex: 1; text-align: start; }

.lmsnav-kbd {
  font-size: 10px; font-weight: 500; line-height: 1; color: rgba(255,255,255,.46);
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.13);
  border-radius: 4px; padding: 4px 5px; white-space: nowrap;
}
.lmsnav-kbd-sm { padding: 3px 4px; }

.lmsnav-lang {
  flex: none; min-width: 34px; height: 34px; padding: 0 9px;
  border: 1px solid rgba(255,255,255,.13); border-radius: 8px;
  background: transparent; color: rgba(255,255,255,.66);
  font: 600 12px/1 inherit; letter-spacing: .03em; cursor: pointer;
  transition: background .15s ease, color .15s ease, border-color .15s ease;
}
.lmsnav-lang:hover { background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.26); color: #fff; }

.lmsnav-bell-wrap { position: relative; flex: none; }
.lmsnav-bell-wrap > .lmsnav-icon { position: relative; }
.lmsnav-badge {
  position: absolute; top: 1px; inset-inline-end: 1px;
  min-width: 15px; height: 15px; padding: 0 3px;
  display: grid; place-items: center;
  border-radius: 99px; background: #dc3545; color: #fff;
  font: 700 9.5px/1 inherit; letter-spacing: 0;
  box-shadow: 0 0 0 2px #343a40;
}
.lmsnav-empty { padding: 14px 10px; text-align: center; font-size: 12px; color: rgba(255,255,255,.44); }
.lmsnav-dot {
  display: inline-block; vertical-align: middle;
  width: 6px; height: 6px; margin-inline-start: 6px;
  border-radius: 50%; background: #4a9fd8;
}

.lmsnav-user { position: relative; flex: none; }
.lmsnav-trigger {
  display: flex; align-items: center; gap: 9px;
  height: 42px; padding: 0 7px 0 5px;
  border: 0; border-radius: 8px; background: transparent; cursor: pointer;
  transition: background .15s ease;
}
.lmsnav-trigger:hover { background: rgba(255,255,255,.09); }
.lmsnav-avatar {
  display: grid; place-items: center; flex: none;
  border-radius: 50%; color: #fff; font-weight: 700; letter-spacing: .02em;
}
.lmsnav-meta { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; }
.lmsnav-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.92); line-height: 1.2; }
.lmsnav-role { font-size: 10.5px; color: rgba(255,255,255,.48); line-height: 1.2; }
.lmsnav-chev { font-size: 9px; color: rgba(255,255,255,.38); transition: transform .18s ease; }
.lmsnav-trigger[aria-expanded="true"] .lmsnav-chev { transform: rotate(180deg); }

.lmsnav-skel { display: block; border-radius: 3px; background: rgba(255,255,255,.16); }
.lmsnav-pulse { animation: lmsnav-pulse 1.5s ease-in-out infinite; }
@keyframes lmsnav-pulse { 0%,100% { opacity: .45 } 50% { opacity: 1 } }

.lmsnav-menu {
  position: absolute; top: calc(100% + 5px); inset-inline-end: 0; width: 272px; padding: 6px;
  background: #3c4349; border: 1px solid rgba(255,255,255,.11); border-radius: 10px;
  box-shadow: 0 16px 40px rgba(0,0,0,.42), 0 2px 6px rgba(0,0,0,.28);
  animation: lmsnav-pop .15s ease;
}
@keyframes lmsnav-pop { from { opacity: 0; transform: translateY(-5px) } to { opacity: 1; transform: none } }
.lmsnav-id { display: flex; align-items: center; gap: 11px; padding: 9px 10px; }
.lmsnav-id-text { min-width: 0; }
.lmsnav-id-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.92); }
.lmsnav-id-mail { font-size: 11px; color: rgba(255,255,255,.46); overflow-wrap: anywhere; }
.lmsnav-sep { height: 1px; background: rgba(255,255,255,.09); margin: 4px 0; }
.lmsnav-item {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 8px 10px; border: 0; border-radius: 7px;
  background: transparent; color: rgba(255,255,255,.80);
  font: 400 13px/1.3 inherit; text-align: start; text-decoration: none; cursor: pointer;
  transition: background .12s ease, color .12s ease;
}
.lmsnav-item > i { width: 15px; text-align: center; color: rgba(255,255,255,.45); font-size: 12.5px; }
.lmsnav-item > .lmsnav-kbd { margin-inline-start: auto; }
.lmsnav-item:hover { background: rgba(255,255,255,.09); color: #fff; text-decoration: none; }
.lmsnav-item:hover > i { color: rgba(255,255,255,.75); }
.lmsnav-danger { color: #f0958b; }
.lmsnav-danger > i { color: #d2756b; }
.lmsnav-danger:hover { background: rgba(220,53,69,.18); color: #ffb3aa; }
.lmsnav-danger:hover > i { color: #ffb3aa; }
.lmsnav-note { display: flex; gap: 9px; padding: 8px 10px; font-size: 11px; color: rgba(255,255,255,.46); line-height: 1.45; }
.lmsnav-note > i { margin-top: 2px; }

.lmsnav-scrim {
  position: fixed; inset: 0; z-index: 2000;
  display: flex; justify-content: center; padding: 11vh 16px 16px;
  background: rgba(18,22,26,.52); backdrop-filter: blur(3px);
  animation: lmsnav-fade .14s ease;
}
@keyframes lmsnav-fade { from { opacity: 0 } to { opacity: 1 } }
.lmsnav-pal {
  display: flex; flex-direction: column; width: 100%; max-width: 520px; max-height: 62vh;
  background: #32383e; border: 1px solid rgba(255,255,255,.11); border-radius: 12px;
  overflow: hidden; box-shadow: 0 28px 70px rgba(0,0,0,.55);
  animation: lmsnav-rise .17s ease;
}
@keyframes lmsnav-rise { from { opacity: 0; transform: translateY(-10px) } to { opacity: 1; transform: none } }
.lmsnav-pal-search { display: flex; align-items: center; gap: 11px; padding: 13px 14px; border-bottom: 1px solid rgba(255,255,255,.09); }
.lmsnav-pal-search > i { color: rgba(255,255,255,.40); font-size: 13px; }
.lmsnav-pal-input {
  flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
  font: 400 14.5px/1.4 inherit; color: rgba(255,255,255,.94);
}
.lmsnav-pal-input::placeholder { color: rgba(255,255,255,.36); }
.lmsnav-pal-close { flex: none; border: 0; background: transparent; color: rgba(255,255,255,.38); font-size: 12px; cursor: pointer; padding: 4px 6px; border-radius: 5px; }
.lmsnav-pal-close:hover { background: rgba(255,255,255,.09); color: rgba(255,255,255,.8); }
.lmsnav-pal-list { list-style: none; margin: 0; padding: 6px; overflow-y: auto; }
.lmsnav-opt {
  display: flex; align-items: center; gap: 11px; padding: 9px 11px;
  border-radius: 8px; cursor: pointer; color: rgba(255,255,255,.78); font-size: 13px;
}
.lmsnav-opt > i { width: 16px; text-align: center; color: rgba(255,255,255,.42); font-size: 12.5px; }
.lmsnav-opt[aria-selected="true"] { background: rgba(90,169,245,.18); color: #fff; }
.lmsnav-opt[aria-selected="true"] > i { color: #7cbcf7; }
.lmsnav-path { margin-left: auto; font-size: 10.5px; color: rgba(255,255,255,.34); background: none; padding: 0; }
.lmsnav-opt[aria-selected="true"] .lmsnav-path { color: rgba(255,255,255,.55); }
.lmsnav-pal-empty { margin: 0; padding: 26px 16px; text-align: center; color: rgba(255,255,255,.46); font-size: 13px; }
.lmsnav-pal-foot {
  display: flex; gap: 15px; padding: 8px 14px;
  border-top: 1px solid rgba(255,255,255,.09); background: rgba(0,0,0,.16);
  font-size: 10.5px; color: rgba(255,255,255,.42);
}
.lmsnav-pal-foot span { display: flex; align-items: center; gap: 5px; }

.lmsnav :focus-visible, .lmsnav-pal :focus-visible { outline: 2px solid #5aa9f5; outline-offset: 2px; }

@media (max-width: 767px) {
  .lmsnav { padding: 0 8px; gap: 4px; }
  .lmsnav-rule { display: none; }
  .lmsnav-jump { flex: none; width: 34px; padding: 0; justify-content: center; }
  .lmsnav-jump-label, .lmsnav-jump .lmsnav-kbd { display: none; }
  .lmsnav-meta { display: none; }
  .lmsnav-scrim { padding-top: 7vh; }
}
@media (prefers-reduced-motion: reduce) {
  .lmsnav *, .lmsnav-menu, .lmsnav-scrim, .lmsnav-pal { animation: none !important; transition: none !important; }
}
`
