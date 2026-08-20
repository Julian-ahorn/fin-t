import dayjs, { type Dayjs } from 'dayjs'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')

export { dayjs }

export const DATE_FORMAT = 'YYYY-MM-DD'

/** 今天（YYYY-MM-DD） */
export function today(): string {
  return dayjs().format(DATE_FORMAT)
}

/** 解析日期字符串为 Dayjs（本地时区） */
export function parseDate(date: string): Dayjs {
  return dayjs(date)
}

/** 月份键 YYYY-MM */
export function monthKey(date: string | Dayjs): string {
  return dayjs(date).format('YYYY-MM')
}

/** 某月的起始与结束日期（含） */
export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`)
  const end = start.endOf('month')
  return { start: start.format(DATE_FORMAT), end: end.format(DATE_FORMAT) }
}

/** 连续 n 个月的键列表（含当前月），倒序或正序 */
export function recentMonthKeys(count: number, end = dayjs()): string[] {
  const keys: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    keys.push(end.subtract(i, 'month').format('YYYY-MM'))
  }
  return keys
}

/** 月份键 -> 展示名，如 2025-01 -> 2025年1月 */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${y}年${m}月`
}

/** 日期字符串 -> 展示名，如 2025-01-05 -> 1月5日 */
export function dateLabel(date: string): string {
  return dayjs(date).format('M月D日')
}

/** 格式化展示日期 */
export function formatDate(date: string, fmt = 'YYYY-MM-DD'): string {
  return dayjs(date).format(fmt)
}
