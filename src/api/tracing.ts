import request from './request'
import type { UdiVO, SurgeryVO, BindingVO, TraceResult, PageResult } from '@/types'

export const tracingApi = {
  // UDI 管理
  getUdiList: (params?: { keyword?: string; status?: string; page?: number; size?: number }) =>
    request.get<unknown, PageResult<UdiVO>>('/udi', { params }),

  getUdiDetail: (id: number) =>
    request.get<unknown, UdiVO>(`/udi/${id}`),

  scanUdi: (udiCode: string) =>
    request.get<unknown, UdiVO>(`/udi/scan/${udiCode}`),

  createUdi: (data: { udiCode: string; materialId: number; batchNumber?: string; manufactureDate?: string; expiryDate?: string; supplierId?: number }) =>
    request.post<unknown, UdiVO>('/udi', data),

  updateUdiStatus: (id: number, status: string) =>
    request.put<unknown, void>(`/udi/${id}/status`, { status }),

  // 手术记录
  getSurgeries: (params?: { keyword?: string; page?: number; size?: number }) =>
    request.get<unknown, PageResult<SurgeryVO>>('/surgery', { params }),

  getSurgeryDetail: (id: number) =>
    request.get<unknown, SurgeryVO>(`/surgery/${id}`),

  createSurgery: (data: {
    patientId: string; patientName: string; surgeryType?: string;
    surgeryDate: string; deptId?: number; operatingDoctor?: string; remark?: string
  }) =>
    request.post<unknown, SurgeryVO>('/surgery', data),

  bindMaterial: (surgeryId: number, data: { udiId: number; quantity?: number; remark?: string }) =>
    request.post<unknown, BindingVO>(`/surgery/${surgeryId}/bind`, data),

  // 追溯
  traceByPatient: (patientId: string) =>
    request.get<unknown, TraceResult>(`/trace/patient/${patientId}`),

  traceByMaterial: (materialId: number) =>
    request.get<unknown, TraceResult>(`/trace/material/${materialId}`),

  traceByUdi: (udiCode: string) =>
    request.get<unknown, TraceResult>(`/trace/udi/${udiCode}`),
}
