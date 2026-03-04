import request from './request'
import type { ConsumptionTrend, DeptRanking, CostAnalysis, BiDashboard } from '@/types'

export const reportsApi = {
  getConsumptionTrend: (months?: number) =>
    request.get<unknown, ConsumptionTrend[]>('/reports/consumption-trend', { params: { months } }),

  getDeptRanking: (days?: number) =>
    request.get<unknown, DeptRanking[]>('/reports/department-ranking', { params: { days } }),

  getCostAnalysis: (months?: number) =>
    request.get<unknown, CostAnalysis[]>('/reports/cost-analysis', { params: { months } }),

  getBiDashboard: () =>
    request.get<unknown, BiDashboard>('/reports/bi-dashboard'),
}
