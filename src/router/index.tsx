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
import ForbiddenPage from '@/pages/Forbidden'
import RecallPage from '@/pages/Recall'
import ReturnPage from '@/pages/Inventory/Return'
import InspectionPage from '@/pages/Inventory/Inspection'
import CertificatesPage from '@/pages/Certificates'
import BudgetPage from '@/pages/Budget'
import DocsPage from '@/pages/Docs'
import OperationLogPage from '@/pages/System/OperationLog'
import NotificationsPage from '@/pages/Notifications'

import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

// 登录守卫
function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

// 权限守卫：检查用户是否有指定权限（管理员默认拥有所有权限）
function RequirePermission({ permission, children }: { permission: string; children: JSX.Element }) {
  const { roles, permissions } = useSelector((state: RootState) => state.auth)
  const isAdmin = roles.includes('ADMIN')
  if (isAdmin || permissions.includes(permission)) return children
  return <ForbiddenPage />
}

export const routes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  { path: '/403', element: <ForbiddenPage /> },
  {
    path: '/',
    element: <RequireAuth><MainLayout /></RequireAuth>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      {
        path: 'materials',
        element: <RequirePermission permission="menu:material"><MaterialsPage /></RequirePermission>,
      },
      {
        path: 'dict',
        element: <RequirePermission permission="menu:dict"><DictPage /></RequirePermission>,
      },
      // 库存管理
      {
        path: 'inventory',
        element: <RequirePermission permission="menu:inventory"><InventoryPage /></RequirePermission>,
      },
      {
        path: 'inventory/stocktaking',
        element: <RequirePermission permission="menu:inventory"><StocktakingPage /></RequirePermission>,
      },
      {
        path: 'inventory/transfer',
        element: <RequirePermission permission="menu:inventory"><TransferPage /></RequirePermission>,
      },
      {
        path: 'inventory/damage',
        element: <RequirePermission permission="menu:inventory"><DamagePage /></RequirePermission>,
      },
      {
        path: 'inventory/borrowing',
        element: <RequirePermission permission="menu:inventory"><BorrowingPage /></RequirePermission>,
      },
      {
        path: 'inventory/return',
        element: <RequirePermission permission="menu:inventory"><ReturnPage /></RequirePermission>,
      },
      {
        path: 'inventory/inspection',
        element: <RequirePermission permission="menu:inventory"><InspectionPage /></RequirePermission>,
      },
      // 申领管理
      {
        path: 'requisitions',
        element: <RequirePermission permission="menu:requisition"><RequisitionsPage /></RequirePermission>,
      },
      {
        path: 'requisitions/create',
        element: <RequirePermission permission="menu:requisition"><CreateRequisition /></RequirePermission>,
      },
      {
        path: 'requisitions/:id',
        element: <RequirePermission permission="menu:requisition"><RequisitionDetail /></RequirePermission>,
      },
      // 召回管理
      {
        path: 'recall',
        element: <RequirePermission permission="menu:inventory"><RecallPage /></RequirePermission>,
      },
      // 高值追溯
      {
        path: 'tracing/udi',
        element: <RequirePermission permission="menu:tracing"><UdiPage /></RequirePermission>,
      },
      {
        path: 'tracing/surgery',
        element: <RequirePermission permission="menu:tracing"><SurgeryPage /></RequirePermission>,
      },
      {
        path: 'tracing/patient',
        element: <RequirePermission permission="menu:tracing"><PatientTracePage /></RequirePermission>,
      },
      // AI
      {
        path: 'ai/prediction',
        element: <RequirePermission permission="menu:ai"><PredictionPage /></RequirePermission>,
      },
      {
        path: 'ai/warnings',
        element: <RequirePermission permission="menu:ai"><WarningsPage /></RequirePermission>,
      },
      // 采购管理
      {
        path: 'purchase/requisition',
        element: <RequirePermission permission="menu:purchase"><PurchaseRequisitionPage /></RequirePermission>,
      },
      {
        path: 'purchase/inquiry',
        element: <RequirePermission permission="menu:purchase"><InquiryPage /></RequirePermission>,
      },
      {
        path: 'purchase/contract',
        element: <RequirePermission permission="menu:purchase"><ContractPage /></RequirePermission>,
      },
      // 报表
      {
        path: 'reports/trend',
        element: <RequirePermission permission="menu:report"><TrendPage /></RequirePermission>,
      },
      {
        path: 'reports/dept-ranking',
        element: <RequirePermission permission="menu:report"><DeptRankingPage /></RequirePermission>,
      },
      {
        path: 'reports/cost-analysis',
        element: <RequirePermission permission="menu:report"><CostAnalysisPage /></RequirePermission>,
      },
      {
        path: 'reports/bi-screen',
        element: <RequirePermission permission="menu:report"><BIScreenPage /></RequirePermission>,
      },
      // 项目文档（仅管理员可见）
      { path: 'docs', element: <RequirePermission permission="menu:docs"><DocsPage /></RequirePermission> },
      // 系统管理
      {
        path: 'system/users',
        element: <RequirePermission permission="menu:system:user"><UsersPage /></RequirePermission>,
      },
      {
        path: 'system/roles',
        element: <RequirePermission permission="menu:system:role"><RolesPage /></RequirePermission>,
      },
      {
        path: 'system/departments',
        element: <RequirePermission permission="menu:department"><DepartmentsPage /></RequirePermission>,
      },
      {
        path: 'system/suppliers',
        element: <RequirePermission permission="menu:supplier"><SuppliersPage /></RequirePermission>,
      },
      // 证件管理
      { path: 'certificates', element: <CertificatesPage /> },
      // 预算管理
      { path: 'budget', element: <RequirePermission permission="menu:inventory"><BudgetPage /></RequirePermission> },
      // 操作日志
      {
        path: 'system/operation-logs',
        element: <RequirePermission permission="menu:system:log"><OperationLogPage /></RequirePermission>,
      },
      // 通知中心
      { path: 'notifications', element: <NotificationsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
