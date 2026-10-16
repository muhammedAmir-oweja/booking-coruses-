import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { logout } from '../../api/auth'
import { getNotifications, markAllRead, markRead } from '../../api/notifications'
import { DEV_NO_AUTH } from '../../devAuth'
import { usePreferences } from '../../context/PreferencesContext'
import type { AppNotification, User } from '../../types'
import Avatar from '../ui/Avatar'

interface NavbarProps {
  onToggleSidebar: () => void
  user: User | null
}

type Role = 'admin' | 'instructor' | 'student'

const ALL_ROLES: Role[] = ['admin', 'instructor', 'student']

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

const isApplePlatform = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)

export default function Navbar({ onToggleSidebar, user }: NavbarProps) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { update: updatePrefs } = usePreferences()

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

  // Until /auth/me answers, the role is unknown. Offering the whole list in
  // the meantime hands a student the admin pages this filter exists to hide,
  // so the unknown case falls back to the destinations EVERY role can reach -
  // still useful, and never a link to a 403.
  const reachable = useMemo(
    () => destinations.filter((d) => (
      user ? d.roles.includes(user.role) : ALL_ROLES.every((r) => d.roles.includes(r))
    )),
    [user, destinations]
  )

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return reachable
    return reachable.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.to.toLowerCase().includes(q) ||
        // Lower-cased like the other two. It was compared raw, so any keyword
        // a translator capitalised - "Courses, Catalog" - could not be found
        // by a query that is always lower-cased before the comparison.
        d.keywords.toLowerCase().includes(q)
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

  // Load on mount, and again whenever the panel is OPENED, so the list is not
  // stale the one time someone actually looks at it.
  //
  // Keyed on `bellOpen` this also refetched on close, which is both a wasted
  // request and a way to lose state: "mark all read" updates the list
  // optimistically and fires its PATCH without awaiting it, so closing the
  // panel straight afterwards could land a response that still had the old
  // unread count and put the badge back.
  useEffect(() => {
    if (!user || !bellOpen) return
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

  // The badge has to be right before anyone opens anything, so the first load
  // is separate and runs once the user is known.
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
  }, [user])

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
        onClick={() => void updatePrefs({ locale: isArabic ? 'en' : 'ar' })}
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
                      {/* Both are `string | null` in the API type, and an
                          interpolated null renders as the word "null". */}
                      {t('navbar.booked', {
                        student: n.data.student_name ?? t('common.none'),
                        course: n.data.course_title ?? t('common.none'),
                      })}
                      {!n.read_at && <span className="lmsnav-dot" />}
                    </span>
                  </button>
                ))}
            {unread > 0 && (
              <>
                <div className="lmsnav-sep" />
                <button type="button" role="menuitem" className="lmsnav-item" onClick={readAll}>
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
          <Avatar user={user} size={30} fontSize={11} />
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
              <Avatar user={user} size={38} fontSize={13} />
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

      {/* Portalled to <body>, and that is load-bearing rather than tidiness.
          `.lmsnav` is `position: relative; z-index: 1000`, which makes it a
          stacking context, and a z-index inside one cannot escape it: the
          scrim asked for 2000 and still got painted at 1000, underneath
          AdminLTE's sidebar at 1038. The palette opened with its left edge
          hidden behind the sidebar and the dim never reaching it. Rendering at
          body level puts the modal in the root stacking context, where its
          2000 means what it says. */}
      {paletteOpen && createPortal(
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
                /* Tied to whether the listbox is actually in the DOM. These
                   were hardcoded open, so with no matches the input still
                   announced an expanded popup and pointed `aria-controls` at
                   an id that had been unmounted. */
                aria-expanded={matches.length > 0}
                aria-controls={matches.length > 0 ? 'lmsnav-pal-list' : undefined}
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
        </div>,
        document.body,
      )}
    </nav>
  )
}

