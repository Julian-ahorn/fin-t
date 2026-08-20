import { db, newId } from '../schema'
import type { Transaction, TxKind } from '../../types'

export interface TxInput {
  kind: TxKind
  accountId: string
  /** 金额（分），恒为正数；转账为转出金额 */
  amount: number
  currency: string
  /** YYYY-MM-DD */
  date: string
  note?: string
  counterparty?: string
  categoryId?: string
  tags?: string[]
  /** 转账时的转入账户 */
  toAccountId?: string
}

export class TxValidationError extends Error {}

export function validateTxInput(input: TxInput): void {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new TxValidationError('金额必须为正整数（分）')
  }
  if (!input.accountId) {
    throw new TxValidationError('请选择账户')
  }
  if (input.kind === 'transfer') {
    if (!input.toAccountId) {
      throw new TxValidationError('转账需要选择转入账户')
    }
    if (input.toAccountId === input.accountId) {
      throw new TxValidationError('转出与转入账户不能相同')
    }
  } else if (input.kind === 'expense' && !input.categoryId) {
    throw new TxValidationError('支出需要选择分类')
  }
}

export async function addTransaction(
  ledgerId: string,
  input: TxInput,
): Promise<Transaction> {
  validateTxInput(input)
  const now = Date.now()
  const tx: Transaction = {
    id: newId(),
    ledgerId,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
    ...input,
    timestamp: new Date(`${input.date}T00:00:00`).getTime(),
  }
  await db.transactions.add(tx)
  return tx
}

export async function updateTransaction(
  id: string,
  input: TxInput,
): Promise<void> {
  validateTxInput(input)
  await db.transactions.update(id, {
    ...input,
    tags: input.tags ?? [],
    timestamp: new Date(`${input.date}T00:00:00`).getTime(),
    updatedAt: Date.now(),
  })
}

export async function removeTransaction(id: string): Promise<void> {
  await db.transactions.delete(id)
}

export async function bulkRemoveTransactions(ids: string[]): Promise<void> {
  await db.transactions.bulkDelete(ids)
}

export function listTransactions(ledgerId: string): Promise<Transaction[]> {
  return db.transactions.where('ledgerId').equals(ledgerId).toArray()
}
