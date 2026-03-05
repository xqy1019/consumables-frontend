import request from './request'
import type { PredictionVO, SafetyStockVO, WarningVO, PageResult, AiDashboardAnalysis, ChatResponse } from '@/types'

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

  // 工作台智能洞察（Claude 生成，5分钟缓存，Key 未配置时返回 null）
  getInsight: () =>
    request.get<unknown, string | null>('/ai/insight'),

  // 工作台全量 AI 分析（一次 Claude 调用，包含洞察/评分/预警/补货/模块状态）
  getDashboardAnalysis: () =>
    request.get<unknown, AiDashboardAnalysis | null>('/ai/dashboard-analysis'),

  // AI 对话助手
  chat: (message: string) =>
    request.post<unknown, ChatResponse>('/ai/chat', { message }),

  // 报表 AI 智能解读（Claude 分析报表数据，返回洞察文本）
  analyzeReport: (reportType: string, data: string) =>
    request.post<unknown, string | null>('/ai/analyze-report', { reportType, data }),
}
