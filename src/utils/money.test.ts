import { describe, expect, it } from 'vitest'
import {
  centsToYuanString,
  formatCompact,
  formatMoney,
  parseAmountToCents,
  toCents,
  toYuan,
} from './money'

describe('money 工具', () => {
  it('元 -> 分', () => {
    expect(toCents(12.34)).toBe(1234)
    expect(toCents(0.1)).toBe(10)
    expect(toCents(0.005)).toBe(1) // 四舍五入
    expect(toCents(100)).toBe(10000)
  })

  it('分 -> 元', () => {
    expect(toYuan(1234)).toBe(12.34)
    expect(toYuan(1)).toBe(0.01)
  })

  it('解析用户输入', () => {
    expect(parseAmountToCents('12.34')).toBe(1234)
    expect(parseAmountToCents('1,234.5')).toBe(123450)
    expect(parseAmountToCents('¥100')).toBe(10000)
    expect(parseAmountToCents('12.345')).toBeNull()
    expect(parseAmountToCents('abc')).toBeNull()
    expect(parseAmountToCents('')).toBeNull()
  })

  it('格式化金额', () => {
    expect(formatMoney(123456, 'CNY')).toBe('¥1,234.56')
    expect(formatMoney(5, 'CNY')).toBe('¥0.05')
    expect(formatMoney(-123456, 'CNY')).toBe('-¥1,234.56')
    expect(formatMoney(100000, 'USD')).toBe('$1,000.00')
  })

  it('紧凑格式', () => {
    expect(formatCompact(123456, 'CNY')).toBe('¥1.2k')
    expect(formatCompact(12345678, 'CNY')).toBe('¥12.3w')
    expect(formatCompact(500, 'CNY')).toBe('¥5')
  })

  it('分转元字符串', () => {
    expect(centsToYuanString(1234)).toBe('12.34')
    expect(centsToYuanString(0)).toBe('0.00')
  })
})
