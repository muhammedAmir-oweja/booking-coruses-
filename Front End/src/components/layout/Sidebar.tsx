import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { User } from '../../types'
import { useState } from 'react'

interface SidebarProps {
  user: User | null
}

interface NavItem {
  label: string
  to: string
  icon: string
}

interface NavGroup {
  label: string
  icon: string
  children: NavItem[]
  roles: ('admin' | 'instructor' | 'student')[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Dashboard',
    icon: 'fas fa-tachometer-alt',
    roles: ['admin', 'instructor', 'student'],
    children: [{ label: 'Overview', to: '/', icon: 'far fa-circle' }],
  },
  {
    label: 'Courses',
    icon: 'fas fa-book',
    roles: ['admin'],
    children: [
      { label: 'All Courses', to: '/courses', icon: 'far fa-circle' },
      { label: 'Add Course', to: '/courses/new', icon: 'far fa-circle' },
    ],
  },
  {
    label: 'My Courses',
    icon: 'fas fa-book-open',
    roles: ['instructor'],
    children: [
      { label: 'My Courses', to: '/courses', icon: 'far fa-circle' },
      { label: 'Add Course', to: '/courses/new', icon: 'far fa-circle' },
    ],
  },
  {
    label: 'Browse Courses',
    icon: 'fas fa-search',
    roles: ['student'],
    children: [
      { label: 'All Courses', to: '/courses', icon: 'far fa-circle' },
    ],
  },
  {
    label: 'Students',
    icon: 'fas fa-user-graduate',
    roles: ['admin'],
    children: [
      { label: 'All Students', to: '/students', icon: 'far fa-circle' },
      { label: 'Add Student', to: '/students/new', icon: 'far fa-circle' },
    ],
  },
  {
    label: 'Sessions',
    icon: 'fas fa-chalkboard-teacher',
    roles: ['admin', 'instructor'],
    children: [
      { label: 'All Sessions', to: '/training-sessions', icon: 'far fa-circle' },
      { label: 'Add Session', to: '/training-sessions/new', icon: 'far fa-circle' },
    ],
  },
  {
    label: 'Enrollments',
    icon: 'fas fa-user-plus',
    roles: ['admin', 'instructor', 'student'],
    children: [
      { label: 'All Enrollments', to: '/enrollments', icon: 'far fa-circle' },
      { label: 'Enroll Student', to: '/enrollments/new', icon: 'far fa-circle' },
    ],
  },
  {
    label: 'Bookings',
    icon: 'fas fa-calendar-check',
    roles: ['admin', 'student'],
    children: [
      { label: 'All Bookings', to: '/bookings', icon: 'far fa-circle' },
    ],
  },
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  instructor: 'Instructor',
  student: 'Student',
}

export default function Sidebar({ user }: SidebarProps) {
  const location = useLocation()
  const { isAdmin, isInstructor, isStudent } = useAuth()

  const [overrides, setOverrides] = useState<Record<string, boolean>>({})

  const toggleGroup = (label: string, currentlyOpen: boolean) =>
    setOverrides(prev => ({ ...prev, [label]: !currentlyOpen }))

  const visibleGroups = navGroups.filter(g => {
    if (isAdmin) return g.roles.includes('admin')
    if (isInstructor) return g.roles.includes('instructor')
    if (isStudent) return g.roles.includes('student')
    return false
  })

  const filteredGroups = visibleGroups.map(g => {
    if (isStudent && g.label === 'Enrollments') {
      return { ...g, children: g.children.filter(c => c.to !== '/enrollments/new') }
    }
    return g
  })

  const isGroupActive = (group: NavGroup) =>
    group.children.some(
      (c) => location.pathname.startsWith(c.to) && (c.to !== '/' || location.pathname === '/')
    )

  const isGroupOpen = (group: NavGroup) =>
    overrides[group.label] ?? isGroupActive(group)

  return (
    <aside className="main-sidebar sidebar-dark-primary elevation-4">
      <NavLink to="/" className="brand-link">
        <i className="fas fa-graduation-cap brand-image img-circle elevation-3" style={{ fontSize: 22, lineHeight: '33px', opacity: 0.8 }} />
        <span className="brand-text font-weight-light">Course Booking</span>
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
              {user ? (ROLE_LABELS[user.role] ?? user.role) : ''}
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
                <li key={group.label} className={`nav-item has-treeview${open ? ' menu-open' : ''}`}>
                  <a href="#" className={`nav-link${active ? ' active' : ''}`}
                    onClick={(e) => { e.preventDefault(); toggleGroup(group.label, open) }}
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