/**
 * The navbar is part of the app's dark chrome, not a light bar sitting on top
 * of it. The bar's surface and its bottom edge are load-bearing: at exactly
 * 57px tall and sharing the sidebar brand's background and divider, the
 * navbar's bottom edge and the sidebar's become one unbroken line across the
 * top of the app.
 *
 * Those two values used to be AdminLTE's own #343a40 and #4b545c, written in
 * by hand here and matched by hand in the sidebar. They are now
 * --chrome-800 and --chrome-hair from tokens.css, which is what keeps the two
 * files from drifting apart the next time the chrome is retoned - the line
 * only stays unbroken if both sides read the same number.
 *
 * Sizes are set with font longhands, never the `font:` shorthand. `inherit`
 * is a CSS-wide keyword and is only valid as a declaration's entire value, so
 * `font: 700 9.5px/1 inherit` - the shorthand's only way to say "keep the
 * inherited family" - is invalid and throws the WHOLE declaration away. Five
 * rules here were written that way and silently rendered at the inherited
 * 14px/400; the unread badge was the visible one, its digit spilling out of a
 * 15px pill. Form controls do not inherit the family on their own, hence the
 * explicit `font-family: inherit` on the buttons and the palette input.
 *
 * Everything is scoped `lmsnav-*` so none of it collides with Bootstrap.
 * `.main-header` stays on the <nav> because AdminLTE's collapse rule keys off it.
 */
