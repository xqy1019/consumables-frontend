import request from './request'
import type { PredictionVO, SafetyStockVO, WarningVO, PageResult, AiDashboardAnalysis, ChatResponse, RequisitionRecommendation, RequisitionReviewItem, ExpiryDisposalVO, AnomalyVO } from '@/types'

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

  // AI 智能申领推荐（基于历史消耗+预测，为指定科室生成推荐申领列表）
  getRequisitionRecommendations: (deptId: number) =>
    request.get<unknown, RequisitionRecommendation[]>(`/ai/recommend-requisition?deptId=${deptId}`),

  // AI 辅助审批（逐条分析申领单用量合理性，返回审核意见）
  getRequisitionReview: (requisitionId: number) =>
    request.get<unknown, RequisitionReviewItem[]>(`/ai/requisition-review/${requisitionId}`),

  // 临期处置建议（找出近30天将到期的高风险库存，给出处置方案）
  getExpiryDisposal: () =>
    request.get<unknown, ExpiryDisposalVO[]>('/ai/expiry-disposal'),

  // 消耗异常检测（基于90天历史数据统计异常，上报近30天记录）
  getAnomalyDetection: () =>
    request.get<unknown, AnomalyVO[]>('/ai/anomaly-detection'),
}
