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

const ROLE_LABELS: Record<string, string> = {
  admin:      'Administrator',
  instructor: 'Instructor',
  student:    'Student',
}

// A <button> is the right element for something that opens a menu, but it
// needs its chrome stripped to sit flush with the .nav-link links beside it.
const bareButton: React.CSSProperties = {
  background: 'none',
  border: 0,
  cursor: 'pointer',
}

export default function Navbar({ onToggleSidebar, user }: NavbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLLIElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

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

  // Escape closes the menu and hands focus back to the control that opened it,
  // so keyboard users are not dropped at the top of the document.
  useEffect(() => {
    if (!userMenuOpen) return
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setUserMenuOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [userMenuOpen])

  const handleLogout = async () => {
    await logout().catch(() => null)
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  const roleColor = user ? (ROLE_COLORS[user.role] ?? '#6c757d') : '#6c757d'
  const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : ''

  return (
    <nav className="main-header navbar navbar-expand navbar-white navbar-light elevation-1">
      <ul className="navbar-nav">
        <li className="nav-item">
          <button
            type="button"
            className="nav-link"
            style={bareButton}
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <i className="fas fa-bars" />
          </button>
        </li>
        <li className="nav-item d-none d-sm-inline-block">
          {/* Called "Dashboard" everywhere else in the app - the sidebar group,
              the page heading - so it is called that here too. */}
          <Link to="/" className="nav-link">
            <i className="fas fa-tachometer-alt mr-1" /> Dashboard
          </Link>
        </li>
      </ul>

      <ul className="navbar-nav ml-auto">
        <li ref={menuRef} className={`nav-item dropdown user-menu${userMenuOpen ? ' show' : ''}`}>
          <button
            ref={toggleRef}
            type="button"
            className="nav-link"
            style={bareButton}
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen((open) => !open)}
          >
            <i className="fas fa-user-circle mr-2" style={{ fontSize: 18 }} />
            {user ? (
              <span className="d-none d-sm-inline" style={{ fontWeight: 600 }}>
                {user.name}
              </span>
            ) : (
              // A neutral block reads as "loading". A literal "..." reads as
              // bad data, which matters because /auth/me can genuinely fail.
              <span
                className="d-none d-sm-inline bg-secondary rounded"
                style={{ width: 90, height: 13, opacity: 0.3, verticalAlign: 'middle' }}
                role="status"
                aria-label="Loading account"
              />
            )}
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
          </button>

          {/* AdminLTE styles .user-menu > .dropdown-menu into a 280px panel,
              but only when the children are .user-header / .user-body /
              .user-footer on a <ul>. */}
          <ul className={`dropdown-menu dropdown-menu-right${userMenuOpen ? ' show' : ''}`}>
            <li className="user-header bg-primary">
              <i
                className="fas fa-user-circle"
                style={{ fontSize: 72, color: 'rgba(255,255,255,.85)', lineHeight: '90px' }}
              />
              <p>
                {user?.name ?? 'Loading account'}
                {roleLabel && <small>{roleLabel}</small>}
                {user?.email && <small>{user.email}</small>}
              </p>
            </li>

            <li className="user-body">
              <Link
                to="/profile"
                className="btn btn-default btn-block btn-sm"
                onClick={() => setUserMenuOpen(false)}
              >
                <i className="fas fa-user mr-1" /> My Profile
              </Link>
            </li>

            <li className="user-footer">
              {DEV_NO_AUTH ? (
                <span className="text-muted" style={{ fontSize: 11 }}>
                  <i className="fas fa-unlock mr-1" /> Dev mode &mdash; auth bypassed
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn-default btn-flat float-right text-danger"
                  onClick={handleLogout}
                >
                  <i className="fas fa-sign-out-alt mr-1" /> Sign Out
                </button>
              )}
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  )
}
