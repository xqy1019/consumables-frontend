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
