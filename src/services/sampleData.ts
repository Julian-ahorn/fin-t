import type {
  Account,
  Budget,
  Category,
  Debt,
  Goal,
  Ledger,
  Transaction,
} from '../types'
import { db, newId } from '../db/schema'
import { toCents } from '../utils/money'
import dayjs from 'dayjs'

/**
 * 生成一组确定性的示例数据（含账本、账户、分类、近 6 个月流水、预算、目标、借贷），
 * 用于演示与测试。可重复调用（每次生成到新账本）。
 */
export async function generateSampleData(): Promise<Ledger> {
  const now = Date.now()
  const ledger: Ledger = {
    id: newId(),
    name: '示例账本',
    currency: 'CNY',
    createdAt: now,
  }
  await db.ledgers.add(ledger)

  const accounts: Account[] = [
    { id: newId(), ledgerId: ledger.id, name: '现金', type: 'cash', currency: 'CNY', initialBalance: toCents(500), color: '#fa8c16', sortOrder: 0, isArchived: false, createdAt: now, updatedAt: now },
    { id: newId(), ledgerId: ledger.id, name: '银行卡', type: 'bank', currency: 'CNY', initialBalance: toCents(20000), color: '#1677ff', sortOrder: 1, isArchived: false, createdAt: now, updatedAt: now },
    { id: newId(), ledgerId: ledger.id, name: '支付宝', type: 'alipay', currency: 'CNY', initialBalance: toCents(3000), color: '#13c2c2', sortOrder: 2, isArchived: false, createdAt: now, updatedAt: now },
    { id: newId(), ledgerId: ledger.id, name: '微信', type: 'wechat', currency: 'CNY', initialBalance: toCents(1500), color: '#52c41a', sortOrder: 3, isArchived: false, createdAt: now, updatedAt: now },
    { id: newId(), ledgerId: ledger.id, name: '信用卡', type: 'credit', currency: 'CNY', initialBalance: 0, color: '#f5222d', sortOrder: 4, isArchived: false, createdAt: now, updatedAt: now },
  ]
  await db.accounts.bulkAdd(accounts)

  const expenseCats = [
    ['餐饮', '🍜', '#fa8c16'], ['交通', '🚌', '#1677ff'], ['购物', '🛍️', '#eb2f96'],
    ['居住', '🏠', '#722ed1'], ['娱乐', '🎮', '#13c2c2'], ['医疗', '💊', '#52c41a'],
    ['教育', '📚', '#2f54eb'], ['人情', '🎁', '#f5222d'], ['其他支出', '📦', '#8c8c8c'],
  ] as const
  const incomeCats = [
    ['工资', '💰', '#52c41a'], ['奖金', '🧧', '#faad14'], ['理财', '📈', '#1677ff'], ['其他收入', '💵', '#8c8c8c'],
  ] as const

  const categories: Category[] = []
  let sort = 0
  for (const [name, icon, color] of expenseCats) {
    categories.push({ id: newId(), ledgerId: ledger.id, name, kind: 'expense', icon, color, sortOrder: sort++, isArchived: false, createdAt: now })
  }
  for (const [name, icon, color] of incomeCats) {
    categories.push({ id: newId(), ledgerId: ledger.id, name, kind: 'income', icon, color, sortOrder: sort++, isArchived: false, createdAt: now })
  }
  await db.categories.bulkAdd(categories)

  const byName = (name: string): Category => categories.find((c) => c.name === name)!
  const bank = accounts[1]
  const alipay = accounts[2]
  const wechat = accounts[3]
  const credit = accounts[4]

  // 确定性伪随机（xorshift32，避免 JS 大数乘法溢出导致退化）
  let seed = 42 >>> 0
  const rand = (n: number): number => {
    seed ^= seed << 13
    seed >>>= 0
    seed ^= seed >> 17
    seed ^= seed << 5
    seed >>>= 0
    return (seed % n) + 1
  }

  const txs: Transaction[] = []
  const today = dayjs()
  const merchants: Array<[string, string, number, number]> = [
    // [商家, 分类, 最小金额元, 最大金额元]
    ['盒马鲜生', '餐饮', 30, 200],
    ['美团外卖', '餐饮', 15, 80],
    ['滴滴出行', '交通', 10, 60],
    ['地铁', '交通', 3, 15],
    ['淘宝', '购物', 50, 600],
    ['京东', '购物', 30, 500],
    ['房租', '居住', 2800, 3200],
    ['水电燃气', '居住', 80, 250],
    ['电影院', '娱乐', 40, 120],
    ['健身房', '娱乐', 99, 199],
    ['药店', '医疗', 20, 300],
    ['书店', '教育', 30, 150],
    ['红包', '人情', 100, 500],
  ]

  for (let m = 5; m >= 0; m--) {
    const monthStart = today.subtract(m, 'month').startOf('month')
    const days = monthStart.daysInMonth()
    // 工资 + 理财收入
    const payday = monthStart.add(9, 'day').format('YYYY-MM-DD')
    txs.push({
      id: newId(), ledgerId: ledger.id, accountId: bank.id, kind: 'income',
      amount: toCents(12000), currency: 'CNY', date: payday, timestamp: dayjs(payday).valueOf(),
      categoryId: byName('工资').id, counterparty: '公司', tags: [], createdAt: now, updatedAt: now,
    })
    if (m % 2 === 0) {
      txs.push({
        id: newId(), ledgerId: ledger.id, accountId: alipay.id, kind: 'income',
        amount: toCents(500), currency: 'CNY', date: payday, timestamp: dayjs(payday).valueOf(),
        categoryId: byName('理财').id, counterparty: '基金', tags: [], createdAt: now, updatedAt: now,
      })
    }
    // 房租 + 水电
    txs.push({
      id: newId(), ledgerId: ledger.id, accountId: bank.id, kind: 'expense',
      amount: toCents(3000), currency: 'CNY', date: monthStart.add(1, 'day').format('YYYY-MM-DD'),
      timestamp: monthStart.add(1, 'day').valueOf(), categoryId: byName('居住').id,
      counterparty: '房东', tags: [], createdAt: now, updatedAt: now,
    })
    // 每天 1-3 笔随机消费（保证生成量稳定）
    for (let d = 0; d < days; d++) {
      const count = 1 + (rand(3) - 1) // 1..3
      for (let k = 0; k < count; k++) {
        const pick = merchants[rand(merchants.length) - 1]
        const [merchant, catName, min, max] = pick
        const amountYuan = min + rand(Math.floor(max - min) + 1) - 1
        const account = [alipay, wechat, credit, bank][rand(4) - 1]
        const date = monthStart.add(d, 'day').format('YYYY-MM-DD')
        txs.push({
          id: newId(), ledgerId: ledger.id, accountId: account.id, kind: 'expense',
          amount: toCents(amountYuan), currency: 'CNY', date, timestamp: dayjs(date).valueOf(),
          categoryId: byName(catName).id, counterparty: merchant, tags: [], createdAt: now, updatedAt: now,
        })
      }
    }
    // 每月一次转账：银行卡 -> 支付宝
    const tDate = monthStart.add(5, 'day').format('YYYY-MM-DD')
    txs.push({
      id: newId(), ledgerId: ledger.id, accountId: bank.id, toAccountId: alipay.id, kind: 'transfer',
      amount: toCents(1000), currency: 'CNY', date: tDate, timestamp: dayjs(tDate).valueOf(),
      tags: [], createdAt: now, updatedAt: now,
    })
  }
  await db.transactions.bulkAdd(txs)

  const budgets: Budget[] = [
    {
      id: newId(), ledgerId: ledger.id, period: 'monthly', year: today.year(), month: today.month() + 1,
      amount: toCents(6000), rollover: false, createdAt: now, updatedAt: now,
    },
    {
      id: newId(), ledgerId: ledger.id, period: 'monthly', year: today.year(), month: today.month() + 1,
      categoryId: byName('餐饮').id, amount: toCents(1500), rollover: false, createdAt: now, updatedAt: now,
    },
    {
      id: newId(), ledgerId: ledger.id, period: 'monthly', year: today.year(), month: today.month() + 1,
      categoryId: byName('购物').id, amount: toCents(2000), rollover: false, createdAt: now, updatedAt: now,
    },
  ]
  await db.budgets.bulkAdd(budgets)

  const goals: Goal[] = [
    {
      id: newId(), ledgerId: ledger.id, name: '旅行基金', targetAmount: toCents(30000),
      startDate: today.subtract(2, 'month').format('YYYY-MM-DD'), deadline: today.add(10, 'month').format('YYYY-MM-DD'),
      linkedAccountId: bank.id, note: '明年去云南', createdAt: now, updatedAt: now,
    },
    {
      id: newId(), ledgerId: ledger.id, name: '新手机', targetAmount: toCents(6000),
      startDate: today.format('YYYY-MM-DD'), deadline: today.add(6, 'month').format('YYYY-MM-DD'),
      currentAmount: toCents(1200), createdAt: now, updatedAt: now,
    },
  ]
  await db.goals.bulkAdd(goals)

  const debts: Debt[] = [
    {
      id: newId(), ledgerId: ledger.id, direction: 'lend', counterparty: '张三', amount: toCents(2000),
      accountId: wechat.id, dueDate: today.add(30, 'day').format('YYYY-MM-DD'), status: 'outstanding',
      note: '上个月聚餐垫付', createdAt: now, updatedAt: now,
    },
    {
      id: newId(), ledgerId: ledger.id, direction: 'borrow', counterparty: '李四', amount: toCents(500),
      accountId: credit.id, dueDate: today.add(15, 'day').format('YYYY-MM-DD'), status: 'outstanding',
      note: '拼单代付', createdAt: now, updatedAt: now,
    },
  ]
  await db.debts.bulkAdd(debts)

  return ledger
}
