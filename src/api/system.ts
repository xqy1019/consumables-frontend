import request from './request'
import type { User, Role, Department, Supplier, PageResult, Permission } from '@/types'

// 用户
export const usersApi = {
  getList: (params: { keyword?: string; deptId?: number; status?: number; page?: number; size?: number }) =>
    request.get<unknown, PageResult<User>>('/users', { params }),
  getById: (id: number) => request.get<unknown, User>(`/users/${id}`),
  create: (data: Partial<User> & { password: string; roleIds?: number[] }) =>
    request.post<unknown, User>('/users', data),
  update: (id: number, data: Partial<User> & { roleIds?: number[] }) =>
    request.put<unknown, User>(`/users/${id}`, data),
  delete: (id: number) => request.delete<unknown, void>(`/users/${id}`),
  updateStatus: (id: number, status: number) =>
    request.put<unknown, void>(`/users/${id}/status`, { status }),
}

// 角色
export const rolesApi = {
  getAll: () => request.get<unknown, Role[]>('/roles'),
  create: (data: { roleName: string; roleCode: string; description?: string }) =>
    request.post<unknown, Role>('/roles', data),
  update: (id: number, data: { roleName: string; description?: string }) =>
    request.put<unknown, Role>(`/roles/${id}`, data),
  delete: (id: number) => request.delete<unknown, void>(`/roles/${id}`),
  // 权限管理
  getAllPermissions: () => request.get<unknown, Permission[]>('/roles/permissions'),
  assignPermissions: (id: number, permissionIds: number[]) =>
    request.put<unknown, Role>(`/roles/${id}/permissions`, { permissionIds }),
}

// 科室
export const departmentsApi = {
  getTree: () => request.get<unknown, Department[]>('/departments/tree'),
  getAll: () => request.get<unknown, Department[]>('/departments'),
  create: (data: Partial<Department>) => request.post<unknown, Department>('/departments', data),
  update: (id: number, data: Partial<Department>) =>
    request.put<unknown, Department>(`/departments/${id}`, data),
  delete: (id: number) => request.delete<unknown, void>(`/departments/${id}`),
}

// 供应商
export const suppliersApi = {
  getList: (params: { keyword?: string; page?: number; size?: number }) =>
    request.get<unknown, PageResult<Supplier>>('/suppliers', { params }),
  getActive: () => request.get<unknown, Supplier[]>('/suppliers/active'),
  create: (data: Partial<Supplier>) => request.post<unknown, Supplier>('/suppliers', data),
  update: (id: number, data: Partial<Supplier>) =>
    request.put<unknown, Supplier>(`/suppliers/${id}`, data),
  delete: (id: number) => request.delete<unknown, void>(`/suppliers/${id}`),
}

// 操作日志
export interface OperationLogItem {
  id: number
  username: string
  deptName: string
  module: string
  action: string
  ipAddr: string
  status: number
  errorMsg: string
  requestParams: string
  durationMs: number
  operateTime: string
}

export const getOperationLogs = (params: {
  username?: string;
  module?: string;
  startTime?: string;
  endTime?: string;
  status?: number;
  page?: number;
  size?: number;
}) => request.get<unknown, PageResult<OperationLogItem>>('/system/operation-logs', { params });
