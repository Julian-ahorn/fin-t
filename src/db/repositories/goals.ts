import { db, newId } from '../schema'
import type { Goal } from '../../types'

export interface GoalInput {
  name: string
  targetAmount: number
  startDate: string
  deadline?: string
  linkedAccountId?: string
  currentAmount?: number
  note?: string
}

export async function addGoal(ledgerId: string, input: GoalInput): Promise<Goal> {
  const now = Date.now()
  const goal: Goal = {
    id: newId(),
    ledgerId,
    createdAt: now,
    updatedAt: now,
    ...input,
  }
  await db.goals.add(goal)
  return goal
}

export async function updateGoal(
  id: string,
  patch: Partial<Omit<Goal, 'id' | 'ledgerId' | 'createdAt'>>,
): Promise<void> {
  await db.goals.update(id, { ...patch, updatedAt: Date.now() })
}

export async function removeGoal(id: string): Promise<void> {
  await db.goals.delete(id)
}

export function listGoals(ledgerId: string): Promise<Goal[]> {
  return db.goals.where('ledgerId').equals(ledgerId).toArray()
}
