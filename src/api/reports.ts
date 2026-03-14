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

async function getDownloadToken(): Promise<string> {
  const res = await request.get<unknown, string>('/auth/download-token')
  return res
}

export const exportConsumptionTrend = async (months = 6) => {
  const dt = await getDownloadToken()
  window.open(`${API_BASE}/api/v1/reports/consumption-trend/export?months=${months}&downloadToken=${dt}`)
}

export const exportDeptRanking = async (days = 30) => {
  const dt = await getDownloadToken()
  window.open(`${API_BASE}/api/v1/reports/department-ranking/export?days=${days}&downloadToken=${dt}`)
}

export const exportCostAnalysis = async (months = 6) => {
  const dt = await getDownloadToken()
  window.open(`${API_BASE}/api/v1/reports/cost-analysis/export?months=${months}&downloadToken=${dt}`)
}
