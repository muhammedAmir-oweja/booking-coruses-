import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { useAuth } from '../../context/AuthContext'
import { ToastProvider } from '../../context/ToastProvider'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user } = useAuth()

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
        <Navbar onToggleSidebar={() => setSidebarCollapsed((c) => !c)} user={user} />
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
