import request from './request'
import type { ConsumptionTrend, DeptRanking, CostAnalysis, BiDashboard, DashboardData } from '@/types'

export const reportsApi = {
  getDashboard: () =>
    request.get<unknown, DashboardData>('/reports/dashboard'),

  getConsumptionTrend: (months?: number) =>
    request.get<unknown, ConsumptionTrend[]>('/reports/consumption-trend', { params: { months } }),

  getDeptRanking: (days?: number) =>
    request.get<unknown, DeptRanking[]>('/reports/department-ranking', { params: { days } }),

  getCostAnalysis: (months?: number) =>
    request.get<unknown, CostAnalysis[]>('/reports/cost-analysis', { params: { months } }),

  getBiDashboard: () =>
    request.get<unknown, BiDashboard>('/reports/bi-dashboard'),
}

const API_BASE = 'http://localhost:8081'

export const getExportConsumptionTrendUrl = (months = 6) =>
  `${API_BASE}/api/v1/reports/consumption-trend/export?months=${months}&token=${localStorage.getItem('token') || ''}`

export const getExportDeptRankingUrl = (days = 30) =>
  `${API_BASE}/api/v1/reports/department-ranking/export?days=${days}&token=${localStorage.getItem('token') || ''}`

export const getExportCostAnalysisUrl = (months = 6) =>
  `${API_BASE}/api/v1/reports/cost-analysis/export?months=${months}&token=${localStorage.getItem('token') || ''}`
