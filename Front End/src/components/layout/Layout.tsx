import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { useAuth } from '../../context/AuthContext'
import { ToastProvider } from '../../context/ToastProvider'
import { usePreferences } from '../../context/PreferencesContext'

/**
 * AdminLTE drives the shell off two different body classes, and which one
 * applies depends entirely on the viewport:
 *
 *   >= 768px  `sidebar-collapse` shrinks the sidebar to the 4.6rem mini rail.
 *             A persisted preference - it survives a reload.
 *   <  768px  the sidebar is off-canvas (`margin-left: -250px`, inside
 *             `@media (max-width: 767.98px)`) and ONLY `sidebar-open` brings it
 *             back. That one is transient: a drawer you opened is not a setting
 *             you chose, so it is deliberately not written to the cookie.
 *
 * The two must never be applied at once. Toggling `sidebar-collapse` on a phone
 * is what left the hamburger doing nothing at all: below 768px the sidebar was
 * already parked at -250px, so the class moved no pixels and the navigation was
 * unreachable - the Ctrl-K palette was the only way around the app.
 */
const DESKTOP = '(min-width: 768px)'

export default function Layout() {
  const { user } = useAuth()
  const { prefs, update } = usePreferences()

  // Initial state comes from the cookie, not a hardcoded default: the sidebar
  // paints at its stored width on the first render, with no request needed to
  // decide that.
  const [collapsed, setCollapsed] = useState(prefs.sidebar_collapsed)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP).matches)

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP)
    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches)
      // Crossing up to desktop retires the drawer, so shrinking the window
      // again does not reveal one the user never reopened.
      if (e.matches) setDrawerOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // One hamburger, two meanings: resize the rail on desktop, open the drawer
  // on mobile.
  const toggleSidebar = () => {
    if (isDesktop) {
      const next = !collapsed
      setCollapsed(next)
      void update({ sidebar_collapsed: next })
    } else {
      setDrawerOpen((open) => !open)
    }
  }

  // Exactly one of the two classes, never both. They live on <body> because
  // that is where AdminLTE's selectors expect them - `sidebar-mini-md` is on
  // <body> in index.html, and its collapse rule is
  // `.sidebar-mini-md.sidebar-collapse`, so both classes have to sit on the
  // same element or the navbar and content keep their 250px offset while the
  // sidebar shrinks.
  useEffect(() => {
    const { body } = document
    body.classList.toggle('sidebar-collapse', isDesktop && collapsed)
    body.classList.toggle('sidebar-open', !isDesktop && drawerOpen)
    return () => body.classList.remove('sidebar-collapse', 'sidebar-open')
  }, [isDesktop, collapsed, drawerOpen])

  // Escape closes the drawer, matching the navbar's dropdowns and palette.
  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  return (
    <ToastProvider>
      <div className="wrapper">
        <Navbar onToggleSidebar={toggleSidebar} user={user} />
        <Sidebar user={user} onNavigate={() => setDrawerOpen(false)} />

        <div className="content-wrapper">
          <Outlet />
        </div>

        <Footer />

        <aside className="control-sidebar control-sidebar-dark" />

        {/* AdminLTE already styles #sidebar-overlay - z-index 1037, revealed by
            `.sidebar-open` - but ships no markup for it, because its own jQuery
            plugin injects it and we do not load that. 1037 sits under the
            sidebar's 1038, so this dims and swallows taps on the page without
            covering the drawer it closes. */}
        {!isDesktop && drawerOpen && (
          <div id="sidebar-overlay" onClick={() => setDrawerOpen(false)} />
        )}
      </div>
    </ToastProvider>
  )
}
