import type { Budget, Category, Transaction } from '../types'
import { filterByDateRange, sumTotals } from './stats'
import { monthRange } from '../utils/date'

export interface BudgetProgress {
  budget: Budget
  categoryName: string
  icon?: string
  color: string
  spent: number
  /** 已用百分比，可超过 100 */
  percent: number
}

/** 某年预算执行进度（年度预算；含总预算与分类预算） */
export function budgetProgressForYear(
  budgets: Budget[],
  txs: Transaction[],
  categories: Category[],
  year: number,
): BudgetProgress[] {
  const yearTxs = txs.filter((t) => t.date.startsWith(String(year)))
  const catMap = new Map(categories.map((c) => [c.id, c]))

  const list = budgets.filter((b) => b.period === 'yearly' && b.year === year)
  return list.map((budget) => {
    const spent = budget.categoryId
      ? sumTotals(yearTxs.filter((t) => t.kind === 'expense' && t.categoryId === budget.categoryId))
          .expense
      : sumTotals(yearTxs).expense
    const cat = budget.categoryId ? catMap.get(budget.categoryId) : undefined
    return {
      budget,
      categoryName: cat?.name ?? '总预算',
      icon: cat?.icon,
      color: cat?.color ?? '#1677ff',
      spent,
      percent: budget.amount > 0 ? Math.round((spent / budget.amount) * 1000) / 10 : 0,
    }
  })
}

/** 某月预算执行进度（月度预算；含总预算与分类预算） */
export function budgetProgressForMonth(
  budgets: Budget[],
  txs: Transaction[],
  categories: Category[],
  year: number,
  month: number,
): BudgetProgress[] {
  const { start, end } = monthRange(year, month)
  const monthTxs = filterByDateRange(txs, start, end)
  const catMap = new Map(categories.map((c) => [c.id, c]))

  const list = budgets.filter(
    (b) => b.period === 'monthly' && b.year === year && b.month === month,
  )
  return list.map((budget) => {
    const spent = budget.categoryId
      ? sumTotals(monthTxs.filter((t) => t.kind === 'expense' && t.categoryId === budget.categoryId))
          .expense
      : sumTotals(monthTxs).expense
    const cat = budget.categoryId ? catMap.get(budget.categoryId) : undefined
    return {
      budget,
      categoryName: cat?.name ?? '总预算',
      icon: cat?.icon,
      color: cat?.color ?? '#1677ff',
      spent,
      percent: budget.amount > 0 ? Math.round((spent / budget.amount) * 1000) / 10 : 0,
    }
  })
}
