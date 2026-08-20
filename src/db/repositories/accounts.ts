import { db, newId } from '../schema'
import type { Account, AccountType } from '../../types'

export interface AccountInput {
  name: string
  type: AccountType
  currency: string
  initialBalance: number
  color: string
  sortOrder: number
}

export async function addAccount(
  ledgerId: string,
  input: AccountInput,
): Promise<Account> {
  const now = Date.now()
  const account: Account = {
    id: newId(),
    ledgerId,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    ...input,
  }
  await db.accounts.add(account)
  return account
}

export async function updateAccount(
  id: string,
  patch: Partial<Omit<Account, 'id' | 'ledgerId' | 'createdAt'>>,
): Promise<void> {
  await db.accounts.update(id, { ...patch, updatedAt: Date.now() })
}

export async function archiveAccount(id: string, archived = true): Promise<void> {
  await updateAccount(id, { isArchived: archived })
}

/** 仅当账户没有关联流水时才允许物理删除，否则应归档 */
export async function canDeleteAccount(id: string): Promise<boolean> {
  const count = await db.transactions
    .where('accountId')
    .equals(id)
    .count()
  const count2 = await db.transactions
    .where('toAccountId')
    .equals(id)
    .count()
  return count + count2 === 0
}

export async function removeAccount(id: string): Promise<void> {
  await db.accounts.delete(id)
}

export function listAccounts(ledgerId: string): Promise<Account[]> {
  return db.accounts.where('ledgerId').equals(ledgerId).toArray()
}
