import { db, newId } from '../schema'
import type { Ledger } from '../../types'

export interface LedgerInput {
  name: string
  currency: string
}

export async function addLedger(input: LedgerInput): Promise<Ledger> {
  const ledger: Ledger = {
    id: newId(),
    ...input,
    createdAt: Date.now(),
  }
  await db.ledgers.add(ledger)
  return ledger
}

export async function updateLedger(
  id: string,
  patch: Partial<Omit<Ledger, 'id' | 'createdAt'>>,
): Promise<void> {
  await db.ledgers.update(id, patch)
}

export async function removeLedger(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.ledgers, db.accounts, db.categories, db.transactions, db.debts, db.budgets, db.goals],
    async () => {
    await db.ledgers.delete(id)
    await db.accounts.where('ledgerId').equals(id).delete()
    await db.categories.where('ledgerId').equals(id).delete()
    await db.transactions.where('ledgerId').equals(id).delete()
    await db.debts.where('ledgerId').equals(id).delete()
    await db.budgets.where('ledgerId').equals(id).delete()
    await db.goals.where('ledgerId').equals(id).delete()
  })
}

export function listLedgers(): Promise<Ledger[]> {
  return db.ledgers.toArray()
}
