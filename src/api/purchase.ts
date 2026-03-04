import request from './request'
import type { RequisitionVO, InquiryVO, ContractVO, AutoSuggestionVO, PageResult } from '@/types'

export const purchaseApi = {
  // 请购单
  getRequisitions: (params?: { keyword?: string; status?: string; page?: number; size?: number }) =>
    request.get<unknown, PageResult<RequisitionVO>>('/purchase/requisitions', { params }),

  getRequisitionDetail: (id: number) =>
    request.get<unknown, RequisitionVO>(`/purchase/requisitions/${id}`),

  createRequisition: (data: {
    deptId?: number; requiredDate?: string; remark?: string;
    items: { materialId: number; quantity: number; estimatedPrice?: number; remark?: string }[]
  }) =>
    request.post<unknown, RequisitionVO>('/purchase/requisitions', data),

  submitRequisition: (id: number) =>
    request.put<unknown, void>(`/purchase/requisitions/${id}/submit`),

  approveRequisition: (id: number, remark?: string) =>
    request.put<unknown, void>(`/purchase/requisitions/${id}/approve`, { remark }),

  rejectRequisition: (id: number, remark?: string) =>
    request.put<unknown, void>(`/purchase/requisitions/${id}/reject`, { remark }),

  // 询价单
  getInquiries: (params?: { keyword?: string; status?: string; page?: number; size?: number }) =>
    request.get<unknown, PageResult<InquiryVO>>('/purchase/inquiries', { params }),

  getInquiryDetail: (id: number) =>
    request.get<unknown, InquiryVO>(`/purchase/inquiries/${id}`),

  createInquiry: (data: {
    supplierId: number; reqId?: number; validDate?: string; remark?: string;
    items: { materialId: number; quantity: number; quotedPrice?: number; deliveryDays?: number }[]
  }) =>
    request.post<unknown, InquiryVO>('/purchase/inquiries', data),

  confirmInquiry: (id: number) =>
    request.put<unknown, void>(`/purchase/inquiries/${id}/confirm`),

  // 合同
  getContracts: (params?: { keyword?: string; status?: string; page?: number; size?: number }) =>
    request.get<unknown, PageResult<ContractVO>>('/purchase/contracts', { params }),

  getContractDetail: (id: number) =>
    request.get<unknown, ContractVO>(`/purchase/contracts/${id}`),

  createContract: (data: {
    supplierId: number; contractDate: string; deliveryDate?: string; inquiryId?: number; remark?: string;
    items: { materialId: number; quantity: number; unitPrice: number }[]
  }) =>
    request.post<unknown, ContractVO>('/purchase/contracts', data),

  executeContract: (id: number) =>
    request.put<unknown, void>(`/purchase/contracts/${id}/execute`),

  // 自动补货建议
  getAutoSuggestions: () =>
    request.get<unknown, AutoSuggestionVO[]>('/purchase/auto-suggestions'),
}
