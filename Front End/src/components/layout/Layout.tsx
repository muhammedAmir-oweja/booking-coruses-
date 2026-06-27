import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Footer from './Footer'
import { useAuth } from '../../context/AuthContext'
import { ToastProvider } from '../../context/ToastContext'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user } = useAuth()

  return (
    <ToastProvider>
      <div className={`wrapper${sidebarCollapsed ? ' sidebar-collapse' : ''}`}>
        <Navbar onToggleSidebar={() => setSidebarCollapsed((c) => !c)} user={user} />
        <Sidebar collapsed={sidebarCollapsed} user={user} />

        <div className="content-wrapper">
          <Outlet />
        </div>

        <Footer />

        <aside className="control-sidebar control-sidebar-dark" />
      </div>
    </ToastProvider>
  )
}
