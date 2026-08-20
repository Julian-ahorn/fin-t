import type { AccountType } from '../types'

export const ACCOUNT_TYPES: Array<{
  value: AccountType
  label: string
  icon: string
  color: string
}> = [
  { value: 'cash', label: '现金', icon: '💵', color: '#fa8c16' },
  { value: 'bank', label: '银行卡', icon: '🏦', color: '#1677ff' },
  { value: 'credit', label: '信用卡', icon: '💳', color: '#f5222d' },
  { value: 'alipay', label: '支付宝', icon: '🅰️', color: '#13c2c2' },
  { value: 'wechat', label: '微信', icon: '💬', color: '#52c41a' },
  { value: 'invest', label: '投资', icon: '📈', color: '#722ed1' },
  { value: 'virtual', label: '虚拟', icon: '🎮', color: '#8c8c8c' },
]

export function accountTypeMeta(type: AccountType) {
  return ACCOUNT_TYPES.find((t) => t.value === type) ?? ACCOUNT_TYPES[0]
}
