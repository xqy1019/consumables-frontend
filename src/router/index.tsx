import { Navigate, RouteObject } from 'react-router-dom'
import MainLayout from '@/components/Layout/MainLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import MaterialsPage from '@/pages/Materials'
import InventoryPage from '@/pages/Inventory'
import RequisitionsPage from '@/pages/Requisitions'
import RequisitionDetail from '@/pages/Requisitions/Detail'
import CreateRequisition from '@/pages/Requisitions/Create'
import UsersPage from '@/pages/System/Users'
import RolesPage from '@/pages/System/Roles'
import DepartmentsPage from '@/pages/System/Departments'
import SuppliersPage from '@/pages/System/Suppliers'
// 新增页面
import DictPage from '@/pages/Dict'
import StocktakingPage from '@/pages/Inventory/Stocktaking'
import TransferPage from '@/pages/Inventory/Transfer'
import DamagePage from '@/pages/Inventory/Damage'
import BorrowingPage from '@/pages/Inventory/Borrowing'
import UdiPage from '@/pages/Tracing/Udi'
import SurgeryPage from '@/pages/Tracing/Surgery'
import PatientTracePage from '@/pages/Tracing/Patient'
import PredictionPage from '@/pages/AI/Prediction'
import WarningsPage from '@/pages/AI/Warnings'
import PurchaseRequisitionPage from '@/pages/Purchase/Requisition'
import InquiryPage from '@/pages/Purchase/Inquiry'
import ContractPage from '@/pages/Purchase/Contract'
import TrendPage from '@/pages/Reports/Trend'
import DeptRankingPage from '@/pages/Reports/DeptRanking'
import CostAnalysisPage from '@/pages/Reports/CostAnalysis'
import BIScreenPage from '@/pages/Reports/BIScreen'

// 路由守卫组件
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

export const routes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <RequireAuth><MainLayout /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'materials', element: <MaterialsPage /> },
      { path: 'dict', element: <DictPage /> },
      // 库存管理
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'inventory/stocktaking', element: <StocktakingPage /> },
      { path: 'inventory/transfer', element: <TransferPage /> },
      { path: 'inventory/damage', element: <DamagePage /> },
      { path: 'inventory/borrowing', element: <BorrowingPage /> },
      // 申领管理
      { path: 'requisitions', element: <RequisitionsPage /> },
      { path: 'requisitions/create', element: <CreateRequisition /> },
      { path: 'requisitions/:id', element: <RequisitionDetail /> },
      // 高值耗材追溯
      { path: 'tracing/udi', element: <UdiPage /> },
      { path: 'tracing/surgery', element: <SurgeryPage /> },
      { path: 'tracing/patient', element: <PatientTracePage /> },
      // AI 预测
      { path: 'ai/prediction', element: <PredictionPage /> },
      { path: 'ai/warnings', element: <WarningsPage /> },
      // 采购管理
      { path: 'purchase/requisition', element: <PurchaseRequisitionPage /> },
      { path: 'purchase/inquiry', element: <InquiryPage /> },
      { path: 'purchase/contract', element: <ContractPage /> },
      // 报表
      { path: 'reports/trend', element: <TrendPage /> },
      { path: 'reports/dept-ranking', element: <DeptRankingPage /> },
      { path: 'reports/cost-analysis', element: <CostAnalysisPage /> },
      { path: 'reports/bi-screen', element: <BIScreenPage /> },
      // 系统管理
      { path: 'system/users', element: <UsersPage /> },
      { path: 'system/roles', element: <RolesPage /> },
      { path: 'system/departments', element: <DepartmentsPage /> },
      { path: 'system/suppliers', element: <SuppliersPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
