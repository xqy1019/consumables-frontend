import request from './request'
import type { Material, PageResult } from '@/types'

export const materialsApi = {
  getList: (params: { keyword?: string; category?: string; status?: number; page?: number; size?: number }) =>
    request.get<unknown, PageResult<Material>>('/materials', { params }),

  getActive: () =>
    request.get<unknown, Material[]>('/materials/active'),

  getById: (id: number) =>
    request.get<unknown, Material>(`/materials/${id}`),

  create: (data: Partial<Material>) =>
    request.post<unknown, Material>('/materials', data),

  update: (id: number, data: Partial<Material>) =>
    request.put<unknown, Material>(`/materials/${id}`, data),

  delete: (id: number) =>
    request.delete<unknown, void>(`/materials/${id}`),
}
