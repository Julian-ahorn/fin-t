import { create } from 'zustand'
import type {
  Account,
  Budget,
  Category,
  Debt,
  Goal,
  Ledger,
  Transaction,
} from '../types'
import * as accountsRepo from '../db/repositories/accounts'
import * as categoriesRepo from '../db/repositories/categories'
import * as transactionsRepo from '../db/repositories/transactions'
import * as debtsRepo from '../db/repositories/debts'
import * as budgetsRepo from '../db/repositories/budgets'
import * as goalsRepo from '../db/repositories/goals'
import * as ledgersRepo from '../db/repositories/ledgers'
import { getSetting, setSetting } from '../db/repositories/settings'
import { SETTING_ACTIVE_LEDGER, SETTING_INITIALIZED, SETTING_LAST_BACKUP } from '../types'
import { generateSampleData } from '../services/sampleData'
import { clearAllData as clearAllDataService, importBackup, type BackupFile } from '../services/backup'
import { useUiStore } from './uiStore'

interface DataState {
  ready: boolean
  ledgers: Ledger[]
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  debts: Debt[]
  budgets: Budget[]
  goals: Goal[]
  load: () => Promise<void>
  createSampleData: () => Promise<Ledger>
  /** 导入备份并整体替换数据 */
  importBackup: (file: BackupFile) => Promise<void>
  /** 清空全部数据并重新初始化 */
  clearAllData: () => Promise<void>
  setLastBackupAt: () => Promise<void>
  // 账本
  addLedger: (name: string, currency: string) => Promise<Ledger>
  switchLedger: (id: string) => Promise<void>
  updateLedger: (
    id: string,
    patch: Parameters<typeof ledgersRepo.updateLedger>[1],
  ) => Promise<void>
  removeLedger: (id: string) => Promise<void>
  // 账户
  addAccount: (input: accountsRepo.AccountInput) => Promise<Account>
  updateAccount: (
    id: string,
    patch: Parameters<typeof accountsRepo.updateAccount>[1],
  ) => Promise<void>
  archiveAccount: (id: string, archived?: boolean) => Promise<void>
  removeAccount: (id: string) => Promise<boolean>
  // 分类
  addCategory: (input: categoriesRepo.CategoryInput) => Promise<Category>
  updateCategory: (
    id: string,
    patch: Parameters<typeof categoriesRepo.updateCategory>[1],
  ) => Promise<void>
  removeCategory: (id: string) => Promise<void>
  // 流水
  addTransaction: (input: transactionsRepo.TxInput) => Promise<Transaction>
  updateTransaction: (id: string, input: transactionsRepo.TxInput) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  bulkRemoveTransactions: (ids: string[]) => Promise<void>
  // 借贷
  addDebt: (input: debtsRepo.DebtInput) => Promise<Debt>
  updateDebt: (
    id: string,
    patch: Parameters<typeof debtsRepo.updateDebt>[1],
  ) => Promise<void>
  settleDebt: (id: string) => Promise<void>
  removeDebt: (id: string) => Promise<void>
  // 预算
  addBudget: (input: budgetsRepo.BudgetInput) => Promise<Budget>
  updateBudget: (
    id: string,
    patch: Parameters<typeof budgetsRepo.updateBudget>[1],
  ) => Promise<void>
  removeBudget: (id: string) => Promise<void>
  // 目标
  addGoal: (input: goalsRepo.GoalInput) => Promise<Goal>
  updateGoal: (
    id: string,
    patch: Parameters<typeof goalsRepo.updateGoal>[1],
  ) => Promise<void>
  removeGoal: (id: string) => Promise<void>
}

