import { db, newId } from '../schema'
import type { Category, CategoryKind } from '../../types'

export interface CategoryInput {
  name: string
  kind: CategoryKind
  parentId?: string
  icon?: string
  color: string
  sortOrder: number
}

/** 默认分类：支出 + 收入 */
export const DEFAULT_CATEGORIES: Array<{
  name: string
  kind: CategoryKind
  icon: string
  color: string
}> = [
  { name: '餐饮', kind: 'expense', icon: '🍜', color: '#fa8c16' },
  { name: '交通', kind: 'expense', icon: '🚌', color: '#1677ff' },
  { name: '购物', kind: 'expense', icon: '🛍️', color: '#eb2f96' },
  { name: '居住', kind: 'expense', icon: '🏠', color: '#722ed1' },
  { name: '娱乐', kind: 'expense', icon: '🎮', color: '#13c2c2' },
  { name: '医疗', kind: 'expense', icon: '💊', color: '#52c41a' },
  { name: '教育', kind: 'expense', icon: '📚', color: '#2f54eb' },
  { name: '人情', kind: 'expense', icon: '🎁', color: '#f5222d' },
  { name: '其他支出', kind: 'expense', icon: '📦', color: '#8c8c8c' },
  { name: '工资', kind: 'income', icon: '💰', color: '#52c41a' },
  { name: '奖金', kind: 'income', icon: '🧧', color: '#faad14' },
  { name: '理财', kind: 'income', icon: '📈', color: '#1677ff' },
  { name: '其他收入', kind: 'income', icon: '💵', color: '#8c8c8c' },
]

export function createDefaultCategories(
  ledgerId: string,
): Promise<Category[]> {
  const now = Date.now()
  const categories: Category[] = DEFAULT_CATEGORIES.map((c, i) => ({
    id: newId(),
    ledgerId,
    name: c.name,
    kind: c.kind,
    icon: c.icon,
    color: c.color,
    sortOrder: i,
    isArchived: false,
    createdAt: now,
  }))
  return db.categories.bulkAdd(categories).then(() => categories)
}

export async function addCategory(
  ledgerId: string,
  input: CategoryInput,
): Promise<Category> {
  const category: Category = {
    id: newId(),
    ledgerId,
    isArchived: false,
    createdAt: Date.now(),
    ...input,
  }
  await db.categories.add(category)
  return category
}

export async function updateCategory(
  id: string,
  patch: Partial<Omit<Category, 'id' | 'ledgerId' | 'createdAt'>>,
): Promise<void> {
  await db.categories.update(id, patch)
}

export async function removeCategory(id: string): Promise<void> {
  await db.categories.delete(id)
}

export function listCategories(ledgerId: string): Promise<Category[]> {
  return db.categories.where('ledgerId').equals(ledgerId).toArray()
}
