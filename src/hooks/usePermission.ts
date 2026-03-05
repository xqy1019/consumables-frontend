import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

export function usePermission() {
  const { roles, permissions } = useSelector((state: RootState) => state.auth)

  const hasPermission = (code: string) => permissions.includes(code)

  const hasRole = (role: string) => roles.includes(role)

  const hasAnyRole = (...roleList: string[]) => roleList.some(r => roles.includes(r))

  const isAdmin = () => roles.includes('ADMIN')

  // 有权限或是管理员
  const can = (code: string) => isAdmin() || hasPermission(code)

  return { hasPermission, hasRole, hasAnyRole, isAdmin, can, roles, permissions }
}
