import client from './client'
import type { Enrollment, PaginatedResponse } from '../types'

export interface EnrollmentsParams {
  page?: number
  per_page?: number
  student_id?: number
  course_id?: number
  status?: string
}

export function getEnrollments(params?: EnrollmentsParams) {
  return client.get<PaginatedResponse<Enrollment>>('/enrollments', { params })
}

export function getEnrollment(id: number) {
  return client.get<Enrollment>(`/enrollments/${id}`)
}

export function createEnrollment(data: { student_id: number; course_id: number; enrolled_at?: string; status?: string }) {
  return client.post<Enrollment>('/enrollments', data)
}

export function updateEnrollment(id: number, data: { status?: string; enrolled_at?: string }) {
  return client.put<Enrollment>(`/enrollments/${id}`, data)
}

export function deleteEnrollment(id: number) {
  return client.delete(`/enrollments/${id}`)
}
