import client from './client'
import type { Student, StudentDocument, PaginatedResponse } from '../types'

export interface StudentsParams {
  page?: number
  per_page?: number
  search?: string
}

export function getStudents(params?: StudentsParams) {
  return client.get<PaginatedResponse<Student>>('/students', { params })
}

export function getStudent(id: number) {
  return client.get<Student>(`/students/${id}`)
}

export function createStudent(data: FormData) {
  return client.post<Student>('/students', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function updateStudent(id: number, data: FormData) {
  const payload = new FormData()
  data.forEach((value, key) => payload.append(key, value))
  payload.append('_method', 'PUT')
  return client.post<Student>(`/students/${id}`, payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function deleteStudent(id: number) {
  return client.delete(`/students/${id}`)
}

export function getStudentDocuments(studentId: number) {
  return client.get<StudentDocument[]>(`/students/${studentId}/documents`)
}

export function uploadStudentDocument(studentId: number, file: File) {
  const fd = new FormData()
  fd.append('document', file)
  return client.post<StudentDocument>(`/students/${studentId}/documents`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export function deleteStudentDocument(studentId: number, documentId: number) {
  return client.delete(`/students/${studentId}/documents/${documentId}`)
}
