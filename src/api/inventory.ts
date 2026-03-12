import request from './request'
import type { Inventory, PageResult } from '@/types'

export const inventoryApi = {
  getList: (params: { keyword?: string; status?: number; page?: number; size?: number }) =>
    request.get<unknown, PageResult<Inventory>>('/inventory', { params }),

  getAlerts: () =>
    request.get<unknown, Inventory[]>('/inventory/alerts'),

  inbound: (data: {
    materialId: number
    batchNumber?: string
    quantity: number
    location?: string
    manufactureDate?: string
    expiryDate?: string
    supplierId?: number
    receiveDate?: string
    inspectionStatus?: string
    inspectionRemark?: string
    remark?: string
  }) => request.post<unknown, Inventory>('/inventory/inbound', data),

  outbound: (data: {
    inventoryId: number
    quantity: number
    deptId?: number
    requisitionId?: number
    remark?: string
  }) => request.post<unknown, void>('/inventory/outbound', data),

  getInspections: (params: { keyword?: string; inspectionStatus?: string; page?: number; size?: number }) =>
    request.get<unknown, PageResult<Inventory>>('/inventory/inspections', { params }),

  inspect: (id: number, data: { inspectionStatus: string; inspectionRemark?: string }) =>
    request.put<unknown, Inventory>(`/inventory/${id}/inspect`, data),

  getBatchSuggestion: (materialId: number) =>
    request.get<unknown, Inventory[]>('/inventory/batch-suggestion', { params: { materialId } }),
}
