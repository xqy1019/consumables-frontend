// 通用分页结果
export interface PageResult<T> {
  records: T[]
  total: number
  page: number
  size: number
  pages: number
}

// 通用响应
export interface ApiResult<T> {
  code: number
  message: string
  data: T
}

// 用户
export interface User {
  id: number
  username: string
  realName: string
  email: string
  phone: string
  deptId: number
  deptName: string
  status: number
  roles: Role[]
  createTime: string
}

// 角色
export interface Role {
  id: number
  roleName: string
  roleCode: string
  description: string
  status: number
  createTime: string
}

// 科室
export interface Department {
  id: number
  deptName: string
  deptCode: string
  parentId: number | null
  parentName: string
  level: number
  description: string
  status: number
  createTime: string
  children?: Department[]
}

// 供应商
export interface Supplier {
  id: number
  supplierName: string
  supplierCode: string
  contactPerson: string
  phone: string
  email: string
  address: string
  status: number
  createTime: string
}

// 耗材
export interface Material {
  id: number
  materialCode: string
  materialName: string
  category: string
  specification: string
  unit: string
  supplierId: number
  supplierName: string
  standardPrice: number
  minStock: number
  maxStock: number
  leadTime: number
  currentStock: number
  description: string
  status: number
  createTime: string
}

// 库存
export interface Inventory {
  id: number
  materialId: number
  materialName: string
  materialCode: string
  specification: string
  unit: string
  batchNumber: string
  quantity: number
  location: string
  manufactureDate: string
  expiryDate: string
  supplierId: number
  supplierName: string
  receiveDate: string
  status: number
  expiring: boolean
  lowStock: boolean
  createTime: string
}

// 申领单
export interface Requisition {
  id: number
  requisitionNo: string
  deptId: number
  deptName: string
  requisitionDate: string
  requiredDate: string
  status: string
  statusLabel: string
  remark: string
  createdBy: number
  createdByName: string
  items: RequisitionItem[]
  approvalRecords: ApprovalRecord[]
  createTime: string
}

export interface RequisitionItem {
  id: number
  materialId: number
  materialName: string
  specification: string
  unit: string
  quantity: number
  actualQuantity: number
  remark: string
}

export interface ApprovalRecord {
  id: number
  approverId: number
  approverName: string
  approvalTime: string
  status: string
  remark: string
}

// 登录
export interface LoginResponse {
  token: string
  tokenType: string
  userId: number
  username: string
  realName: string
  roles: string[]
}

// Dashboard
export interface TrendPoint {
  date: string
  inbound: number
  outbound: number
}

export interface CategoryDistribution {
  name: string
  value: number
}

export interface DashboardData {
  totalMaterials: number
  totalInventoryItems: number
  expiringAlerts: number
  lowStockAlerts: number
  pendingRequisitions: number
  totalRequisitions: number
  recentActivities: RecentActivity[]
  weeklyTrend: TrendPoint[]
  categoryDistribution: CategoryDistribution[]
}

export interface RecentActivity {
  type: string
  description: string
  time: string
  operator: string
}

// 申领单状态
export const REQUISITION_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'default' },
  PENDING: { label: '待审批', color: 'processing' },
  APPROVED: { label: '已审批', color: 'success' },
  REJECTED: { label: '已驳回', color: 'error' },
  DISPATCHED: { label: '已发放', color: 'cyan' },
}

// 耗材分类选项
export const MATERIAL_CATEGORIES = [
  '注射类', '防护类', '敷料类', '输液类', '检测类',
  '导管类', '消毒类', '监测类', '骨科类', '急救类',
  '外科类', '呼吸类', '检验类', '产科类', '内镜类', '其他'
]

// ============ 字典管理 ============
export interface DictType {
  id: number
  dictCode: string
  dictName: string
  dictType: string
  remark: string        // 后端用 remark，不是 description
  status: number
  createTime: string
}

export interface DictItem {
  id: number
  dictId: number
  itemLabel: string   // 字典标签（显示名）
  itemValue: string   // 字典值（存储值）
  sortOrder: number
  status: number
  remark: string
  createTime: string
}

// ============ 库存扩展 ============
export interface StocktakingVO {
  id: number
  stocktakingNo: string
  location: string
  status: string
  stocktakingDate: string
  createdByName: string
  remark: string
  items: StocktakingItemVO[]
  createTime: string
}

export interface StocktakingItemVO {
  id: number
  stocktakingId: number
  materialId: number
  materialName: string
  materialCode: string
  specification: string
  unit: string
  batchNumber: string
  systemQuantity: number  // 账面数量（后端字段名）
  bookQuantity: number    // 账面数量（前端别名）
  actualQuantity: number
  difference: number
  diffQuantity: number    // 前端别名
  remark: string
}

export interface TransferVO {
  id: number
  transferNo: string
  fromLocation: string
  toLocation: string
  materialId: number
  materialName: string
  materialCode: string
  inventoryId: number
  batchNumber: string
  quantity: number
  status: string
  operatorName: string
  remark: string
  createTime: string
}

