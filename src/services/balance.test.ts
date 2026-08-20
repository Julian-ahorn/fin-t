import { describe, expect, it } from 'vitest'
import type { Account, Transaction } from '../types'
import { accountBalance, accountBalances, netWorth } from './balance'

const mkAccount = (id: string, initialBalance = 0): Account => ({
  id,
  ledgerId: 'l1',
  name: id,
  type: 'bank',
  currency: 'CNY',
  initialBalance,
  color: '#000',
  sortOrder: 0,
  isArchived: false,
  createdAt: 0,
  updatedAt: 0,
})

const mkTx = (partial: Partial<Transaction> & Pick<Transaction, 'kind' | 'accountId' | 'amount'>): Transaction => ({
  id: Math.random().toString(36).slice(2),
  ledgerId: 'l1',
  currency: 'CNY',
  date: '2025-01-01',
  timestamp: 0,
  tags: [],
  createdAt: 0,
  updatedAt: 0,
  ...partial,
})

describe('账户余额计算', () => {
  it('期初余额 + 收入 - 支出', () => {
    const a = mkAccount('a', 10000)
    const txs = [
      mkTx({ kind: 'income', accountId: 'a', amount: 5000 }),
      mkTx({ kind: 'expense', accountId: 'a', amount: 2000 }),
    ]
    expect(accountBalance(a, txs)).toBe(13000)
  })

  it('转账：转出账户减少，转入账户增加', () => {
    const from = mkAccount('from', 10000)
    const to = mkAccount('to', 0)
    const tx = mkTx({ kind: 'transfer', accountId: 'from', toAccountId: 'to', amount: 3000 })
    expect(accountBalance(from, [tx])).toBe(7000)
    expect(accountBalance(to, [tx])).toBe(3000)
  })

  it('不影响其他账户', () => {
    const b = mkAccount('b', 0)
    const tx = mkTx({ kind: 'expense', accountId: 'a', amount: 100 })
    expect(accountBalance(b, [tx])).toBe(0)
  })

  it('accountBalances 汇总与净资产', () => {
    const a = mkAccount('a', 1000)
    const b = mkAccount('b', 0)
    const txs = [
      mkTx({ kind: 'transfer', accountId: 'a', toAccountId: 'b', amount: 500 }),
      mkTx({ kind: 'expense', accountId: 'b', amount: 200 }),
    ]
    const results = accountBalances([a, b], txs)
    expect(results[0].balance).toBe(500)
    expect(results[1].balance).toBe(300)
    expect(netWorth(results)).toBe(800)
  })
})
