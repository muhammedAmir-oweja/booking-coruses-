import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { User } from '../../types'
import { Fragment, useMemo, useState } from 'react'

interface SidebarProps {
  user: User | null
  /**
   * Closes the mobile drawer once a destination is chosen. Layout owns that
   * state; the sidebar only reports that navigation happened. Fired on the
   * links, never on a group header - expanding a group is not navigating.
   */
  onNavigate?: () => void
}

interface NavItem {
  label: string
  to: string
  icon: string
}

interface NavGroup {
  key: string
  section: string
  label: string
  icon: string
  children: NavItem[]
  roles: ('admin' | 'instructor' | 'student')[]
}

/**
 * The four bands the navigation is grouped into. A flat list of eight
 * collapsibles gives the eye nothing to aim at; these are the headings that
 * break it up. Order here is the order on screen, and a band with nothing in
 * it for the current role renders no heading at all.
 */
const SECTIONS: { key: string; labelKey: string }[] = [
  { key: 'overview', labelKey: 'nav.section_overview' },
  { key: 'learning', labelKey: 'nav.section_learning' },
  { key: 'people', labelKey: 'nav.section_people' },
  { key: 'commerce', labelKey: 'nav.section_commerce' },
]

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
  section: string
  labelKey: string
  icon: string
  roles: ('admin' | 'instructor' | 'student')[]
  children: { labelKey: string; to: string; icon: string }[]
}[] = [
  {
    key: 'dashboard',
    section: 'overview',
    labelKey: 'nav.dashboard',
    icon: 'fas fa-tachometer-alt',
    roles: ['admin', 'instructor', 'student'],
    children: [{ labelKey: 'nav.overview', to: '/', icon: 'far fa-circle' }],
  },
  {
    key: 'courses',
    section: 'learning',
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
    section: 'learning',
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
    section: 'learning',
    labelKey: 'nav.browse_courses',
    icon: 'fas fa-search',
    roles: ['student'],
    children: [
      { labelKey: 'nav.all_courses', to: '/courses', icon: 'far fa-circle' },
    ],
  },
  {
    key: 'students',
    section: 'people',
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
    section: 'learning',
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
    section: 'people',
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
    section: 'commerce',
    labelKey: 'nav.bookings',
    icon: 'fas fa-calendar-check',
    roles: ['admin', 'student'],
    children: [
      { labelKey: 'nav.all_bookings', to: '/bookings', icon: 'far fa-circle' },
    ],
  },
]

export default function Sidebar({ user, onNavigate }: SidebarProps) {
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
      section: g.section,
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
      <NavLink to="/" className="brand-link" onClick={onNavigate}>
        {/* Sizing, shape and colour all live in chrome.css. They were inline
            here, which meant the brand mark could not be restyled without
            editing a component, and inline values quietly outrank a
            stylesheet. `img-circle` is gone with them: the mark is a rounded
            tile now, matching the card radius used across the app. */}
        <i className="fas fa-graduation-cap brand-image" />
        <span className="brand-text font-weight-light">{t('app.name')}</span>
      </NavLink>

      <div className="sidebar">
        <div className="user-panel mt-3 pb-3 mb-3 d-flex">
          <div className="image">
            <i className="fas fa-user-circle" />
          </div>
          <div className="info">
            <NavLink to="/profile" className="d-block" onClick={onNavigate}>
              {user?.name ?? '...'}
            </NavLink>
            <small>
              {user ? t(`roles.${user.role}`, { defaultValue: user.role }) : ''}
            </small>
          </div>
        </div>

        <nav className="mt-2">
          {/* One flat list, with AdminLTE's own `nav-header` items as the
              section dividers. The groups deliberately stay DIRECT children
              of `.nav-sidebar`: AdminLTE's collapsed-rail rules are written
              as `.nav-sidebar > .nav-item > .nav-link > p`, so wrapping each
              section in its own <ul> stops the mini rail from hiding the
              labels and leaves clipped text in a 4.6rem gutter. */}
          <ul
            className="nav nav-pills nav-sidebar flex-column"
            data-widget="treeview"
            role="menu"
            data-accordion="false"
          >
            {SECTIONS.map((section) => {
              const groups = filteredGroups.filter((g) => g.section === section.key)
              // A band this role has nothing in must not leave its heading
              // behind - that is how you get a "Commerce" label with nothing
              // under it.
              if (!groups.length) return null

              return (
                <Fragment key={section.key}>
                  <li className="nav-header lmsnav-section">{t(section.labelKey)}</li>

                  {groups.map((group) => {
                    /* A group with one destination is not a group. Four of
                       these were a collapsible wrapper around a single link -
                       two clicks and an animation to reach something that was
                       never hidden - so a lone child is promoted to a direct
                       link and the parent disappears. */
                    if (group.children.length === 1) {
                      const only = group.children[0]
                      return (
                        <li key={group.key} className="nav-item">
                          <NavLink
                            to={only.to}
                            end={only.to === '/'}
                            onClick={onNavigate}
                            title={group.label}
                            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                          >
                            <i className={`nav-icon ${group.icon}`} />
                            <p><span>{group.label}</span></p>
                          </NavLink>
                        </li>
                      )
                    }

                    const active = isGroupActive(group)
                    const open = isGroupOpen(group)
                    return (
                      <li key={group.key} className={`nav-item has-treeview${open ? ' menu-open' : ''}`}>
                        <a
                          href="#"
                          /* Lit rather than filled when a child is the current
                             page: a filled parent would compete with the real
                             selection underneath it. */
                          className={`nav-link${active ? ' lmsnav-open-parent' : ''}`}
                          title={group.label}
                          aria-expanded={open}
                          onClick={(e) => { e.preventDefault(); toggleGroup(group.key, open) }}
                        >
                          <i className={`nav-icon ${group.icon}`} />
                          <p>
                            <span>{group.label}</span>
                            <i className="right fas fa-angle-left" />
                          </p>
                        </a>
                        <ul className="nav nav-treeview">
                          {group.children.map((item) => (
                            <li key={item.to + item.label} className="nav-item">
                              <NavLink
                                to={item.to}
                                end={item.to === '/'}
                                onClick={onNavigate}
                                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                              >
                                <i className={`${item.icon} nav-icon`} />
                                <p><span>{item.label}</span></p>
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </li>
                    )
                  })}
                </Fragment>
              )
            })}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
