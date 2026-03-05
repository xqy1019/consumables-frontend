import request from './request'

export interface NotificationVO {
  id: string
  type: string
  level: 'info' | 'warning' | 'error'
  title: string
  content: string
  linkPath: string
  createTime: string
}

export interface NotificationResult {
  items: NotificationVO[]
  total: number
  unread: number
}

export const notificationsApi = {
  getAll: () => request.get<unknown, NotificationResult>('/notifications'),
}
