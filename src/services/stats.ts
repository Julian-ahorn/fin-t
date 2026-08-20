import dayjs from 'dayjs'
import type { Category, Transaction } from '../types'
import { monthKey, monthLabel, recentMonthKeys } from '../utils/date'

export interface PeriodTotals {
  /** 周期键，如 2025-01 */
  key: string
  label: string
  expense: number
  income: number
  net: number
}

export interface Totals {
  expense: number
  income: number
  count: number
}

export interface CategoryStat {
  categoryId: string
  name: string
  icon?: string
  color: string
  amount: number
  count: number
  /** 0-100 占比 */
  percent: number
}

const UNCATEGORIZED = '未分类'

export function sumTotals(txs: Transaction[]): Totals {
  let expense = 0
  let income = 0
  for (const tx of txs) {
    if (tx.kind === 'expense') expense += tx.amount
    else if (tx.kind === 'income') income += tx.amount
  }
  return { expense, income, count: txs.length }
}

export function filterByDateRange(
  txs: Transaction[],
  start: string,
  end: string,
): Transaction[] {
  return txs.filter((tx) => tx.date >= start && tx.date <= end)
}

/** 近 n 个月收支趋势（含结束月份） */
export function monthlyTrend(
  txs: Transaction[],
  monthCount: number,
  endMonth = dayjs(),
): PeriodTotals[] {
  const keys = recentMonthKeys(monthCount, endMonth)
  const map = new Map<string, PeriodTotals>()
  for (const key of keys) {
    map.set(key, { key, label: monthLabel(key), expense: 0, income: 0, net: 0 })
  }
  for (const tx of txs) {
    const key = monthKey(tx.date)
    const item = map.get(key)
    if (!item) continue
    if (tx.kind === 'expense') item.expense += tx.amount
    else if (tx.kind === 'income') item.income += tx.amount
  }
  for (const item of map.values()) {
    item.net = item.income - item.expense
  }
  return [...map.values()]
}

/** 分类汇总：按分类聚合支出或收入 */
export function categoryBreakdown(
  txs: Transaction[],
  kind: 'expense' | 'income',
  categories: Category[],
  includeUncategorized = true,
): CategoryStat[] {
  const catMap = new Map<string, Category>()
  for (const c of categories) {
    if (!c.isArchived) catMap.set(c.id, c)
  }
  const raw = new Map<string, { amount: number; count: number }>()
  for (const tx of txs) {
    if (tx.kind !== kind) continue
    const id = tx.categoryId ?? ''
    const entry = raw.get(id) ?? { amount: 0, count: 0 }
    entry.amount += tx.amount
    entry.count += 1
    raw.set(id, entry)
  }
  const total = [...raw.values()].reduce((s, e) => s + e.amount, 0)
  const result: CategoryStat[] = []
  for (const [id, entry] of raw) {
    if (id === '' && !includeUncategorized) continue
    const cat = catMap.get(id)
    result.push({
      categoryId: id || UNCATEGORIZED,
      name: cat?.name ?? UNCATEGORIZED,
      icon: cat?.icon,
      color: cat?.color ?? '#8c8c8c',
      amount: entry.amount,
      count: entry.count,
      percent: total > 0 ? Math.round((entry.amount / total) * 1000) / 10 : 0,
    })
  }
  return result.sort((a, b) => b.amount - a.amount)
}

/** 每日支出合计（日历热力图用），返回 YYYY-MM-DD -> 金额(分) */
export function dailyExpenseTotals(
  txs: Transaction[],
  start: string,
  end: string,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const tx of txs) {
    if (tx.kind !== 'expense') continue
    if (tx.date < start || tx.date > end) continue
    map.set(tx.date, (map.get(tx.date) ?? 0) + tx.amount)
  }
  return map
}

export interface CompareResult {
  current: Totals
  previous: Totals
  /** 环比变化百分比（expense），如 -12.5 表示下降 12.5% */
  expenseChangePct: number | null
  incomeChangePct: number | null
}

/** 当前区间与上一区间（等长）对比 */
export function comparePeriods(
  txs: Transaction[],
  start: string,
  end: string,
): CompareResult {
  const dur = dayjs(end).diff(dayjs(start), 'day') + 1
  const prevEnd = dayjs(start).subtract(1, 'day').format('YYYY-MM-DD')
  const prevStart = dayjs(prevEnd).subtract(dur - 1, 'day').format('YYYY-MM-DD')
  const current = sumTotals(filterByDateRange(txs, start, end))
  const previous = sumTotals(filterByDateRange(txs, prevStart, prevEnd))
  const pct = (cur: number, prev: number): number | null =>
    prev === 0 ? null : Math.round(((cur - prev) / prev) * 1000) / 10
  return {
    current,
    previous,
    expenseChangePct: pct(current.expense, previous.expense),
    incomeChangePct: pct(current.income, previous.income),
  }
}

export interface RankItem {
  key: string
  name: string
  amount: number
  count: number
}

/** 排行榜：按字段（分类/商家/备注）聚合支出 */
export function rankBy(
  txs: Transaction[],
  kind: 'expense' | 'income',
  field: 'categoryId' | 'counterparty',
  categories: Category[],
  limit = 10,
): RankItem[] {
  const catMap = new Map<string, Category>()
  for (const c of categories) catMap.set(c.id, c)
  const raw = new Map<string, { amount: number; count: number }>()
  for (const tx of txs) {
    if (tx.kind !== kind) continue
    const value = field === 'categoryId' ? (tx.categoryId ?? '') : (tx.counterparty ?? '')
    if (!value) continue
    const entry = raw.get(value) ?? { amount: 0, count: 0 }
    entry.amount += tx.amount
    entry.count += 1
    raw.set(value, entry)
  }
  return [...raw.entries()]
    .map(([key, e]) => ({
      key,
      name: field === 'categoryId' ? (catMap.get(key)?.name ?? UNCATEGORIZED) : key,
      amount: e.amount,
      count: e.count,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}