const NAVBAR_CSS = `
.lmsnav {
  position: relative; z-index: 1000;
  display: flex; align-items: center; gap: 8px;
  height: 57px; padding: 0 14px;
  background: var(--chrome-800);
  border-bottom: 1px solid var(--chrome-hair);
}
/* No [dir='rtl'] flip belongs here. A plain 'flex-direction: row' already
   follows the writing mode - main-start IS inline-start, which under dir="rtl"
   is the right edge - so the bar mirrors itself and the hamburger lands beside
   the sidebar. Adding 'row-reverse' swaps main-start back to the left and
   un-mirrors the row into physical LTR order, which put the hamburger at the
   opposite end of the screen from the sidebar it opens. */
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

/* min-width: 0 is load-bearing on every item below that is allowed to give
   way. A flex item defaults to min-width: auto, which floors it at its own
   min-content width - so "flex: 0 1 400px" here never actually shrank, because
   the label and the shortcut hint held the button open. Between 768px, where
   the sidebar takes 250px off the bar, and roughly 1000px, the row's
   min-content width was wider than the space left for it and the bar
   overflowed: the hamburger was pushed off the leading edge and the account
   block ran past the trailing one. Items that must stay square keep
   "flex: none"; the ones that may shrink now truncate instead of pushing. */
.lmsnav-jump {
  display: flex; align-items: center; gap: 9px;
  flex: 0 1 400px; min-width: 0; height: 34px; padding-block: 0;
  padding-inline: 11px 7px;
  border: 1px solid rgba(255,255,255,.10); border-radius: 8px;
  background: rgba(0,0,0,.20); color: rgba(255,255,255,.42);
  font-family: inherit; font-weight: 400; font-size: 13px; line-height: 1;
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease, color .15s ease;
}
.lmsnav-jump:hover {
  background: rgba(0,0,0,.30); border-color: rgba(255,255,255,.20); color: rgba(255,255,255,.68);
}
.lmsnav-jump > i { font-size: 12px; }
.lmsnav-jump-label {
  flex: 1 1 auto; min-width: 0; text-align: start;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lmsnav-jump > .lmsnav-kbd { flex: none; }

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
  font-family: inherit; font-weight: 600; font-size: 12px; line-height: 1;
  letter-spacing: .03em; cursor: pointer;
  transition: background .15s ease, color .15s ease, border-color .15s ease;
}
.lmsnav-lang:hover { background: rgba(255,255,255,.09); border-color: rgba(255,255,255,.26); color: #fff; }

.lmsnav-bell-wrap { position: relative; flex: none; }
.lmsnav-bell-wrap > .lmsnav-icon { position: relative; }
.lmsnav-badge {
  position: absolute; top: 1px; inset-inline-end: 1px;
  min-width: 15px; height: 15px; padding: 0 3px;
  display: grid; place-items: center;
  border-radius: 99px; background: var(--critical); color: #fff;
  font-weight: 700; font-size: 9.5px; line-height: 1; letter-spacing: 0;
  box-shadow: 0 0 0 2px var(--chrome-800);
}
.lmsnav-empty { padding: 14px 10px; text-align: center; font-size: 12px; color: rgba(255,255,255,.44); }
.lmsnav-dot {
  display: inline-block; vertical-align: middle;
  width: 6px; height: 6px; margin-inline-start: 6px;
  border-radius: 50%; background: var(--brand-250);
}

.lmsnav-user { position: relative; flex: 0 1 auto; min-width: 0; }
.lmsnav-trigger {
  display: flex; align-items: center; gap: 9px;
  height: 42px; min-width: 0; padding-block: 0; padding-inline: 5px 7px;
  border: 0; border-radius: 8px; background: transparent; cursor: pointer;
  transition: background .15s ease;
}
.lmsnav-trigger:hover { background: rgba(255,255,255,.09); }
.lmsnav-meta { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; min-width: 0; max-width: 150px; }
.lmsnav-name { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.92); line-height: 1.2;
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lmsnav-role { font-size: 10.5px; color: rgba(255,255,255,.48); line-height: 1.2;
  max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lmsnav-chev { font-size: 9px; color: rgba(255,255,255,.38); transition: transform .18s ease; }
.lmsnav-trigger[aria-expanded="true"] .lmsnav-chev { transform: rotate(180deg); }

.lmsnav-skel { display: block; border-radius: 3px; background: rgba(255,255,255,.16); }
.lmsnav-pulse { animation: lmsnav-pulse 1.5s ease-in-out infinite; }
@keyframes lmsnav-pulse { 0%,100% { opacity: .45 } 50% { opacity: 1 } }

.lmsnav-menu {
  position: absolute; top: calc(100% + 5px); inset-inline-end: 0; width: 272px; padding: 6px;
  background: var(--chrome-700); border: 1px solid rgba(255,255,255,.11); border-radius: 10px;
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
  font-family: inherit; font-weight: 400; font-size: 13px; line-height: 1.3;
  text-align: start; text-decoration: none; cursor: pointer;
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
  background: var(--chrome-700); border: 1px solid rgba(255,255,255,.11); border-radius: 12px;
  overflow: hidden; box-shadow: 0 28px 70px rgba(0,0,0,.55);
  animation: lmsnav-rise .17s ease;
}
@keyframes lmsnav-rise { from { opacity: 0; transform: translateY(-10px) } to { opacity: 1; transform: none } }
.lmsnav-pal-search { display: flex; align-items: center; gap: 11px; padding: 13px 14px; border-bottom: 1px solid rgba(255,255,255,.09); }
.lmsnav-pal-search > i { color: rgba(255,255,255,.40); font-size: 13px; }
.lmsnav-pal-input {
  flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
  font-family: inherit; font-weight: 400; font-size: 14.5px; line-height: 1.4;
  color: rgba(255,255,255,.94);
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
.lmsnav-opt[aria-selected="true"] > i { color: var(--brand-250); }
.lmsnav-path { margin-inline-start: auto; font-size: 10.5px; color: rgba(255,255,255,.34); background: none; padding: 0; }
.lmsnav-opt[aria-selected="true"] .lmsnav-path { color: rgba(255,255,255,.55); }
.lmsnav-pal-empty { margin: 0; padding: 26px 16px; text-align: center; color: rgba(255,255,255,.46); font-size: 13px; }
.lmsnav-pal-foot {
  display: flex; gap: 15px; padding: 8px 14px;
  border-top: 1px solid rgba(255,255,255,.09); background: rgba(0,0,0,.16);
  font-size: 10.5px; color: rgba(255,255,255,.42);
}
.lmsnav-pal-foot span { display: flex; align-items: center; gap: 5px; }

.lmsnav :focus-visible, .lmsnav-pal :focus-visible { outline: 2px solid var(--brand-250); outline-offset: 2px; }

/* The tablet band. The sidebar still occupies 250px here while the bar has
   only the rest of a <=991px viewport to work with, so the two things that
   are nice-to-have rather than content step aside: the keyboard hint, and the
   name and role beside the avatar. The avatar and the chevron still say whose
   account it is and that the menu opens. */
@media (max-width: 991.98px) {
  .lmsnav-jump .lmsnav-kbd { display: none; }
  .lmsnav-meta { display: none; }
}
@media (max-width: 767px) {
  .lmsnav { padding: 0 8px; gap: 4px; }
  .lmsnav-rule { display: none; }
  .lmsnav-jump { flex: none; width: 34px; padding: 0; justify-content: center; }
  .lmsnav-jump-label, .lmsnav-jump .lmsnav-kbd { display: none; }
  .lmsnav-scrim { padding-top: 7vh; }
}
@media (prefers-reduced-motion: reduce) {
  .lmsnav *, .lmsnav-menu, .lmsnav-scrim, .lmsnav-pal { animation: none !important; transition: none !important; }
}
`