async function refreshActiveLedger(set: (fn: (s: DataState) => Partial<DataState>) => void) {
  const ledgerId = useUiStore.getState().activeLedgerId
  if (!ledgerId) return
  const [accounts, categories, transactions, debts, budgets, goals] = await Promise.all([
    accountsRepo.listAccounts(ledgerId),
    categoriesRepo.listCategories(ledgerId),
    transactionsRepo.listTransactions(ledgerId),
    debtsRepo.listDebts(ledgerId),
    budgetsRepo.listBudgets(ledgerId),
    goalsRepo.listGoals(ledgerId),
  ])
  set(() => ({
    accounts,
    categories,
    transactions,
    debts,
    budgets,
    goals,
  }))
}

export const useDataStore = create<DataState>()((set, get) => {
  const patch = (fn: (s: DataState) => Partial<DataState>) => set(fn)

  return {
    ready: false,
    ledgers: [],
    accounts: [],
    categories: [],
    transactions: [],
    debts: [],
    budgets: [],
    goals: [],

    load: async () => {
      const ledgers = await ledgersRepo.listLedgers()
      let active = useUiStore.getState().activeLedgerId
      // 首次运行：初始化默认账本与分类
      if (ledgers.length === 0) {
        const initialized = await getSetting(SETTING_INITIALIZED)
        if (!initialized) {
          const ledger = await ledgersRepo.addLedger({ name: '我的账本', currency: 'CNY' })
          await categoriesRepo.createDefaultCategories(ledger.id)
          await accountsRepo.addAccount(ledger.id, {
            name: '现金',
            type: 'cash',
            currency: 'CNY',
            initialBalance: 0,
            color: '#fa8c16',
            sortOrder: 0,
          })
          await setSetting(SETTING_INITIALIZED, 'true')
          ledgers.push(ledger)
          active = ledger.id
        } else {
          const fallback = await ledgersRepo.addLedger({ name: '我的账本', currency: 'CNY' })
          await categoriesRepo.createDefaultCategories(fallback.id)
          await accountsRepo.addAccount(fallback.id, {
            name: '现金',
            type: 'cash',
            currency: 'CNY',
            initialBalance: 0,
            color: '#fa8c16',
            sortOrder: 0,
          })
          ledgers.push(fallback)
          active = fallback.id
        }
      }
      if (!active || !ledgers.some((l) => l.id === active)) {
        active = ledgers[0].id
      }
      useUiStore.getState().setActiveLedgerId(active)
      await setSetting(SETTING_ACTIVE_LEDGER, active)
      set({ ledgers })
      await refreshActiveLedger(set)
      set({ ready: true })
    },

    createSampleData: async () => {
      const ledger = await generateSampleData()
      const ledgers = await ledgersRepo.listLedgers()
      useUiStore.getState().setActiveLedgerId(ledger.id)
      await setSetting(SETTING_ACTIVE_LEDGER, ledger.id)
      set({ ledgers })
      await refreshActiveLedger(set)
      return ledger
    },

    importBackup: async (file) => {
      await importBackup(file)
      useUiStore.getState().setActiveLedgerId(null)
      await get().load()
    },

    clearAllData: async () => {
      await clearAllDataService()
      useUiStore.getState().setActiveLedgerId(null)
      await get().load()
    },

    setLastBackupAt: async () => {
      await setSetting(SETTING_LAST_BACKUP, new Date().toISOString())
    },

    addLedger: async (name, currency) => {
      const ledger = await ledgersRepo.addLedger({ name, currency })
      await categoriesRepo.createDefaultCategories(ledger.id)
      await accountsRepo.addAccount(ledger.id, {
        name: '现金',
        type: 'cash',
        currency,
        initialBalance: 0,
        color: '#fa8c16',
        sortOrder: 0,
      })
      const ledgers = await ledgersRepo.listLedgers()
      set({ ledgers })
      return ledger
    },

    switchLedger: async (id) => {
      useUiStore.getState().setActiveLedgerId(id)
      await setSetting(SETTING_ACTIVE_LEDGER, id)
      await refreshActiveLedger(set)
    },

    updateLedger: async (id, patch) => {
      await ledgersRepo.updateLedger(id, patch)
      const ledgers = await ledgersRepo.listLedgers()
      set({ ledgers })
    },

    removeLedger: async (id) => {
      await ledgersRepo.removeLedger(id)
      const ledgers = await ledgersRepo.listLedgers()
      set({ ledgers })
    },

    addAccount: async (input) => {
      const ledgerId = useUiStore.getState().activeLedgerId!
      const account = await accountsRepo.addAccount(ledgerId, input)
      patch((s) => ({ accounts: [...s.accounts, account] }))
      return account
    },
    updateAccount: async (id, p) => {
      await accountsRepo.updateAccount(id, p)
      await refreshActiveLedger(set)
    },
    archiveAccount: async (id, archived = true) => {
      await accountsRepo.archiveAccount(id, archived)
      await refreshActiveLedger(set)
    },
    removeAccount: async (id) => {
      const ok = await accountsRepo.canDeleteAccount(id)
      if (!ok) return false
      await accountsRepo.removeAccount(id)
      await refreshActiveLedger(set)
      return true
    },

    addCategory: async (input) => {
      const ledgerId = useUiStore.getState().activeLedgerId!
      const category = await categoriesRepo.addCategory(ledgerId, input)
      patch((s) => ({ categories: [...s.categories, category] }))
      return category
    },
    updateCategory: async (id, p) => {
      await categoriesRepo.updateCategory(id, p)
      await refreshActiveLedger(set)
    },
    removeCategory: async (id) => {
      await categoriesRepo.removeCategory(id)
      await refreshActiveLedger(set)
    },

    addTransaction: async (input) => {
      const ledgerId = useUiStore.getState().activeLedgerId!
      const tx = await transactionsRepo.addTransaction(ledgerId, input)
      patch((s) => ({ transactions: [...s.transactions, tx] }))
      return tx
    },
    updateTransaction: async (id, input) => {
      await transactionsRepo.updateTransaction(id, input)
      await refreshActiveLedger(set)
    },
    removeTransaction: async (id) => {
      await transactionsRepo.removeTransaction(id)
      await refreshActiveLedger(set)
    },
    bulkRemoveTransactions: async (ids) => {
      await transactionsRepo.bulkRemoveTransactions(ids)
      await refreshActiveLedger(set)
    },

    addDebt: async (input) => {
      const ledgerId = useUiStore.getState().activeLedgerId!
      const debt = await debtsRepo.addDebt(ledgerId, input)
      patch((s) => ({ debts: [...s.debts, debt] }))
      return debt
    },
    updateDebt: async (id, p) => {
      await debtsRepo.updateDebt(id, p)
      await refreshActiveLedger(set)
    },
    settleDebt: async (id) => {
      await debtsRepo.settleDebt(id)
      await refreshActiveLedger(set)
    },
    removeDebt: async (id) => {
      await debtsRepo.removeDebt(id)
      await refreshActiveLedger(set)
    },

    addBudget: async (input) => {
      const ledgerId = useUiStore.getState().activeLedgerId!
      const budget = await budgetsRepo.addBudget(ledgerId, input)
      patch((s) => ({ budgets: [...s.budgets, budget] }))
      return budget
    },
    updateBudget: async (id, p) => {
      await budgetsRepo.updateBudget(id, p)
      await refreshActiveLedger(set)
    },
    removeBudget: async (id) => {
      await budgetsRepo.removeBudget(id)
      await refreshActiveLedger(set)
    },

    addGoal: async (input) => {
      const ledgerId = useUiStore.getState().activeLedgerId!
      const goal = await goalsRepo.addGoal(ledgerId, input)
      patch((s) => ({ goals: [...s.goals, goal] }))
      return goal
    },
    updateGoal: async (id, p) => {
      await goalsRepo.updateGoal(id, p)
      await refreshActiveLedger(set)
    },
    removeGoal: async (id) => {
      await goalsRepo.removeGoal(id)
      await refreshActiveLedger(set)
    },
  }
})
