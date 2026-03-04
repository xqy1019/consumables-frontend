import request from './request'
import type { StocktakingVO, TransferVO, DamageVO, BorrowingVO, PageResult } from '@/types'

export const inventoryExtApi = {
  // 盘点
  getStocktakings: (params?: { page?: number; size?: number }) =>
    request.get<unknown, PageResult<StocktakingVO>>('/inventory/stocktaking', { params }),

  getStocktakingDetail: (id: number) =>
    request.get<unknown, StocktakingVO>(`/inventory/stocktaking/${id}`),

  // location: 库位过滤（可为空表示全库盘点）
  createStocktaking: (data: { location?: string; remark?: string }) =>
    request.post<unknown, StocktakingVO>('/inventory/stocktaking', data),

  // 一次性提交所有盘点项的实际数量
  completeStocktaking: (id: number, items: { id: number; actualQuantity: number; remark?: string }[]) =>
    request.put<unknown, void>(`/inventory/stocktaking/${id}/complete`, items),

  // 移库 - 需要 inventoryId（具体库存记录ID）
  getTransfers: (params?: { page?: number; size?: number }) =>
    request.get<unknown, PageResult<TransferVO>>('/inventory/transfer', { params }),

  createTransfer: (data: { inventoryId: number; quantity: number; toLocation: string; remark?: string }) =>
    request.post<unknown, TransferVO>('/inventory/transfer', data),

  // 报损 - 需要 inventoryId
  getDamages: (params?: { page?: number; size?: number }) =>
    request.get<unknown, PageResult<DamageVO>>('/inventory/damage', { params }),

  createDamage: (data: { inventoryId: number; quantity: number; damageReason: string; remark?: string }) =>
    request.post<unknown, DamageVO>('/inventory/damage', data),

  // 借用 - 需要 inventoryId
  getBorrowings: (params?: { page?: number; size?: number }) =>
    request.get<unknown, PageResult<BorrowingVO>>('/inventory/borrowing', { params }),

  createBorrowing: (data: { inventoryId: number; quantity: number; deptId?: number; borrowerName: string; expectedReturnDate?: string; remark?: string }) =>
    request.post<unknown, BorrowingVO>('/inventory/borrowing', data),

  returnBorrowing: (id: number) =>
    request.put<unknown, void>(`/inventory/borrowing/${id}/return`),
}
