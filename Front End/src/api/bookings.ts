import client from './client'
import type { Booking, PaginatedResponse } from '../types'

export interface BookingsParams {
  page?: number
  per_page?: number
  status?: string
  payment_status?: string
  student_id?: number
  course_id?: number
}

export function getBookings(params?: BookingsParams) {
  return client.get<PaginatedResponse<Booking>>('/bookings', { params })
}

export function getBooking(id: number) {
  return client.get<Booking>(`/bookings/${id}`)
}

export function createBooking(data: {
  student_id: number
  course_id: number
  amount: number
  status?: string
  payment_status?: string
  payment_method?: string
}) {
  return client.post<Booking>('/bookings', data)
}

export function updateBookingStatus(id: number, data: {
  status?: Booking['status']
  payment_status?: Booking['payment_status']
  payment_method?: string
  transaction_id?: string
}) {
  return client.patch<Booking>(`/bookings/${id}/status`, data)
}

export function cancelBooking(id: number) {
  return client.delete(`/bookings/${id}`)
}
