import { db } from '../db/schema'
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

/** 全量备份文件结构（含版本号，便于未来迁移） */
export interface BackupData {
  ledgers: Ledger[]
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  debts: Debt[]
  budgets: Budget[]
  goals: Goal[]
  settings: Setting[]
}

export interface BackupFile {
  app: 'fin-t'
  version: 1
  exportedAt: string
  data: BackupData
}

export const BACKUP_VERSION = 1

/** 导出全量数据 */
export async function exportBackup(): Promise<BackupFile> {
  const [ledgers, accounts, categories, transactions, debts, budgets, goals, settings] =
    await Promise.all([
      db.ledgers.toArray(),
      db.accounts.toArray(),
      db.categories.toArray(),
      db.transactions.toArray(),
      db.debts.toArray(),
      db.budgets.toArray(),
      db.goals.toArray(),
      db.settings.toArray(),
    ])
  return {
    app: 'fin-t',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { ledgers, accounts, categories, transactions, debts, budgets, goals, settings },
  }
}

/** 校验备份文件结构 */
export function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== 'object') return false
  const b = value as BackupFile
  return (
    b.app === 'fin-t' &&
    b.version === BACKUP_VERSION &&
    !!b.data &&
    Array.isArray(b.data.ledgers) &&
    Array.isArray(b.data.accounts) &&
    Array.isArray(b.data.categories) &&
    Array.isArray(b.data.transactions) &&
    Array.isArray(b.data.debts) &&
    Array.isArray(b.data.budgets) &&
    Array.isArray(b.data.goals) &&
    Array.isArray(b.data.settings)
  )
}

/** 导入全量数据（整体替换，事务保证原子性） */
export async function importBackup(backup: BackupFile): Promise<void> {
  if (!isBackupFile(backup)) {
    throw new Error('备份文件格式不正确或版本不兼容')
  }
  await db.transaction(
    'rw',
    [db.ledgers, db.accounts, db.categories, db.transactions, db.debts, db.budgets, db.goals, db.settings],
    async () => {
      await Promise.all([
        db.ledgers.clear(),
        db.accounts.clear(),
        db.categories.clear(),
        db.transactions.clear(),
        db.debts.clear(),
        db.budgets.clear(),
        db.goals.clear(),
        db.settings.clear(),
      ])
      await Promise.all([
        db.ledgers.bulkAdd(backup.data.ledgers),
        db.accounts.bulkAdd(backup.data.accounts),
        db.categories.bulkAdd(backup.data.categories),
        db.transactions.bulkAdd(backup.data.transactions),
        db.debts.bulkAdd(backup.data.debts),
        db.budgets.bulkAdd(backup.data.budgets),
        db.goals.bulkAdd(backup.data.goals),
        db.settings.bulkAdd(backup.data.settings),
      ])
    },
  )
}

/** 清空全部数据 */
export async function clearAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [db.ledgers, db.accounts, db.categories, db.transactions, db.debts, db.budgets, db.goals, db.settings],
    async () => {
      await Promise.all([
        db.ledgers.clear(),
        db.accounts.clear(),
        db.categories.clear(),
        db.transactions.clear(),
        db.debts.clear(),
        db.budgets.clear(),
        db.goals.clear(),
        db.settings.clear(),
      ])
    },
  )
}

const KIND_LABEL: Record<Transaction['kind'], string> = {
  expense: '支出',
  income: '收入',
  transfer: '转账',
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** 流水导出为 CSV 文本（UTF-8 BOM，Excel 可直接打开） */
export function transactionsToCsv(
  txs: Transaction[],
  accounts: Account[],
  categories: Category[],
): string {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]))
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]))
  const header = ['日期', '类型', '金额(元)', '账户', '分类', '商家/对方', '备注', '标签']
  const rows = [...txs]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((tx) => {
      const amount = tx.kind === 'expense' ? -tx.amount / 100 : tx.amount / 100
      const accountName =
        tx.kind === 'transfer'
          ? `${accountMap.get(tx.accountId) ?? ''}->${accountMap.get(tx.toAccountId ?? '') ?? ''}`
          : (accountMap.get(tx.accountId) ?? '')
      const categoryName =
        tx.kind === 'transfer' ? '' : (categoryMap.get(tx.categoryId ?? '') ?? '未分类')
      return [
        tx.date,
        KIND_LABEL[tx.kind],
        amount.toFixed(2),
        accountName,
        categoryName,
        tx.counterparty ?? '',
        tx.note ?? '',
        tx.tags.join('|'),
      ]
        .map(csvEscape)
        .join(',')
    })
  return `\uFEFF${[header.join(','), ...rows].join('\n')}`
}

/** 触发浏览器下载 */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
