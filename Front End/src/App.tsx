import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider'
import { PreferencesProvider } from './context/PreferencesProvider'
import { useAuth } from './context/AuthContext'
import { DEV_NO_AUTH } from './devAuth'
import { readAccess, readRefresh } from './auth/tokens'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Courses from './pages/Courses'
import CourseForm from './pages/CourseForm'
import Students from './pages/Students'
import StudentForm from './pages/StudentForm'
import TrainingSessions from './pages/TrainingSessions'
import TrainingSessionForm from './pages/TrainingSessionForm'
import Enrollments from './pages/Enrollments'
import EnrollmentForm from './pages/EnrollmentForm'
import Bookings from './pages/Bookings'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'
import NotFound from './pages/NotFound'
import Forbidden from './pages/Forbidden'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (DEV_NO_AUTH) return <>{children}</>
  // The ACCESS token may well be expired here - the 401 handler in
  // api/client.ts refreshes it on the first request. What matters at this
  // gate is only whether a session exists at all.
  return readAccess() || readRefresh()
    ? <>{children}</>
    : <Navigate to="/login" replace />
}

type Role = 'admin' | 'instructor' | 'student'

/**
 * Route-level role gating, to go with the token check above.
 *
 * The sidebar and the command palette already filter what they OFFER by role,
 * but filtering the menu is not authorization: a bookmark, a shared link or the
 * back button walks straight past it. A student who typed /students used to get
 * the real page with a red "Failed to load students." banner - which blames the
 * server for what is actually a permission decision, and still renders the
 * form, the headings and the empty table around it. /students/new even rendered
 * a complete Add Student form that could only ever 403 on submit.
 *
 * The roles live inline on each <Route> on purpose. Navbar.tsx already warns
 * that its ROUTES table and Sidebar.tsx's GROUPS must not drift; a third copy
 * here would be the drift. The route table IS the place route permissions
 * belong, right next to the path they guard.
 *
 * The API is of course the real gate, and it answers 403 correctly - this only
 * decides what the user is shown instead of a broken page.
 */
function RoleRoute({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth()

  // Still resolving /auth/me: render nothing rather than deciding on a role we
  // do not have yet, which would flash Forbidden on every hard refresh.
  if (loading) return null

  // DEV_NO_AUTH signs everyone in as an admin, so nothing to withhold.
  if (DEV_NO_AUTH) return <>{children}</>

  return user && roles.includes(user.role as Role) ? <>{children}</> : <Forbidden />
}

export default function App() {
  return (
    <BrowserRouter>
    {/* Outside AuthProvider on purpose: the login page needs the stored
        theme and language too, and a logged-out visitor still has a cookie. */}
    <PreferencesProvider>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={DEV_NO_AUTH ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={DEV_NO_AUTH ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/forgot-password" element={<Navigate to="/login" replace />} />

        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/new" element={<RoleRoute roles={['admin', 'instructor']}><CourseForm /></RoleRoute>} />
          <Route path="/courses/:id/edit" element={<RoleRoute roles={['admin', 'instructor']}><CourseForm /></RoleRoute>} />
          <Route path="/students" element={<RoleRoute roles={['admin']}><Students /></RoleRoute>} />
          <Route path="/students/new" element={<RoleRoute roles={['admin']}><StudentForm /></RoleRoute>} />
          <Route path="/students/:id/edit" element={<RoleRoute roles={['admin']}><StudentForm /></RoleRoute>} />
          <Route path="/training-sessions" element={<RoleRoute roles={['admin', 'instructor']}><TrainingSessions /></RoleRoute>} />
          <Route path="/training-sessions/new" element={<RoleRoute roles={['admin', 'instructor']}><TrainingSessionForm /></RoleRoute>} />
          <Route path="/training-sessions/:id/edit" element={<RoleRoute roles={['admin', 'instructor']}><TrainingSessionForm /></RoleRoute>} />
          <Route path="/enrollments" element={<Enrollments />} />
          <Route path="/enrollments/new" element={<RoleRoute roles={['admin', 'instructor']}><EnrollmentForm /></RoleRoute>} />
          <Route path="/bookings" element={<RoleRoute roles={['admin', 'student']}><Bookings /></RoleRoute>} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
    </PreferencesProvider>
    </BrowserRouter>
  )
}
