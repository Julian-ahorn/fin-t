import type { Account, Transaction } from '../types'

/**
 * 账户当前余额 = 期初余额 + Σ(收入) − Σ(支出) + Σ(转入) − Σ(转出)
 * 转账记录：accountId 为转出账户，toAccountId 为转入账户。
 */
export function accountBalance(account: Account, txs: Transaction[]): number {
  let balance = account.initialBalance
  for (const tx of txs) {
    if (tx.kind === 'income' && tx.accountId === account.id) {
      balance += tx.amount
    } else if (tx.kind === 'expense' && tx.accountId === account.id) {
      balance -= tx.amount
    } else if (tx.kind === 'transfer') {
      if (tx.accountId === account.id) balance -= tx.amount
      if (tx.toAccountId === account.id) balance += tx.amount
    }
  }
  return balance
}

export interface AccountBalanceResult {
  account: Account
  balance: number
  totalIncome: number
  totalExpense: number
}

export function accountBalances(
  accounts: Account[],
  txs: Transaction[],
): AccountBalanceResult[] {
  return accounts.map((account) => {
    let balance = account.initialBalance
    let totalIncome = 0
    let totalExpense = 0
    for (const tx of txs) {
      if (tx.kind === 'income' && tx.accountId === account.id) {
        balance += tx.amount
        totalIncome += tx.amount
      } else if (tx.kind === 'expense' && tx.accountId === account.id) {
        balance -= tx.amount
        totalExpense += tx.amount
      } else if (tx.kind === 'transfer') {
        if (tx.accountId === account.id) {
          balance -= tx.amount
          totalExpense += tx.amount
        }
        if (tx.toAccountId === account.id) {
          balance += tx.amount
          totalIncome += tx.amount
        }
      }
    }
    return { account, balance, totalIncome, totalExpense }
  })
}

/** 净资产 = 全部账户余额之和（信用卡等负债账户以负数计算） */
export function netWorth(results: AccountBalanceResult[]): number {
  return results.reduce((sum, r) => sum + r.balance, 0)
}
