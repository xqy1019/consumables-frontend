import request from './request'
import type { PageResult } from '@/types'

export interface WorkOrderVO {
  id: number
  deptId: number
  deptName: string
  materialId: number
  materialName: string
  anomalyType: string
  deviationRate: number
  description: string
  status: string
  priority: string
  assignedTo: number | null
  assignedToName: string | null
  resolution: string | null
  createdBy: number
  createdByName: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  closedAt: string | null
  comments: CommentVO[]
}

export interface CommentVO {
  id: number
  userId: number
  userName: string
  content: string
  createdAt: string
}

export interface CreateWorkOrderInput {
  deptId: number
  materialId: number
  anomalyType: string
  deviationRate: number
  description: string
  priority?: string
}

export interface WorkOrderStatsVO {
  total: number
  open: number
  inProgress: number
  resolved: number
  closed: number
}

export const anomalyWorkOrderApi = {
  getAll: (params?: { deptId?: number; page?: number; size?: number; priority?: string; status?: string }) =>
    request.get<unknown, PageResult<WorkOrderVO>>('/anomaly-work-orders', { params: params || {} }),

  getById: (id: number) =>
    request.get<unknown, WorkOrderVO>(`/anomaly-work-orders/${id}`),

  getStats: () =>
    request.get<unknown, WorkOrderStatsVO>('/anomaly-work-orders/stats'),

  create: (input: CreateWorkOrderInput) =>
    request.post<unknown, WorkOrderVO>('/anomaly-work-orders', input),

  assign: (id: number, assigneeId: number) =>
    request.put<unknown, WorkOrderVO>(`/anomaly-work-orders/${id}/assign`, null, { params: { assigneeId } }),

  resolve: (id: number, resolution: string) =>
    request.put<unknown, WorkOrderVO>(`/anomaly-work-orders/${id}/resolve`, { resolution }),

  close: (id: number) =>
    request.put<unknown, WorkOrderVO>(`/anomaly-work-orders/${id}/close`),

  addComment: (id: number, content: string) =>
    request.post<unknown, CommentVO>(`/anomaly-work-orders/${id}/comments`, { content }),

  batchAssign: (ids: number[], assigneeId: number) =>
    request.put<unknown, number>('/anomaly-work-orders/batch-assign', { ids, assigneeId }),

  batchClose: (ids: number[]) =>
    request.put<unknown, number>('/anomaly-work-orders/batch-close', { ids }),
}

async function getDownloadToken(): Promise<string> {
  const res = await request.get<unknown, string>('/auth/download-token')
  return res
}

export const exportWorkOrders = async () => {
  const dt = await getDownloadToken()
  window.open(`http://localhost:8081/api/v1/anomaly-work-orders/export?downloadToken=${dt}`)
}
