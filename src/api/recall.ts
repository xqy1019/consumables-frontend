import request from './request'
import type { PageResult } from '@/types'

export interface RecallVO {
  id: number
  recallNo: string
  title: string
  recallReason: string
  recallLevel: string
  source: string
  issuedDate: string
  status: string
  remark: string
  batchCount: number
  createdByName: string
  createTime: string
}

export interface AffectedInventoryVO {
  inventoryId: number
  materialId: number
  materialName: string
  batchNumber: string
  quantity: number
  location: string
  expiryDate: string
}

export interface DisposalVO {
  id: number
  materialId: number
  materialName: string
  batchNumber: string
  quantity: number
  disposalType: string
  disposalDate: string
  remark: string
  operatorName: string
}

export interface RecallDetailVO {
  basic: RecallVO
  affectedInventory: AffectedInventoryVO[]
  disposals: DisposalVO[]
}

export const recallApi = {
  getList: (params: { status?: string; keyword?: string; page?: number; size?: number }) =>
    request.get<unknown, PageResult<RecallVO>>('/recall', { params }),

  getDetail: (id: number) =>
    request.get<unknown, RecallDetailVO>(`/recall/${id}`),

  create: (data: {
    title: string
    recallReason: string
    recallLevel: string
    source: string
    issuedDate: string
    remark: string
    batches: { materialId: number; batchNumber?: string; quantityAffected?: number; remark?: string }[]
  }) =>
    request.post<unknown, RecallVO>('/recall', data),

  close: (id: number) =>
    request.put<unknown, void>(`/recall/${id}/close`),

  addDisposal: (id: number, data: {
    materialId: number
    inventoryId?: number
    batchNumber?: string
    quantity: number
    disposalType: string
    remark?: string
  }) =>
    request.post<unknown, DisposalVO>(`/recall/${id}/disposal`, data),
}
