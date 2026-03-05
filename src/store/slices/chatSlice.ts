import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ChatMessage, ChatAction } from '@/types'

const STORAGE_KEY = 'medical-ai-chat'
const MAX_MESSAGES = 50               // 最多保留 50 条
const EXPIRE_MS    = 24 * 3600 * 1000 // 超过 24h 自动清空

/* ── localStorage 读写 ── */
function load(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const { messages, savedAt } = JSON.parse(raw) as { messages: ChatMessage[]; savedAt: number }
    if (Date.now() - savedAt > EXPIRE_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return []
    }
    // 过滤掉未完成的 loading 条目（异常退出时可能残留）
    return messages.filter(m => !m.loading)
  } catch {
    return []
  }
}

function save(messages: ChatMessage[]) {
  try {
    const toSave = messages.filter(m => !m.loading).slice(-MAX_MESSAGES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: toSave, savedAt: Date.now() }))
  } catch { /* localStorage 写入失败时静默忽略 */ }
}

/* ── Slice ── */
interface ChatState {
  messages: ChatMessage[]
}

const initialState: ChatState = {
  messages: load(),
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    /** 追加一条消息（用户消息 or loading 占位） */
    addMessage(state, action: PayloadAction<ChatMessage>) {
      state.messages.push(action.payload)
      save(state.messages)
    },

    /** AI 回复返回后：将最后一条 loading 消息替换为实际内容 */
    resolveLoading(state, action: PayloadAction<{ content: string; action?: ChatAction }>) {
      const idx = [...state.messages].reverse().findIndex(m => m.loading)
      if (idx !== -1) {
        const realIdx = state.messages.length - 1 - idx
        state.messages[realIdx] = {
          ...state.messages[realIdx],
          loading: false,
          content: action.payload.content,
          action: action.payload.action,
        }
      }
      save(state.messages)
    },

    /** 手动清空历史 */
    clearHistory(state) {
      state.messages = []
      localStorage.removeItem(STORAGE_KEY)
    },
  },
})

export const { addMessage, resolveLoading, clearHistory } = chatSlice.actions
export default chatSlice.reducer
