import client from './client'
import type { TrainingSession, PaginatedResponse } from '../types'

export interface TrainingSessionsParams {
  page?: number
  search?: string
  course_id?: number
  status?: string
}

export function getTrainingSessions(params?: TrainingSessionsParams) {
  return client.get<PaginatedResponse<TrainingSession>>('/training-sessions', { params })
}

export function getTrainingSession(id: number) {
  return client.get<TrainingSession>(`/training-sessions/${id}`)
}

export function createTrainingSession(data: Partial<TrainingSession>) {
  return client.post<TrainingSession>('/training-sessions', data)
}

export function updateTrainingSession(id: number, data: Partial<TrainingSession>) {
  return client.put<TrainingSession>(`/training-sessions/${id}`, data)
}

export function deleteTrainingSession(id: number) {
  return client.delete(`/training-sessions/${id}`)
}
