import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardStats } from '../api/dashboard'
import { getEnrollments } from '../api/enrollments'
import { getBookings } from '../api/bookings'
import { useAuth } from '../context/AuthContext'
import type { DashboardStats, DashboardBooking, TopCourse, Enrollment, Booking } from '../types'

function StatCard({ title, value, icon, color, to }: {
  title: string; value: string | number; icon: string; color: string; to: string
}) {
  return (
    <div className="col-lg-3 col-6">
      <div className={`small-box bg-${color}`}>
        <div className="inner">
          <h3>{value}</h3>
          <p>{title}</p>
        </div>
        <div className="icon"><i className={icon} /></div>
        <Link to={to} className="small-box-footer">
          More info <i className="fas fa-arrow-circle-right" />
        </Link>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: 'badge-success', pending: 'badge-warning', cancelled: 'badge-danger',
    paid: 'badge-success', unpaid: 'badge-warning', refunded: 'badge-info',
  }
  return <span className={`badge ${map[status] ?? 'badge-secondary'}`}>{status}</span>
}

// ── Admin Dashboard ────────────────────────────────────────────────
function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      {error && <div className="alert alert-warning"><i className="fas fa-exclamation-triangle mr-2" />{error}</div>}

      <div className="row">
        <StatCard title="Total Courses"    value={loading ? '...' : (stats?.total_courses ?? 0)}  icon="ion ion-book"        color="info"    to="/courses" />
        <StatCard title="Total Bookings"   value={loading ? '...' : (stats?.total_bookings ?? 0)} icon="ion ion-calendar"    color="success" to="/bookings" />
        <StatCard title="Total Students"   value={loading ? '...' : (stats?.total_users ?? 0)}    icon="ion ion-person-add"  color="warning" to="/students" />
        <StatCard title="Total Revenue"    value={loading ? '...' : `$${(stats?.total_revenue ?? 0).toLocaleString()}`} icon="ion ion-cash" color="danger" to="/bookings" />
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><i className="fas fa-calendar-check mr-1" />Recent Bookings</h3>
              <div className="card-tools"><Link to="/bookings" className="btn btn-tool btn-sm">View All</Link></div>
            </div>
            <div className="card-body p-0">
              <table className="table table-striped table-hover">
                <thead><tr><th>#</th><th>Student</th><th>Course</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={6} className="text-center py-3"><i className="fas fa-spinner fa-spin mr-2" />Loading...</td></tr>}
                  {!loading && !stats?.recent_bookings?.length && <tr><td colSpan={6} className="text-center py-3 text-muted">No bookings yet</td></tr>}
                  {stats?.recent_bookings?.map((b: DashboardBooking) => (
                    <tr key={b.id}>
                      <td>{b.id}</td>
                      <td>{b.student?.name ?? `Student #${b.student_id}`}</td>
                      <td>{b.course?.title ?? `Course #${b.course_id}`}</td>
                      <td>${b.amount}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td>{b.booked_at ? new Date(b.booked_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><i className="fas fa-star mr-1" />Top Courses</h3>
              <div className="card-tools"><Link to="/courses" className="btn btn-tool btn-sm">View All</Link></div>
            </div>
            <div className="card-body p-0">
              <ul className="products-list product-list-in-card pl-2 pr-2">
                {loading && <li className="item text-center py-3"><i className="fas fa-spinner fa-spin" /></li>}
                {!loading && !stats?.top_courses?.length && <li className="item text-center py-3 text-muted">No courses yet</li>}
                {stats?.top_courses?.map((c: TopCourse) => (
                  <li key={c.id} className="item">
                    <div className="product-info">
                      <Link to={`/courses/${c.id}/edit`} className="product-title">
                        {c.title}
                        <span className={`badge float-right badge-${c.status === 'active' ? 'success' : 'secondary'}`}>{c.status}</span>
                      </Link>
                      <span className="product-description">{c.enrolled_count} / {c.capacity} enrolled &mdash; ${c.price}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-footer text-center"><Link to="/courses">View All Courses</Link></div>
          </div>
        </div>
      </div>

      {stats?.monthly_revenue && stats.monthly_revenue.length > 0 && (
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header"><h3 className="card-title"><i className="fas fa-chart-line mr-1" />Monthly Revenue</h3></div>
              <div className="card-body">
                <div className="row">
                  {stats.monthly_revenue.map((m) => (
                    <div key={m.month} className="col-md-2 col-4 text-center">
                      <div className="description-block border-right">
                        <span className="description-percentage text-success"><i className="fas fa-dollar-sign" /></span>
                        <h5 className="description-header">${m.revenue.toLocaleString()}</h5>
                        <span className="description-text">{m.month}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Instructor Dashboard ───────────────────────────────────────────
function InstructorDashboard() {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getEnrollments({ per_page: 10 })
      .then(r => setEnrollments(r.data.data))
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="alert alert-info">
        <i className="fas fa-chalkboard-teacher mr-2" />
        Welcome back, <strong>{user?.name}</strong>. You are viewing your instructor dashboard.
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><i className="fas fa-user-plus mr-1" />Recent Enrollments in My Courses</h3>
              <div className="card-tools"><Link to="/enrollments" className="btn btn-tool btn-sm">View All</Link></div>
            </div>
            <div className="card-body p-0">
              <table className="table table-striped table-hover">
                <thead><tr><th>#</th><th>Student</th><th>Course</th><th>Enrolled At</th><th>Status</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={5} className="text-center py-3"><i className="fas fa-spinner fa-spin mr-2" />Loading...</td></tr>}
                  {!loading && !enrollments.length && <tr><td colSpan={5} className="text-center py-3 text-muted">No enrollments yet</td></tr>}
                  {enrollments.map(e => (
                    <tr key={e.id}>
                      <td>{e.id}</td>
                      <td>{e.student?.name ?? `#${e.student_id}`}</td>
                      <td>{e.course?.title ?? `#${e.course_id}`}</td>
                      <td>{e.enrolled_at ?? '—'}</td>
                      <td><StatusBadge status={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Student Dashboard ──────────────────────────────────────────────
function StudentDashboard() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getBookings({ per_page: 10 }).then(r => setBookings(r.data.data)),
      getEnrollments({ per_page: 10 }).then(r => setEnrollments(r.data.data)),
    ])
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="alert alert-success">
        <i className="fas fa-graduation-cap mr-2" />
        Welcome back, <strong>{user?.name}</strong>. Here's your learning overview.
      </div>

      <div className="row">
        <StatCard title="My Bookings"    value={loading ? '...' : bookings.length}    icon="ion ion-calendar"   color="info"    to="/bookings" />
        <StatCard title="My Enrollments" value={loading ? '...' : enrollments.length} icon="ion ion-person-add" color="success" to="/enrollments" />
        <StatCard title="Browse Courses" value="→" icon="ion ion-book" color="warning" to="/courses" />
        <StatCard title="My Profile"     value="→" icon="ion ion-person" color="danger" to="/profile" />
      </div>

      <div className="row">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><i className="fas fa-calendar-check mr-1" />My Bookings</h3>
              <div className="card-tools"><Link to="/bookings" className="btn btn-tool btn-sm">View All</Link></div>
            </div>
            <div className="card-body p-0">
              <table className="table table-striped table-hover">
                <thead><tr><th>Course</th><th>Amount</th><th>Status</th><th>Payment</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={4} className="text-center py-3"><i className="fas fa-spinner fa-spin mr-2" />Loading...</td></tr>}
                  {!loading && !bookings.length && <tr><td colSpan={4} className="text-center py-3 text-muted">No bookings yet</td></tr>}
                  {bookings.map(b => (
                    <tr key={b.id}>
                      <td>{b.course?.title ?? `Course #${b.course_id}`}</td>
                      <td>${b.amount}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td><StatusBadge status={b.payment_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><i className="fas fa-book-open mr-1" />My Enrollments</h3>
              <div className="card-tools"><Link to="/enrollments" className="btn btn-tool btn-sm">View All</Link></div>
            </div>
            <div className="card-body p-0">
              <table className="table table-striped table-hover">
                <thead><tr><th>Course</th><th>Enrolled At</th><th>Status</th></tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={3} className="text-center py-3"><i className="fas fa-spinner fa-spin mr-2" />Loading...</td></tr>}
                  {!loading && !enrollments.length && <tr><td colSpan={3} className="text-center py-3 text-muted">No enrollments yet</td></tr>}
                  {enrollments.map(e => (
                    <tr key={e.id}>
                      <td>{e.course?.title ?? `Course #${e.course_id}`}</td>
                      <td>{e.enrolled_at ?? '—'}</td>
                      <td><StatusBadge status={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Dashboard (role router) ───────────────────────────────────
export default function Dashboard() {
  const { isAdmin, isInstructor, isStudent } = useAuth()

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6"><h1 className="m-0">Dashboard</h1></div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/">Home</Link></li>
                <li className="breadcrumb-item active">Dashboard</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          {isAdmin      && <AdminDashboard />}
          {isInstructor && <InstructorDashboard />}
          {isStudent    && <StudentDashboard />}
        </div>
      </section>
    </>
  )
}
