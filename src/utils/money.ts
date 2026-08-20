/** 金额工具：内部统一以「分」为整数存储，展示层转换为元 */

const CURRENCY_SYMBOL: Record<string, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  HKD: 'HK$',
  TWD: 'NT$',
}

/** 元 -> 分（四舍五入，避免浮点误差） */
export function toCents(yuan: number): number {
  return Math.round(yuan * 100)
}

/** 分 -> 元 */
export function toYuan(cents: number): number {
  return cents / 100
}

/** 解析用户输入字符串（可能含逗号、空格）为分；非法输入返回 null */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[,\s¥$€£]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return toCents(Number(cleaned))
}

/** 格式化为带货币符号的金额，如 ¥1,234.56 */
export function formatMoney(cents: number, currency = 'CNY'): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const yuan = Math.floor(abs / 100)
  const fen = abs % 100
  const yuanStr = yuan.toLocaleString('zh-CN')
  const fenStr = fen.toString().padStart(2, '0')
  return `${sign}${symbol}${yuanStr}.${fenStr}`
}

/** 紧凑格式：用于图表坐标轴，如 ¥1.2k */
export function formatCompact(cents: number, currency = 'CNY'): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency
  const yuan = toYuan(cents)
  if (Math.abs(yuan) >= 10000) {
    return `${symbol}${(yuan / 10000).toFixed(1)}w`
  }
  if (Math.abs(yuan) >= 1000) {
    return `${symbol}${(yuan / 1000).toFixed(1)}k`
  }
  return `${symbol}${Math.round(yuan)}`
}

/** 分 -> 元字符串（无符号，两位小数） */
export function centsToYuanString(cents: number): string {
  return (cents / 100).toFixed(2)
}
