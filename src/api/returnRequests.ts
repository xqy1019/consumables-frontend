import request from './request'
import type { PageResult } from '@/types'

export interface ReturnItemVO {
  id: number
  materialId: number
  materialName: string
  specification: string
  unit: string
  batchNumber: string
  quantity: number
  remark: string
}

export interface ReturnVO {
  id: number
  returnNo: string
  deptId: number
  deptName: string
  status: string
  remark: string
  createdByName: string
  approvedByName: string
  createTime: string
  approvedTime: string
  items: ReturnItemVO[]
}

export const returnRequestsApi = {
  getList: (params: { status?: string; deptId?: number; page?: number; size?: number }) =>
    request.get<unknown, PageResult<ReturnVO>>('/return-requests', { params }),

  getById: (id: number) =>
    request.get<unknown, ReturnVO>(`/return-requests/${id}`),

  create: (data: {
    deptId: number
    remark?: string
    items: { materialId: number; batchNumber?: string; quantity: number; remark?: string }[]
  }) =>
    request.post<unknown, ReturnVO>('/return-requests', data),

  approve: (id: number, data: { approved: boolean; remark?: string }) =>
    request.put<unknown, ReturnVO>(`/return-requests/${id}/approve`, data),

  complete: (id: number) =>
    request.put<unknown, ReturnVO>(`/return-requests/${id}/complete`),
}
