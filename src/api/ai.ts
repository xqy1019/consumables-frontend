import request from './request'
import type { PredictionVO, SafetyStockVO, WarningVO, PageResult } from '@/types'

export const aiApi = {
  getPredictions: (params?: { month?: string; page?: number; size?: number }) =>
    request.get<unknown, PageResult<PredictionVO>>('/ai/predictions', { params }),

  triggerPredict: () =>
    request.post<unknown, string>('/ai/predict'),

  getSafetyStock: () =>
    request.get<unknown, SafetyStockVO[]>('/ai/safety-stock'),

  getWarnings: () =>
    request.get<unknown, WarningVO[]>('/ai/warnings'),

  getShortageWarnings: () =>
    request.get<unknown, WarningVO[]>('/ai/shortage-warnings'),
}
