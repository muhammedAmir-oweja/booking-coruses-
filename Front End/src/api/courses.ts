import client from './client'
import type { Course, PaginatedResponse } from '../types'

export interface CoursesParams {
  page?: number
  per_page?: number
  search?: string
  status?: string
}

export function getCourses(params?: CoursesParams) {
  return client.get<PaginatedResponse<Course>>('/courses', { params })
}

export function getCourse(id: number) {
  return client.get<Course>(`/courses/${id}`)
}

export function createCourse(data: Partial<Course>) {
  return client.post<Course>('/courses', data)
}

export function updateCourse(id: number, data: Partial<Course>) {
  return client.put<Course>(`/courses/${id}`, data)
}

export function deleteCourse(id: number) {
  return client.delete(`/courses/${id}`)
}
