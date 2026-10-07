export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'instructor' | 'student'
  created_at: string
}

export interface Course {
  id: number
  title: string
  description: string | null
  instructor_id: number
  instructor?: { id: number; name: string }
  price: number
  capacity: number
  hours: number
  enrolled_count: number
  taken_seats: number
  remaining_seats: number
  is_available: boolean
  status: 'active' | 'inactive' | 'draft'
  start_date: string | null
  end_date: string | null
  created_at: string
}

export interface Enrollment {
  id: number
  student_id: number
  course_id: number
  student?: { id: number; name: string; email: string }
  course?: { id: number; title: string }
  enrolled_at?: string
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
}

export interface TrainingSession {
  id: number
  course_id: number
  course?: { id: number; title: string }
  title: string
  description?: string | null
  starts_at: string
  ends_at: string
  duration_minutes?: number
  location?: string | null
  max_attendees?: number | null
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  created_at: string
}

export interface Student {
  id: number
  name: string
  email: string
  phone?: string
  date_of_birth?: string
  address?: string
  photo_url?: string
  created_at: string
}

export interface StudentDocument {
  id: number
  student_id: number
  original_name: string
  url: string
  mime_type?: string
  size?: number
  created_at: string
}

export interface Booking {
  id: number
  student_id: number
  course_id: number
  user_id: number
  student?: { id: number; name: string; email: string }
  course?: { id: number; title: string; price: number }
  amount: number
  status: 'pending' | 'confirmed' | 'cancelled'
  payment_status: 'unpaid' | 'paid' | 'refunded'
  payment_method?: string
  transaction_id?: string
  booked_at: string
  paid_at?: string
  created_at?: string
}

export interface TopCourse {
  id: number
  title: string
  price: number
  capacity: number
  hours?: number
  status: 'active' | 'inactive' | 'draft'
  enrolled_count: number
  remaining_seats: number
  is_available: boolean
  instructor?: { id: number; name: string }
}

export interface DashboardBooking {
  id: number
  student_id: number
  course_id: number
  user_id: number
  amount: number
  status: 'pending' | 'confirmed' | 'cancelled'
  payment_status: 'unpaid' | 'paid' | 'refunded'
  booked_at: string
  student?: { id: number; name: string }
  course?: { id: number; title: string }
}

export interface DashboardStats {
  total_courses: number
  total_bookings: number
  total_users: number
  total_revenue: number
  recent_bookings: DashboardBooking[]
  top_courses: TopCourse[]
  monthly_revenue: { month: string; revenue: number }[]
  monthly_bookings: { month: string; count: number }[]
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

/**
 * Named AppNotification, not Notification: TypeScript's DOM lib already
 * declares a global `Notification`, and shadowing it compiles fine right up
 * until something else in the file touches the browser API.
 */
export interface AppNotification {
  id: string                 // uuid
  read_at: string | null
  created_at: string
  data: {
    type: 'booking_created'
    booking_id: number
    course_title: string | null
    student_name: string | null
    amount: number
    url: string
  }
}
