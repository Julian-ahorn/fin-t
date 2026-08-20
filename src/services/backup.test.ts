import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { addLedger } from '../db/repositories/ledgers'
import { addAccount } from '../db/repositories/accounts'
import { addCategory } from '../db/repositories/categories'
import { addTransaction } from '../db/repositories/transactions'
import { addBudget } from '../db/repositories/budgets'
import {
  clearAllData,
  exportBackup,
  importBackup,
  isBackupFile,
  transactionsToCsv,
} from './backup'
import { toCents } from '../utils/money'

const TABLES = [
  db.ledgers,
  db.accounts,
  db.categories,
  db.transactions,
  db.debts,
  db.budgets,
  db.goals,
  db.settings,
] as const

beforeEach(async () => {
  for (const t of TABLES) await t.clear()
})

afterEach(async () => {
  for (const t of TABLES) await t.clear()
})

describe('备份导出/导入', () => {
  it('isBackupFile 校验', () => {
    expect(isBackupFile(null)).toBe(false)
    expect(isBackupFile({})).toBe(false)
    expect(
      isBackupFile({
        app: 'fin-t',
        version: 1,
        exportedAt: '2025-01-01T00:00:00.000Z',
        data: { ledgers: [], accounts: [], categories: [], transactions: [], debts: [], budgets: [], goals: [], settings: [] },
      }),
    ).toBe(true)
    expect(
      isBackupFile({ app: 'other', version: 1, exportedAt: '', data: { ledgers: [], transactions: [] } }),
    ).toBe(false)
  })

  it('导出 -> 清空 -> 导入 往返一致', async () => {
    const ledger = await addLedger({ name: '测试账本', currency: 'CNY' })
    const account = await addAccount(ledger.id, {
      name: '银行卡',
      type: 'bank',
      currency: 'CNY',
      initialBalance: toCents(100),
      color: '#1677ff',
      sortOrder: 0,
    })
    const category = await addCategory(ledger.id, {
      name: '餐饮',
      kind: 'expense',
      color: '#fa8c16',
      sortOrder: 0,
    })
    await addTransaction(ledger.id, {
      kind: 'expense',
      accountId: account.id,
      amount: toCents(50),
      currency: 'CNY',
      date: '2025-03-01',
      categoryId: category.id,
      tags: ['午饭'],
    })
    await addBudget(ledger.id, {
      period: 'monthly',
      year: 2025,
      month: 3,
      amount: toCents(2000),
      rollover: false,
    })

    const backup = await exportBackup()
    expect(backup.data.ledgers).toHaveLength(1)
    expect(backup.data.accounts).toHaveLength(1)
    expect(backup.data.transactions).toHaveLength(1)

    await clearAllData()
    expect(await db.ledgers.count()).toBe(0)

    await importBackup(backup)
    expect(await db.ledgers.count()).toBe(1)
    expect(await db.accounts.count()).toBe(1)
    expect(await db.categories.count()).toBe(1)
    expect(await db.budgets.count()).toBe(1)
    const txs = await db.transactions.toArray()
    expect(txs).toHaveLength(1)
    expect(txs[0].tags).toEqual(['午饭'])
    expect(txs[0].amount).toBe(toCents(50))
  })

  it('非法备份导入抛出错误', async () => {
    await expect(
      importBackup({
        app: 'fin-t',
        version: 99,
        exportedAt: '',
        data: { ledgers: [], accounts: [], categories: [], transactions: [], debts: [], budgets: [], goals: [], settings: [] },
      } as unknown as Parameters<typeof importBackup>[0]),
    ).rejects.toThrow()
  })
})

describe('CSV 导出', () => {
  it('表头与行内容', async () => {
    const ledger = await addLedger({ name: '测试账本', currency: 'CNY' })
    const account = await addAccount(ledger.id, {
      name: '银行卡',
      type: 'bank',
      currency: 'CNY',
      initialBalance: 0,
      color: '#1677ff',
      sortOrder: 0,
    })
    const category = await addCategory(ledger.id, {
      name: '餐饮',
      kind: 'expense',
      color: '#fa8c16',
      sortOrder: 0,
    })
    await addTransaction(ledger.id, {
      kind: 'expense',
      accountId: account.id,
      amount: 12345,
      currency: 'CNY',
      date: '2025-03-01',
      categoryId: category.id,
      counterparty: '盒马,生鲜',
      note: '含逗号"引号"',
      tags: ['a', 'b'],
    })
    const [accountRow] = await db.accounts.toArray()
    const [catRow] = await db.categories.toArray()
    const txs = await db.transactions.toArray()
    const csv = transactionsToCsv(txs, [accountRow], [catRow])
    const lines = csv.replace(/^\uFEFF/, '').split('\n')
    expect(lines[0]).toBe('日期,类型,金额(元),账户,分类,商家/对方,备注,标签')
    expect(lines[1]).toContain('2025-03-01')
    expect(lines[1]).toContain('-123.45')
    expect(lines[1]).toContain('银行卡')
    expect(lines[1]).toContain('餐饮')
    expect(lines[1]).toContain('"盒马,生鲜"')
    expect(lines[1]).toContain('"含逗号""引号"""')
    expect(lines[1]).toContain('a|b')
  })

  it('空数据只有表头', () => {
    const csv = transactionsToCsv([], [], [])
    expect(csv.replace(/^\uFEFF/, '')).toBe('日期,类型,金额(元),账户,分类,商家/对方,备注,标签')
  })
})
