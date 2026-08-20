import { db, newId } from '../schema'
import type { Debt, DebtDirection } from '../../types'

export interface DebtInput {
  direction: DebtDirection
  counterparty: string
  amount: number
  accountId: string
  dueDate?: string
  note?: string
}

export async function addDebt(ledgerId: string, input: DebtInput): Promise<Debt> {
  const now = Date.now()
  const debt: Debt = {
    id: newId(),
    ledgerId,
    status: 'outstanding',
    createdAt: now,
    updatedAt: now,
    ...input,
  }
  await db.debts.add(debt)
  return debt
}

export async function updateDebt(
  id: string,
  patch: Partial<Omit<Debt, 'id' | 'ledgerId' | 'createdAt'>>,
): Promise<void> {
  await db.debts.update(id, { ...patch, updatedAt: Date.now() })
}

export async function settleDebt(id: string): Promise<void> {
  await updateDebt(id, { status: 'settled' })
}

export async function removeDebt(id: string): Promise<void> {
  await db.debts.delete(id)
}

export function listDebts(ledgerId: string): Promise<Debt[]> {
  return db.debts.where('ledgerId').equals(ledgerId).toArray()
}