export interface DamageVO {
  id: number
  damageNo: string
  materialId: number
  materialName: string
  batchNumber: string
  quantity: number
  damageReason: string   // 后端字段名（非 reason）
  status: string
  operatorName: string
  remark: string
  createTime: string
}

export interface BorrowingVO {
  id: number
  borrowingNo: string
  materialId: number
  materialName: string
  batchNumber: string
  quantity: number
  deptId: number
  deptName: string
  borrowerName: string    // 后端字段（非 fromDeptId/toDeptId）
  borrowingDate: string
  expectedReturnDate: string
  actualReturnDate: string
  status: string
  operatorName: string
  remark: string
  createTime: string
}

// ============ UDI 高值耗材追溯 ============
export interface UdiVO {
  id: number
  udiCode: string
  materialId: number
  materialName: string
  specification: string
  batchNumber: string
  manufactureDate: string
  expiryDate: string
  supplierId: number
  supplierName: string
  status: string
  createTime: string
}

export interface SurgeryVO {
  id: number
  surgeryNo: string
  patientId: string
  patientName: string
  surgeryType: string
  surgeryDate: string
  deptId: number
  deptName: string
  operatingDoctor: string
  status: string
  remark: string
  bindings: BindingVO[]
  createTime: string
}

export interface BindingVO {
  id: number
  surgeryId: number
  udiId: number
  udiCode: string
  materialId: number
  materialName: string
  specification: string
  quantity: number
  bindTime: string
  remark: string
}

export interface TraceResult {
  traceType: string
  patientId?: string
  materialId?: number
  udiCode?: string
  surgeries?: SurgeryVO[]
  usages?: object[]
  transactions?: object[]
  udi?: UdiVO
}

// ============ AI 预测 ============
export interface PredictionVO {
  id: number
  materialId: number
  materialName: string
  materialCode: string
  deptName: string
  predictionMonth: string     // 后端字段名（非 targetMonth）
  predictedQuantity: number
  actualQuantity: number
  confidence: number
  accuracy: number
  algorithm: string
  createTime: string
}

export interface SafetyStockVO {
  materialId: number
  materialName: string
  materialCode: string
  currentStock: number
  minStock: number
  maxStock: number
  shortage: number            // 缺口数量
  suggestedPurchase: number   // 建议采购量（非 safetyStock）
}

export interface WarningVO {
  type: string
  materialId: number
  materialName: string
  materialCode: string
  severity: string            // 后端字段（非 level）
  message: string
  currentValue: number        // 后端字段（非 value）
  threshold: number
  daysLeft: number
}

// ============ 采购管理 ============
export interface RequisitionVO {
  id: number
  reqNo: string             // 后端字段名（非 requisitionNo）
  deptId: number
  deptName: string
  reqDate: string
  requiredDate: string
  status: string
  totalAmount: number
  remark: string
  createdByName: string
  approvedByName: string
  items: PurchaseRequisitionItemVO[]
  createTime: string
}

export interface PurchaseRequisitionItemVO {
  id: number
  materialId: number
  materialName: string
  specification: string
  unit: string
  quantity: number
  estimatedPrice: number
  remark: string
}

export interface InquiryVO {
  id: number
  inquiryNo: string
  supplierId: number
  supplierName: string
  reqId: number
  validDate: string
  status: string
  statusLabel: string
  totalAmount: number
  remark: string
  items: InquiryItemVO[]
  createTime: string
}

export interface InquiryItemVO {
  id: number
  materialId: number
  materialName: string
  specification: string
  unit: string
  quantity: number
  quotedPrice: number
  deliveryDays: number
}

export interface ContractVO {
  id: number
  contractNo: string
  supplierId: number
  supplierName: string
  inquiryId: number
  contractDate: string
  deliveryDate: string
  status: string
  statusLabel: string
  totalAmount: number
  remark: string
  items: ContractItemVO[]
  createTime: string
}

export interface ContractItemVO {
  id: number
  materialId: number
  materialName: string
  specification: string
  unit: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface AutoSuggestionVO {
  materialId: number
  materialName: string
  materialCode: string
  supplierName: string
  currentStock: number
  minStock: number
  maxStock: number
  suggestedQuantity: number   // 后端字段名（非 suggestQuantity）
  estimatedCost: number       // 后端字段名（非 estimatedPrice）
}

// ============ 报表 ============
export interface ConsumptionTrend {
  month: string
  total: number
}

export interface DeptRanking {
  rank: number
  deptId: number
  deptName: string
  totalQuantity: number
  totalAmount: number
}

export interface CostAnalysis {
  month: string
  consumptionCost: number
  purchaseCost: number
}

export interface BiDashboard {
  totalInventoryValue: number
  totalInventoryItems: number
  expiringCount: number
  lowStockCount: number
  pendingPurchase: number
  consumptionTrend: TrendPoint[]
  deptRanking: DeptRanking[]
  categoryDistribution: CategoryDistribution[]
  purchaseTrend: CostAnalysis[]
  predictionAccuracy: number
}
