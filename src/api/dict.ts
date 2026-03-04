import request from './request'
import type { DictType, DictItem, PageResult } from '@/types'

export const dictApi = {
  // 字典类型
  getTypes: (params?: { keyword?: string; page?: number; size?: number }) =>
    request.get<unknown, PageResult<DictType>>('/dict/types', { params }),

  createType: (data: { dictCode: string; dictName: string; remark?: string }) =>
    request.post<unknown, DictType>('/dict/types', data),

  updateType: (id: number, data: { dictName?: string; remark?: string; status?: number }) =>
    request.put<unknown, DictType>(`/dict/types/${id}`, data),

  deleteType: (id: number) =>
    request.delete<unknown, void>(`/dict/types/${id}`),

  // 字典项 - 按 dictId 查（GET /dict/items?dictId=xxx）
  getItems: (dictId: number) =>
    request.get<unknown, DictItem[]>('/dict/items', { params: { dictId } }),

  // 字典项 - 按 dictCode 查（GET /dict/items/{dictCode}）
  getItemsByCode: (code: string) =>
    request.get<unknown, DictItem[]>(`/dict/items/${code}`),

  createItem: (data: { dictId: number; itemLabel: string; itemValue: string; sortOrder?: number; remark?: string }) =>
    request.post<unknown, DictItem>('/dict/items', data),

  updateItem: (id: number, data: { itemLabel?: string; itemValue?: string; sortOrder?: number; remark?: string }) =>
    request.put<unknown, DictItem>(`/dict/items/${id}`, data),

  deleteItem: (id: number) =>
    request.delete<unknown, void>(`/dict/items/${id}`),
}
