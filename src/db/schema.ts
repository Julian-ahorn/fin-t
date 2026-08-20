import Dexie, { type Table } from 'dexie'
import type {
  Account,
  Budget,
  Category,
  Debt,
  Goal,
  Ledger,
  Setting,
  Transaction,
} from '../types'

/**
 * IndexedDB schema。版本迁移策略：
 * 新增表/索引时递增 version 并补充 stores 变更，dexie 会自动迁移。
 */
export class FinDB extends Dexie {
  ledgers!: Table<Ledger, string>
  accounts!: Table<Account, string>
  categories!: Table<Category, string>
  transactions!: Table<Transaction, string>
  debts!: Table<Debt, string>
  budgets!: Table<Budget, string>
  goals!: Table<Goal, string>
  settings!: Table<Setting, string>

  constructor() {
    super('fin-t')
    this.version(1).stores({
      ledgers: 'id',
      accounts: 'id, ledgerId',
      categories: 'id, ledgerId, kind',
      transactions: 'id, ledgerId, accountId, categoryId, date, timestamp, kind',
      debts: 'id, ledgerId, status',
      budgets: 'id, ledgerId, period, year, month',
      goals: 'id, ledgerId',
      settings: 'key',
    })
  }
}

export const db = new FinDB()

export const newId = (): string => crypto.randomUUID()
