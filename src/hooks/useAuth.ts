import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import type { RootState, AppDispatch } from '@/store'
import { logout as logoutAction, setCredentials } from '@/store/slices/authSlice'
import { authApi } from '@/api/auth'
import { message } from 'antd'

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const auth = useSelector((state: RootState) => state.auth)

  const login = async (username: string, password: string) => {
    const data = await authApi.login({ username, password })
    dispatch(setCredentials(data))
    message.success('登录成功')
    navigate('/dashboard')
  }

  const logout = () => {
    dispatch(logoutAction())
    navigate('/login')
  }

  const hasRole = (role: string) => auth.roles.includes(role)
  const isAdmin = () => hasRole('ADMIN')

  return { ...auth, login, logout, hasRole, isAdmin }
}
