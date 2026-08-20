// 核心领域类型定义
// 金额一律以「分」为单位的整数存储，避免浮点误差。

export type TxKind = 'expense' | 'income' | 'transfer'

export type AccountType =
  | 'cash'
  | 'bank'
  | 'credit'
  | 'alipay'
  | 'wechat'
  | 'invest'
  | 'virtual'

export type CategoryKind = 'expense' | 'income'

export type DebtDirection = 'lend' | 'borrow'
export type DebtStatus = 'outstanding' | 'settled'
export type BudgetPeriod = 'monthly' | 'yearly'

export interface Ledger {
  id: string
  name: string
  currency: string
  createdAt: number
}

export interface Account {
  id: string
  ledgerId: string
  name: string
  type: AccountType
  currency: string
  /** 期初余额（分） */
  initialBalance: number
  color: string
  sortOrder: number
  isArchived: boolean
  createdAt: number
  updatedAt: number
}

export interface Category {
  id: string
  ledgerId: string
  name: string
  kind: CategoryKind
  parentId?: string
  icon?: string
  color: string
  sortOrder: number
  isArchived: boolean
  createdAt: number
}

export interface Transaction {
  id: string
  ledgerId: string
  /** 支出/收入对应的账户；转账时为转出账户 */
  accountId: string
  kind: TxKind
  /** 金额（分），恒为正数；转账表示转出金额 */
  amount: number
  currency: string
  /** 本地日期 YYYY-MM-DD */
  date: string
  /** 毫秒时间戳，用于排序 */
  timestamp: number
  note?: string
  counterparty?: string
  categoryId?: string
  tags: string[]
  /** 转账：转入账户 */
  toAccountId?: string
  createdAt: number
  updatedAt: number
}

export interface Debt {
  id: string
  ledgerId: string
  /** lend=借出（应收），borrow=借入（应付） */
  direction: DebtDirection
  counterparty: string
  amount: number
  accountId: string
  dueDate?: string
  status: DebtStatus
  note?: string
  createdAt: number
  updatedAt: number
}

export interface Budget {
  id: string
  ledgerId: string
  period: BudgetPeriod
  year: number
  /** period=monthly 时必填（1-12） */
  month?: number
  /** 为空表示总预算 */
  categoryId?: string
  /** 预算额度（分） */
  amount: number
  /** 月度预算是否结转未用额度 */
  rollover: boolean
  createdAt: number
  updatedAt: number
}

export interface Goal {
  id: string
  ledgerId: string
  name: string
  /** 目标金额（分） */
  targetAmount: number
  startDate: string
  deadline?: string
  /** 可选关联账户，用于计算当前进度 */
  linkedAccountId?: string
  /** 未关联账户时的手动进度（分） */
  currentAmount?: number
  note?: string
  createdAt: number
  updatedAt: number
}

export interface Setting {
  key: string
  value: string
}

export const SETTING_INITIALIZED = 'initialized'
export const SETTING_ACTIVE_LEDGER = 'activeLedgerId'
export const SETTING_LAST_BACKUP = 'lastBackupAt'
