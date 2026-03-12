import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { LoginResponse } from '@/types'

interface AuthState {
  token: string | null
  userId: number | null
  username: string | null
  realName: string | null
  roles: string[]
  permissions: string[]
  isAuthenticated: boolean
}

/** 检查 JWT token 是否已过期，避免用过期凭证初始化认证状态 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

const storedToken = localStorage.getItem('token')
const validToken = storedToken && !isTokenExpired(storedToken) ? storedToken : null

// token 已过期则清除 localStorage
if (storedToken && !validToken) {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

const userStr = validToken ? localStorage.getItem('user') : null
let user: Partial<LoginResponse> = {}
try { user = userStr ? JSON.parse(userStr) : {} } catch { user = {} }

const initialState: AuthState = {
  token: validToken,
  userId: user.userId ?? null,
  username: user.username ?? null,
  realName: user.realName ?? null,
  roles: user.roles ?? [],
  permissions: user.permissions ?? [],
  isAuthenticated: !!validToken,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<LoginResponse>) => {
      const { token, userId, username, realName, roles, permissions } = action.payload
      state.token = token
      state.userId = userId
      state.username = username
      state.realName = realName
      state.roles = roles
      state.permissions = permissions ?? []
      state.isAuthenticated = true
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(action.payload))
    },
    logout: (state) => {
      state.token = null
      state.userId = null
      state.username = null
      state.realName = null
      state.roles = []
      state.permissions = []
      state.isAuthenticated = false
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
