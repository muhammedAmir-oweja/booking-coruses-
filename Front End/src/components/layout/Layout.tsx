import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { useAuth } from '../../context/AuthContext'
import { ToastProvider } from '../../context/ToastProvider'
import { usePreferences } from '../../context/PreferencesContext'

export default function Layout() {
  const { user } = useAuth()
  const { prefs, update } = usePreferences()

  // Initial state comes from the cookie, not a hardcoded default: the sidebar
  // paints at its stored width on the first render, with no request needed to
  // decide that.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(prefs.sidebar_collapsed)

  const toggleSidebar = () => {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    void update({ sidebar_collapsed: next })
  }

  // AdminLTE keys the collapsed layout off <body> - its rule is
  // `.sidebar-mini.sidebar-collapse .main-header`, and `sidebar-mini` lives on
  // <body> in index.html. Both classes have to sit on the same element or the
  // navbar and content keep their 250px offset while the sidebar shrinks.
  useEffect(() => {
    document.body.classList.toggle('sidebar-collapse', sidebarCollapsed)
    return () => document.body.classList.remove('sidebar-collapse')
  }, [sidebarCollapsed])

  return (
    <ToastProvider>
      <div className="wrapper">
        <Navbar onToggleSidebar={toggleSidebar} user={user} />
        <Sidebar user={user} />

        <div className="content-wrapper">
          <Outlet />
        </div>

        <Footer />

        <aside className="control-sidebar control-sidebar-dark" />
      </div>
    </ToastProvider>
  )
}
