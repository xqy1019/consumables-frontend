import request from './request'
import type { Requisition, PageResult } from '@/types'

export const requisitionsApi = {
  getList: (params: { status?: string; deptId?: number; createdBy?: number; page?: number; size?: number }) =>
    request.get<unknown, PageResult<Requisition>>('/requisitions', { params }),

  getById: (id: number) =>
    request.get<unknown, Requisition>(`/requisitions/${id}`),

  create: (data: {
    deptId: number
    requiredDate?: string
    remark?: string
    items: { materialId: number; quantity: number; remark?: string }[]
  }) => request.post<unknown, Requisition>('/requisitions', data),

  submit: (id: number) =>
    request.put<unknown, Requisition>(`/requisitions/${id}/submit`),

  approve: (id: number, data: { remark?: string }) =>
    request.put<unknown, Requisition>(`/requisitions/${id}/approve`, data),

  reject: (id: number, data: { remark?: string }) =>
    request.put<unknown, Requisition>(`/requisitions/${id}/reject`, data),

  dispatch: (id: number) =>
    request.put<unknown, Requisition>(`/requisitions/${id}/dispatch`),

  sign: (id: number, data: { remark?: string }) =>
    request.put<unknown, Requisition>(`/requisitions/${id}/sign`, data),
}
