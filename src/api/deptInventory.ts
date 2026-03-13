import request from './request'

export interface DeptInventoryVO {
  id: number
  deptId: number
  materialId: number
  materialName: string
  materialSpec: string
  unit: string
  currentQuantity: number
  parQuantity: number | null
  minQuantity: number | null
  belowMin: boolean
  lastStocktakingAt: string | null
}

export interface DeptInventorySummaryVO {
  deptId: number
  deptName: string
  totalItems: number
  belowMinCount: number
}

export interface StocktakingItemVO {
  id: number
  materialId: number
  materialName: string
  unit: string
  systemQuantity: number
  actualQuantity: number | null
  consumption: number | null
}

export interface DeptStocktakingVO {
  id: number
  deptId: number
  deptName: string
  status: string
  totalConsumption: number
  createdAt: string
  completedAt: string | null
  items: StocktakingItemVO[]
}

export interface ReplenishmentSuggestionVO {
  deptId: number
  deptName: string
  materialId: number
  materialName: string
  unit: string
  currentQuantity: number
  minQuantity: number
  parQuantity: number
  suggestedQuantity: number
}

export interface ReplenishmentResult {
  requisitionCount: number
  message: string
}

export interface StocktakingInput {
  materialId: number
  actualQuantity: number
}

export interface DeptConsumptionRankVO {
  deptId: number
  deptName: string
  totalStocktakings: number
  totalConsumption: number
  avgConsumption: number
  lastConsumption: number
}

export const deptInventoryApi = {
  // 二级库存
  getDeptInventory: (deptId: number) =>
    request.get<unknown, DeptInventoryVO[]>('/dept-inventory', { params: { deptId } }),

  getSummary: () =>
    request.get<unknown, DeptInventorySummaryVO[]>('/dept-inventory/summary'),

  // 盘点
  createStocktaking: (deptId: number) =>
    request.post<unknown, DeptStocktakingVO>('/dept-inventory/stocktaking', null, { params: { deptId } }),

  completeStocktaking: (id: number, inputs: StocktakingInput[]) =>
    request.put<unknown, DeptStocktakingVO>(`/dept-inventory/stocktaking/${id}/complete`, inputs),

  getStocktakingHistory: (deptId: number) =>
    request.get<unknown, DeptStocktakingVO[]>('/dept-inventory/stocktaking/history', { params: { deptId } }),

  // 消耗排名
  getConsumptionRanking: () =>
    request.get<unknown, DeptConsumptionRankVO[]>('/dept-inventory/consumption-ranking'),

  // 自动补货
  checkReplenishment: () =>
    request.get<unknown, ReplenishmentSuggestionVO[]>('/dept-inventory/replenishment/check'),

  executeReplenishment: () =>
    request.post<unknown, ReplenishmentResult>('/dept-inventory/replenishment/execute'),
}
