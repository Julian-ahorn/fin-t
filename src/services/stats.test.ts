import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import type { Category, Transaction } from '../types'
import {
  categoryBreakdown,
  comparePeriods,
  dailyExpenseTotals,
  monthlyTrend,
  rankBy,
  sumTotals,
} from './stats'

const mkTx = (partial: Partial<Transaction> & Pick<Transaction, 'kind' | 'amount' | 'date'>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  ledgerId: 'l1',
  accountId: 'a1',
  currency: 'CNY',
  timestamp: dayjs(partial.date).valueOf(),
  tags: [],
  createdAt: 0,
  updatedAt: 0,
  ...partial,
})

const mkCat = (id: string, name: string, kind: 'expense' | 'income'): Category => ({
  id,
  ledgerId: 'l1',
  name,
  kind,
  color: '#000',
  sortOrder: 0,
  isArchived: false,
  createdAt: 0,
})

describe('统计聚合', () => {
  it('sumTotals 汇总收支', () => {
    const txs = [
      mkTx({ kind: 'expense', amount: 100, date: '2025-01-01' }),
      mkTx({ kind: 'income', amount: 1000, date: '2025-01-02' }),
      mkTx({ kind: 'expense', amount: 50, date: '2025-01-03' }),
    ]
    expect(sumTotals(txs)).toEqual({ expense: 150, income: 1000, count: 3 })
  })

  it('monthlyTrend 按月聚合', () => {
    const txs = [
      mkTx({ kind: 'expense', amount: 100, date: '2025-01-05' }),
      mkTx({ kind: 'income', amount: 1000, date: '2025-01-10' }),
      mkTx({ kind: 'expense', amount: 200, date: '2024-12-20' }),
    ]
    const trend = monthlyTrend(txs, 2, dayjs('2025-01-31'))
    expect(trend).toHaveLength(2)
    const jan = trend.find((t) => t.key === '2025-01')!
    const dec = trend.find((t) => t.key === '2024-12')!
    expect(jan.expense).toBe(100)
    expect(jan.income).toBe(1000)
    expect(jan.net).toBe(900)
    expect(dec.expense).toBe(200)
  })

  it('categoryBreakdown 分类占比', () => {
    const food = mkCat('c1', '餐饮', 'expense')
    const shop = mkCat('c2', '购物', 'expense')
    const txs = [
      mkTx({ kind: 'expense', amount: 300, date: '2025-01-01', categoryId: 'c1' }),
      mkTx({ kind: 'expense', amount: 100, date: '2025-01-02', categoryId: 'c2' }),
      mkTx({ kind: 'income', amount: 999, date: '2025-01-03', categoryId: 'c1' }),
    ]
    const result = categoryBreakdown(txs, 'expense', [food, shop])
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ categoryId: 'c1', name: '餐饮', amount: 300, percent: 75 })
    expect(result[1]).toMatchObject({ categoryId: 'c2', amount: 100, percent: 25 })
  })

  it('categoryBreakdown 未分类交易', () => {
    const txs = [mkTx({ kind: 'expense', amount: 50, date: '2025-01-01' })]
    const result = categoryBreakdown(txs, 'expense', [])
    expect(result[0].name).toBe('未分类')
    const filtered = categoryBreakdown(txs, 'expense', [], false)
    expect(filtered).toHaveLength(0)
  })

  it('dailyExpenseTotals 每日合计', () => {
    const txs = [
      mkTx({ kind: 'expense', amount: 100, date: '2025-01-01' }),
      mkTx({ kind: 'expense', amount: 50, date: '2025-01-01' }),
      mkTx({ kind: 'expense', amount: 30, date: '2025-01-02' }),
      mkTx({ kind: 'income', amount: 500, date: '2025-01-01' }),
    ]
    const map = dailyExpenseTotals(txs, '2025-01-01', '2025-01-31')
    expect(map.get('2025-01-01')).toBe(150)
    expect(map.get('2025-01-02')).toBe(30)
    expect(map.size).toBe(2)
  })

  it('comparePeriods 环比', () => {
    const txs = [
      mkTx({ kind: 'expense', amount: 100, date: '2025-03-05' }),
      mkTx({ kind: 'expense', amount: 200, date: '2025-02-05' }),
      mkTx({ kind: 'income', amount: 500, date: '2025-03-01' }),
      mkTx({ kind: 'income', amount: 400, date: '2025-02-01' }),
    ]
    const cmp = comparePeriods(txs, '2025-03-01', '2025-03-31')
    expect(cmp.current.expense).toBe(100)
    expect(cmp.previous.expense).toBe(200)
    expect(cmp.expenseChangePct).toBe(-50)
    expect(cmp.incomeChangePct).toBe(25)
  })

  it('comparePeriods 上期无支出时环比为 null', () => {
    const txs = [mkTx({ kind: 'expense', amount: 100, date: '2025-03-05' })]
    const cmp = comparePeriods(txs, '2025-03-01', '2025-03-31')
    expect(cmp.previous.expense).toBe(0)
    expect(cmp.expenseChangePct).toBeNull()
  })

  it('rankBy 按商家排行', () => {
    const txs = [
      mkTx({ kind: 'expense', amount: 100, date: '2025-01-01', counterparty: '盒马' }),
      mkTx({ kind: 'expense', amount: 200, date: '2025-01-02', counterparty: '盒马' }),
      mkTx({ kind: 'expense', amount: 50, date: '2025-01-03', counterparty: '滴滴' }),
    ]
    const rank = rankBy(txs, 'expense', 'counterparty', [], 10)
    expect(rank[0]).toMatchObject({ name: '盒马', amount: 300, count: 2 })
    expect(rank[1].name).toBe('滴滴')
  })
})
