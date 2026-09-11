import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { logout } from '../../api/auth'
import { DEV_NO_AUTH } from '../../devAuth'
import type { User } from '../../types'

interface NavbarProps {
  onToggleSidebar: () => void
  user: User | null
}

const ROLE_COLORS: Record<string, string> = {
  admin:      '#dc3545',
  instructor: '#17a2b8',
  student:    '#28a745',
}

export default function Navbar({ onToggleSidebar, user }: NavbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLLIElement>(null)

  // The dropdown is toggled by React, not Bootstrap's JS, so nothing was
  // closing it when you clicked elsewhere on the page.
  useEffect(() => {
    if (!userMenuOpen) return
    const closeOnOutsideClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [userMenuOpen])

  const handleLogout = async () => {
    await logout().catch(() => null)
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  const roleColor = user ? (ROLE_COLORS[user.role] ?? '#6c757d') : '#6c757d'

  return (
    <nav className="main-header navbar navbar-expand navbar-white navbar-light">
      <ul className="navbar-nav">
        <li className="nav-item">
          <button
            className="nav-link btn btn-link"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <i className="fas fa-bars" />
          </button>
        </li>
        <li className="nav-item d-none d-sm-inline-block">
          <Link to="/" className="nav-link">Home</Link>
        </li>
      </ul>

      <ul className="navbar-nav ml-auto">
        <li ref={menuRef} className={`nav-item dropdown ${userMenuOpen ? 'show' : ''}`}>
          <a
            className="nav-link"
            href="#"
            onClick={(e) => { e.preventDefault(); setUserMenuOpen(!userMenuOpen) }}
          >
            <i className="fas fa-user-circle mr-2" style={{ fontSize: 18 }} />
            <span className="d-none d-sm-inline" style={{ fontWeight: 600 }}>
              {user?.name ?? '...'}
            </span>
            {user && (
              <span
                className="ml-2 badge"
                style={{
                  background: roleColor,
                  color: '#fff',
                  fontSize: 10,
                  padding: '2px 7px',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {user.role}
              </span>
            )}
          </a>
          <div className={`dropdown-menu dropdown-menu-right ${userMenuOpen ? 'show' : ''}`}>
            <div className="dropdown-item disabled" style={{ fontSize: 11, color: '#6c757d', padding: '4px 16px' }}>
              Signed in as <strong>{user?.email ?? '...'}</strong>
            </div>
            <div className="dropdown-divider" />
            <Link to="/profile" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
              <i className="fas fa-user mr-2" /> My Profile
            </Link>
            <div className="dropdown-divider" />
            {DEV_NO_AUTH ? (
              <div className="dropdown-item disabled" style={{ fontSize: 11, color: '#6c757d', padding: '4px 16px' }}>
                <i className="fas fa-unlock mr-2" /> Dev mode &mdash; auth bypassed
              </div>
            ) : (
              <button className="dropdown-item text-danger" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt mr-2" /> Sign Out
              </button>
            )}
          </div>
        </li>
      </ul>
    </nav>
  )
}
