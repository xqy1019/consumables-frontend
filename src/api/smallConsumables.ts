import request from './request'

export interface ParLevelVO {
  id: number
  deptId: number
  deptName: string
  materialId: number
  materialName: string
  materialSpec: string
  unit: string
  parQuantity: number
  minQuantity: number
  monthlyLimit: number | null
  isActive: boolean
  monthUsed: number
  monthUsageRate: number | null
  overLimit: boolean
}

export interface SaveParLevelRequest {
  deptId: number
  materialId: number
  parQuantity: number
  minQuantity: number
  monthlyLimit: number | null
}

export interface TemplateItemVO {
  id: number
  materialId: number
  materialName: string
  materialSpec: string
  unit: string
  quantity: number
  note: string
}

export interface TemplateVO {
  id: number
  name: string
  category: string
  description: string
  isActive: boolean
  items: TemplateItemVO[]
  createdAt: string
}

export interface SaveTemplateRequest {
  name: string
  category: string
  description: string
  items: { materialId: number; quantity: number; note?: string }[]
}

export interface ConsumedItemVO {
  materialId: number
  materialName: string
  unit: string
  totalQuantity: number
}

export interface RecordVO {
  id: number
  deptId: number
  deptName: string
  templateId: number
  templateName: string
  performedAt: string
  quantity: number
  patientInfo: string
  note: string
  consumedItems: ConsumedItemVO[]
}

export interface RecordRequest {
  deptId: number
  templateId: number
  performedAt?: string
  quantity?: number
  patientInfo?: string
  note?: string
}

export interface AnomalyVO {
  deptId: number
  deptName: string
  materialId: number
  materialName: string
  unit: string
  yearMonth: string
  thisMonthQty: number
  baselineQty: number
  deviationRate: number
  monthlyLimit: number | null
  overLimit: boolean
  level: 'NORMAL' | 'WARNING' | 'DANGER'
}

export interface AnomalySummaryVO {
  totalDepts: number
  abnormalDepts: number
  dangerCount: number
  warningCount: number
  estimatedWaste: number
  anomalies: AnomalyVO[]
}

export interface ParSuggestionVO {
  deptId: number
  deptName: string
  materialId: number
  materialName: string
  unit: string
  currentPar: number
  currentMin: number
  suggestedPar: number
  suggestedMin: number
  avgMonthlyUsage: number
  maxMonthlyUsage: number
  reason: string
  direction: string
}

export interface AnomalyTrendVO {
  yearMonth: string
  dangerCount: number
  warningCount: number
  totalCount: number
}

export interface ConsumptionForecastVO {
  materialId: number
  materialName: string
  unit: string
  last3Months: number[]
  predictedQty: number
  trend: 'UP' | 'DOWN' | 'STABLE'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface AnomalyAnalysisVO {
  deptId: number
  materialId: number
  deptName: string
  materialName: string
  deviationRate: number
  level: string
  rootCause: string
  suggestion: string
  urgency: string
}

export interface ConsumptionSummaryVO {
  deptId: number
  deptName: string
  materialId: number
  materialName: string
  specification: string
  unit: string
  requisitionQuantity: number
  stocktakingConsumption: number | null
  estimatedConsumption: number
  source: string  // "盘点修正" or "申领推算"
  yearMonth: string
}

export const smallConsumablesApi = {
  // 定数管理
  getParLevels: (deptId?: number) =>
    request.get<unknown, ParLevelVO[]>('/small-consumables/par-levels', {
      params: deptId ? { deptId } : {},
    }),
  saveParLevel: (data: SaveParLevelRequest) =>
    request.post<unknown, ParLevelVO>('/small-consumables/par-levels', data),
  deleteParLevel: (id: number) =>
    request.delete(`/small-consumables/par-levels/${id}`),

  // 消耗包模板
  getTemplates: () =>
    request.get<unknown, TemplateVO[]>('/small-consumables/templates'),
  createTemplate: (data: SaveTemplateRequest) =>
    request.post<unknown, TemplateVO>('/small-consumables/templates', data),
  updateTemplate: (id: number, data: SaveTemplateRequest) =>
    request.put<unknown, TemplateVO>(`/small-consumables/templates/${id}`, data),
  deleteTemplate: (id: number) =>
    request.delete(`/small-consumables/templates/${id}`),

  // 操作记录
  getRecords: (params: { deptId?: number; yearMonth?: string }) =>
    request.get<unknown, RecordVO[]>('/small-consumables/records', { params }),
  addRecord: (data: RecordRequest) =>
    request.post<unknown, RecordVO>('/small-consumables/records', data),

  // 科室消耗总览
  getConsumptionSummary: (params?: { deptId?: number; yearMonth?: string }) =>
    request.get<unknown, ConsumptionSummaryVO[]>('/small-consumables/consumption-summary', { params }),

  // 消耗异常分析
  getAnomalySummary: (yearMonth?: string) =>
    request.get<unknown, AnomalySummaryVO>('/small-consumables/anomaly', {
      params: yearMonth ? { yearMonth } : {},
    }),

  // 定数智能建议
  getParSuggestions: () =>
    request.get<unknown, ParSuggestionVO[]>('/small-consumables/par-suggestions'),

  applyParSuggestion: (data: { deptId: number; materialId: number; suggestedPar: number; suggestedMin: number }) =>
    request.post<unknown, void>('/small-consumables/par-suggestions/apply', data),

  // 异常趋势
  getAnomalyTrend: (months?: number) =>
    request.get<unknown, AnomalyTrendVO[]>('/small-consumables/anomaly/trend', {
      params: { months: months || 6 },
    }),

  // AI 增强异常分析
  getAiAnomalyAnalysis: (yearMonth?: string) =>
    request.get<unknown, AnomalyAnalysisVO[]>('/small-consumables/anomaly/ai-analysis', {
      params: yearMonth ? { yearMonth } : {},
    }),

  // 科室消耗预测
  getConsumptionForecast: (deptId: number) =>
    request.get<unknown, ConsumptionForecastVO[]>('/small-consumables/consumption-forecast', {
      params: { deptId },
    }),
}

const API_BASE = 'http://localhost:8081'

async function getDownloadToken(): Promise<string> {
  const res = await request.get<unknown, string>('/auth/download-token')
  return res
}

export const exportParLevels = async (deptId?: number) => {
  const dt = await getDownloadToken()
  window.open(`${API_BASE}/api/v1/small-consumables/par-levels/export?${deptId ? `deptId=${deptId}&` : ''}downloadToken=${dt}`)
}

export const exportAnomaly = async (yearMonth?: string) => {
  const dt = await getDownloadToken()
  window.open(`${API_BASE}/api/v1/small-consumables/anomaly/export?${yearMonth ? `yearMonth=${yearMonth}&` : ''}downloadToken=${dt}`)
}

export const exportMonthlyReport = async (yearMonth?: string) => {
  const dt = await getDownloadToken()
  window.open(`${API_BASE}/api/v1/small-consumables/monthly-report/export?${yearMonth ? `yearMonth=${yearMonth}&` : ''}downloadToken=${dt}`)
}
