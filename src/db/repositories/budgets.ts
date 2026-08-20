import { db, newId } from '../schema'
import type { Budget, BudgetPeriod } from '../../types'

export interface BudgetInput {
  period: BudgetPeriod
  year: number
  month?: number
  categoryId?: string
  amount: number
  rollover: boolean
}

export async function addBudget(ledgerId: string, input: BudgetInput): Promise<Budget> {
  const now = Date.now()
  const budget: Budget = {
    id: newId(),
    ledgerId,
    createdAt: now,
    updatedAt: now,
    ...input,
  }
  await db.budgets.add(budget)
  return budget
}

export async function updateBudget(
  id: string,
  patch: Partial<Omit<Budget, 'id' | 'ledgerId' | 'createdAt'>>,
): Promise<void> {
  await db.budgets.update(id, { ...patch, updatedAt: Date.now() })
}

export async function removeBudget(id: string): Promise<void> {
  await db.budgets.delete(id)
}

export function listBudgets(ledgerId: string): Promise<Budget[]> {
  return db.budgets.where('ledgerId').equals(ledgerId).toArray()
}

/** 查询某年某月的月度预算（含总预算与分类预算） */
export function listMonthlyBudgets(
  ledgerId: string,
  year: number,
  month: number,
): Promise<Budget[]> {
  return db.budgets
    .where('ledgerId')
    .equals(ledgerId)
    .filter((b) => b.period === 'monthly' && b.year === year && b.month === month)
    .toArray()
}
