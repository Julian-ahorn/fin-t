import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { generateSampleData } from './sampleData'
import { clearAllData } from './backup'

const TABLES = [db.ledgers, db.accounts, db.categories, db.transactions, db.debts, db.budgets, db.goals, db.settings]

beforeEach(async () => {
  for (const t of TABLES) await t.clear()
})

afterEach(async () => {
  await clearAllData()
})

describe('示例数据生成', () => {
  it('生成完整且关联正确的数据', async () => {
    const ledger = await generateSampleData()
    const accounts = await db.accounts.where('ledgerId').equals(ledger.id).toArray()
    const categories = await db.categories.where('ledgerId').equals(ledger.id).toArray()
    const txs = await db.transactions.where('ledgerId').equals(ledger.id).toArray()
    const budgets = await db.budgets.where('ledgerId').equals(ledger.id).toArray()
    const goals = await db.goals.where('ledgerId').equals(ledger.id).toArray()
    const debts = await db.debts.where('ledgerId').equals(ledger.id).toArray()

    expect(accounts.length).toBe(5)
    expect(categories.length).toBe(13)
    expect(budgets.length).toBe(3)
    expect(goals.length).toBe(2)
    expect(debts.length).toBe(2)
    expect(txs.length).toBeGreaterThan(200)

    // 转账记录必须成对引用有效账户
    for (const tx of txs) {
      expect(accounts.some((a) => a.id === tx.accountId)).toBe(true)
      if (tx.kind === 'transfer') {
        expect(tx.toAccountId).toBeTruthy()
        expect(accounts.some((a) => a.id === tx.toAccountId)).toBe(true)
      }
      if (tx.categoryId) {
        expect(categories.some((c) => c.id === tx.categoryId)).toBe(true)
      }
    }
    // 金额为正整数（分）
    for (const tx of txs) {
      expect(Number.isInteger(tx.amount)).toBe(true)
      expect(tx.amount).toBeGreaterThan(0)
    }
  })
})
