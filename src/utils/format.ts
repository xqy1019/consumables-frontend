/**
 * 格式化日期时间：2026-03-10T14:04:33.934002 → 2026-03-10 14:04:33
 */
export function formatDateTime(v: string | null | undefined): string {
  if (!v) return '-'
  return v.replace('T', ' ').slice(0, 19)
}

/**
 * 格式化日期：2026-03-10T00:00:00 → 2026-03-10
 */
export function formatDate(v: string | null | undefined): string {
  if (!v) return '-'
  return v.replace('T', ' ').slice(0, 10)
}

/**
 * 从 unknown 类型的错误对象中提取错误消息
 */
export function getErrorMessage(e: unknown, fallback = '操作失败，请重试'): string {
  if (e instanceof Error) return e.message || fallback
  if (typeof e === 'string') return e
  return fallback
}
