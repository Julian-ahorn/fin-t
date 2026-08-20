import { describe, expect, it } from 'vitest'
import type { Budget, Category, Transaction } from '../types'
import { budgetProgressForMonth, budgetProgressForYear } from './budgetProgress'

const mkTx = (partial: Partial<Transaction> & Pick<Transaction, 'kind' | 'amount' | 'date'>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  ledgerId: 'l1',
  accountId: 'a1',
  currency: 'CNY',
  timestamp: 0,
  tags: [],
  createdAt: 0,
  updatedAt: 0,
  ...partial,
})

const mkBudget = (partial: Partial<Budget> & Pick<Budget, 'period' | 'year' | 'amount'>): Budget => ({
  id: Math.random().toString(36).slice(2),
  ledgerId: 'l1',
  rollover: false,
  createdAt: 0,
  updatedAt: 0,
  ...partial,
})

const food: Category = {
  id: 'c-food',
  ledgerId: 'l1',
  name: '餐饮',
  kind: 'expense',
  icon: '🍜',
  color: '#fa8c16',
  sortOrder: 0,
  isArchived: false,
  createdAt: 0,
}

describe('预算进度', () => {
  it('月度总预算与分类预算', () => {
    const txs = [
      mkTx({ kind: 'expense', amount: 3000, date: '2025-03-05', categoryId: 'c-food' }),
      mkTx({ kind: 'expense', amount: 2000, date: '2025-03-10', categoryId: 'c-other' }),
      mkTx({ kind: 'expense', amount: 9999, date: '2025-02-28', categoryId: 'c-food' }), // 上个月不计入
    ]
    const budgets = [
      mkBudget({ period: 'monthly', year: 2025, month: 3, amount: 10000 }),
      mkBudget({ period: 'monthly', year: 2025, month: 3, categoryId: 'c-food', amount: 5000 }),
    ]
    const result = budgetProgressForMonth(budgets, txs, [food], 2025, 3)
    const total = result.find((r) => !r.budget.categoryId)!
    const cat = result.find((r) => r.budget.categoryId === 'c-food')!
    expect(total.spent).toBe(5000)
    expect(total.percent).toBe(50)
    expect(cat.spent).toBe(3000)
    expect(cat.percent).toBe(60)
  })

  it('超支时 percent 超过 100', () => {
    const txs = [mkTx({ kind: 'expense', amount: 6000, date: '2025-03-05' })]
    const budgets = [mkBudget({ period: 'monthly', year: 2025, month: 3, amount: 5000 })]
    const result = budgetProgressForMonth(budgets, txs, [], 2025, 3)
    expect(result[0].percent).toBe(120)
  })

  it('年度预算按全年支出计算', () => {
    const txs = [
      mkTx({ kind: 'expense', amount: 10000, date: '2025-01-05' }),
      mkTx({ kind: 'expense', amount: 20000, date: '2025-06-10' }),
      mkTx({ kind: 'expense', amount: 99999, date: '2024-12-31' }),
    ]
    const budgets = [mkBudget({ period: 'yearly', year: 2025, amount: 60000 })]
    const result = budgetProgressForYear(budgets, txs, [], 2025)
    expect(result[0].spent).toBe(30000)
    expect(result[0].percent).toBe(50)
  })
})
