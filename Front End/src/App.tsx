import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DEV_NO_AUTH } from './devAuth'
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

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (DEV_NO_AUTH) return <>{children}</>
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
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
          <Route path="/courses/new" element={<CourseForm />} />
          <Route path="/courses/:id/edit" element={<CourseForm />} />
          <Route path="/students" element={<Students />} />
          <Route path="/students/new" element={<StudentForm />} />
          <Route path="/students/:id/edit" element={<StudentForm />} />
          <Route path="/training-sessions" element={<TrainingSessions />} />
          <Route path="/training-sessions/new" element={<TrainingSessionForm />} />
          <Route path="/training-sessions/:id/edit" element={<TrainingSessionForm />} />
          <Route path="/enrollments" element={<Enrollments />} />
          <Route path="/enrollments/new" element={<EnrollmentForm />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
    </BrowserRouter>
  )
}
