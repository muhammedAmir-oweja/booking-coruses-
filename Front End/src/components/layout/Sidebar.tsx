import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { User } from '../../types'
import { useMemo, useState } from 'react'

interface SidebarProps {
  user: User | null
}

interface NavItem {
  label: string
  to: string
  icon: string
}

interface NavGroup {
  key: string
  label: string
  icon: string
  children: NavItem[]
  roles: ('admin' | 'instructor' | 'student')[]
}

/**
 * Route, icon and roles only - no translatable text at module level, for the
 * same reason as Navbar's ROUTES: a module-level array is evaluated once at
 * import time, so a t() call in here would freeze every label to the language
 * the bundle booted in. `labelKey` names the `nav.*` entry, resolved inside the
 * component against a `t` that changes identity on every language switch.
 *
 * `key` is also the group's identity for the open/closed overrides below. That
 * used to be the English label, which would have reset every expanded group
 * the moment the language changed.
 */
const GROUPS: {
  key: string
  labelKey: string
  icon: string
  roles: ('admin' | 'instructor' | 'student')[]
  children: { labelKey: string; to: string; icon: string }[]
}[] = [
  {
    key: 'dashboard',
    labelKey: 'nav.dashboard',
    icon: 'fas fa-tachometer-alt',
    roles: ['admin', 'instructor', 'student'],
    children: [{ labelKey: 'nav.overview', to: '/', icon: 'far fa-circle' }],
  },
  {
    key: 'courses',
    labelKey: 'nav.courses',
    icon: 'fas fa-book',
    roles: ['admin'],
    children: [
      { labelKey: 'nav.all_courses', to: '/courses', icon: 'far fa-circle' },
      { labelKey: 'nav.add_course', to: '/courses/new', icon: 'far fa-circle' },
    ],
  },
  {
    key: 'my_courses',
    labelKey: 'nav.my_courses',
    icon: 'fas fa-book-open',
    roles: ['instructor'],
    children: [
      { labelKey: 'nav.my_courses', to: '/courses', icon: 'far fa-circle' },
      { labelKey: 'nav.add_course', to: '/courses/new', icon: 'far fa-circle' },
    ],
  },
  {
    key: 'browse_courses',
    labelKey: 'nav.browse_courses',
    icon: 'fas fa-search',
    roles: ['student'],
    children: [
      { labelKey: 'nav.all_courses', to: '/courses', icon: 'far fa-circle' },
    ],
  },
  {
    key: 'students',
    labelKey: 'nav.students',
    icon: 'fas fa-user-graduate',
    roles: ['admin'],
    children: [
      { labelKey: 'nav.all_students', to: '/students', icon: 'far fa-circle' },
      { labelKey: 'nav.add_student', to: '/students/new', icon: 'far fa-circle' },
    ],
  },
  {
    key: 'sessions',
    labelKey: 'nav.sessions',
    icon: 'fas fa-chalkboard-teacher',
    roles: ['admin', 'instructor'],
    children: [
      { labelKey: 'nav.all_sessions', to: '/training-sessions', icon: 'far fa-circle' },
      { labelKey: 'nav.add_session', to: '/training-sessions/new', icon: 'far fa-circle' },
    ],
  },
  {
    key: 'enrollments',
    labelKey: 'nav.enrollments',
    icon: 'fas fa-user-plus',
    roles: ['admin', 'instructor', 'student'],
    children: [
      { labelKey: 'nav.all_enrollments', to: '/enrollments', icon: 'far fa-circle' },
      { labelKey: 'nav.enroll_student', to: '/enrollments/new', icon: 'far fa-circle' },
    ],
  },
  {
    key: 'bookings',
    labelKey: 'nav.bookings',
    icon: 'fas fa-calendar-check',
    roles: ['admin', 'student'],
    children: [
      { labelKey: 'nav.all_bookings', to: '/bookings', icon: 'far fa-circle' },
    ],
  },
]

export default function Sidebar({ user }: SidebarProps) {
  const location = useLocation()
  const { t } = useTranslation()
  const { isAdmin, isInstructor, isStudent } = useAuth()

  const [overrides, setOverrides] = useState<Record<string, boolean>>({})

  const toggleGroup = (key: string, currentlyOpen: boolean) =>
    setOverrides(prev => ({ ...prev, [key]: !currentlyOpen }))

  // Rebuilt on every language change, because `t` is a dependency.
  const navGroups = useMemo<NavGroup[]>(
    () => GROUPS.map(g => ({
      key: g.key,
      label: t(g.labelKey),
      icon: g.icon,
      roles: g.roles,
      children: g.children.map(c => ({ label: t(c.labelKey), to: c.to, icon: c.icon })),
    })),
    [t]
  )

  const visibleGroups = navGroups.filter(g => {
    if (isAdmin) return g.roles.includes('admin')
    if (isInstructor) return g.roles.includes('instructor')
    if (isStudent) return g.roles.includes('student')
    return false
  })

  const filteredGroups = visibleGroups.map(g => {
    if (isStudent && g.key === 'enrollments') {
      return { ...g, children: g.children.filter(c => c.to !== '/enrollments/new') }
    }
    return g
  })

  const isGroupActive = (group: NavGroup) =>
    group.children.some(
      (c) => location.pathname.startsWith(c.to) && (c.to !== '/' || location.pathname === '/')
    )

  const isGroupOpen = (group: NavGroup) =>
    overrides[group.key] ?? isGroupActive(group)

  return (
    <aside className="main-sidebar sidebar-dark-primary elevation-4">
      <NavLink to="/" className="brand-link">
        <i className="fas fa-graduation-cap brand-image img-circle elevation-3" style={{ fontSize: 22, lineHeight: '33px', opacity: 0.8 }} />
        <span className="brand-text font-weight-light">{t('app.name')}</span>
      </NavLink>

      <div className="sidebar">
        <div className="user-panel mt-3 pb-3 mb-3 d-flex">
          <div className="image">
            <i className="fas fa-user-circle" style={{ fontSize: 34, color: '#c2c7d0' }} />
          </div>
          <div className="info">
            <NavLink to="/profile" className="d-block" style={{ fontWeight: 600, color: '#c2c7d0' }}>
              {user?.name ?? '...'}
            </NavLink>
            <small style={{ color: '#6c757d', fontSize: 11 }}>
              {user ? t(`roles.${user.role}`, { defaultValue: user.role }) : ''}
            </small>
          </div>
        </div>

        <nav className="mt-2">
          <ul
            className="nav nav-pills nav-sidebar flex-column"
            data-widget="treeview"
            role="menu"
            data-accordion="false"
          >
            {filteredGroups.map((group) => {
              const active = isGroupActive(group)
              const open = isGroupOpen(group)
              return (
                <li key={group.key} className={`nav-item has-treeview${open ? ' menu-open' : ''}`}>
                  <a href="#" className={`nav-link${active ? ' active' : ''}`}
                    onClick={(e) => { e.preventDefault(); toggleGroup(group.key, open) }}
                  >

                    <i className={`nav-icon ${group.icon}`} />
                    <p>
                      {group.label}
                      <i className="right fas fa-angle-left" />
                    </p>
                  </a>
                  <ul className="nav nav-treeview">
                    {group.children.map((item) => (
                      <li key={item.to + item.label} className="nav-item">
                        <NavLink
                          to={item.to}
                          end={item.to === '/'}
                          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                        >
                          <i className={`${item.icon} nav-icon`} />
                          <p>{item.label}</p>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
