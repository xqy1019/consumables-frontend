import request from './request'
import type { LoginResponse, User } from '@/types'

export const authApi = {
  login: (data: { username: string; password: string }) =>
    request.post<unknown, LoginResponse>('/auth/login', data),

  getCurrentUser: () =>
    request.get<unknown, User>('/auth/me'),
}
