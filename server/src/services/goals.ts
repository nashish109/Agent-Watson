import type { MemoryType, GoalStatus } from "@agent-watson/shared"
import { insertGoal, updateGoal as updateGoalDb, removeGoal, insertGoalProgress } from "../db/db-service.js"

export interface GoalData {
  id: string
  userId: string
  title: string
  description: string
  category: MemoryType
  status: GoalStatus
  progress: number
  targetDate?: string
  createdAt: string
  updatedAt: string
}

interface ProgressEntry {
  id: string
  goalId: string
  note: string
  progressDelta: number
  createdAt: string
}

const goalsStore = new Map<string, GoalData>()
const progressStore = new Map<string, ProgressEntry[]>()

export function getAllGoals(): GoalData[] {
  return Array.from(goalsStore.values())
}

export function hydrateGoals(data: GoalData[]): void {
  goalsStore.clear()
  progressStore.clear()
  for (const g of data) goalsStore.set(g.id, g)
}

export function hydrateGoalProgress(entries: ProgressEntry[]): void {
  for (const e of entries) {
    const existing = progressStore.get(e.goalId) ?? []
    existing.push(e)
    progressStore.set(e.goalId, existing)
  }
}

export function createGoal(params: {
  userId: string
  title: string
  description?: string
  category?: string
  targetDate?: string
}): GoalData {
  const goal: GoalData = {
    id: crypto.randomUUID(),
    userId: params.userId,
    title: params.title,
    description: params.description ?? "",
    category: (params.category as MemoryType) ?? "generic",
    status: "active",
    progress: 0,
    targetDate: params.targetDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  goalsStore.set(goal.id, goal)

  insertGoal({
    id: goal.id, userId: goal.userId, title: goal.title,
    description: goal.description, category: goal.category,
    status: goal.status, progress: goal.progress,
    dueDate: goal.targetDate ? new Date(goal.targetDate) : null,
    createdAt: new Date(goal.createdAt), updatedAt: new Date(goal.updatedAt),
  }).catch(() => {})

  return goal
}

export function getGoals(userId: string, status?: GoalStatus): GoalData[] {
  const all = Array.from(goalsStore.values()).filter((g) => g.userId === userId)

  if (status) {
    return all.filter((g) => g.status === status).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }

  return all.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function getGoal(goalId: string): GoalData | undefined {
  return goalsStore.get(goalId)
}

export function updateGoal(
  goalId: string,
  updates: Partial<Pick<GoalData, "title" | "description" | "category" | "status" | "targetDate">>,
): GoalData | undefined {
  const goal = goalsStore.get(goalId)
  if (!goal) return undefined

  Object.assign(goal, updates, { updatedAt: new Date().toISOString() })

  updateGoalDb(goalId, {
    title: goal.title, description: goal.description,
    category: goal.category, status: goal.status,
    progress: goal.progress,
    dueDate: goal.targetDate ? new Date(goal.targetDate) : null,
  }).catch(() => {})

  return goal
}

export function addProgress(
  goalId: string,
  params: { note: string; progressDelta: number },
): ProgressEntry | undefined {
  const goal = goalsStore.get(goalId)
  if (!goal) return undefined

  const entry: ProgressEntry = {
    id: crypto.randomUUID(),
    goalId,
    note: params.note,
    progressDelta: params.progressDelta,
    createdAt: new Date().toISOString(),
  }

  const existing = progressStore.get(goalId) ?? []
  existing.push(entry)
  progressStore.set(goalId, existing)

  goal.progress = Math.min(100, Math.max(0, goal.progress + params.progressDelta))
  goal.updatedAt = new Date().toISOString()

  if (goal.progress >= 100 && goal.status === "active") {
    goal.status = "completed"
  }

  insertGoalProgress({
    id: entry.id, goalId: entry.goalId,
    note: entry.note, progressDelta: entry.progressDelta,
    createdAt: new Date(entry.createdAt),
  }).catch(() => {})

  updateGoalDb(goalId, {
    progress: goal.progress, status: goal.status,
  }).catch(() => {})

  return entry
}

export function getProgress(goalId: string): ProgressEntry[] {
  return progressStore.get(goalId) ?? []
}

export function deleteGoal(goalId: string): boolean {
  progressStore.delete(goalId)
  const deleted = goalsStore.delete(goalId)

  removeGoal(goalId).catch(() => {})

  return deleted
}

export function formatGoalsForContext(goalsList: GoalData[]): string {
  if (goalsList.length === 0) return ""

  return goalsList
    .filter((g) => g.status === "active")
    .map((g) => `- ${g.title} (${g.progress}% complete, category: ${g.category})`)
    .join("\n")
}

export function findRelatedGoals(
  message: string,
  userId: string,
): GoalData[] {
  const activeGoals = Array.from(goalsStore.values()).filter(
    (g) => g.userId === userId && g.status === "active",
  )

  const messageLower = message.toLowerCase()
  const messageWords = messageLower.split(/\s+/)

  return activeGoals
    .map((goal) => {
      const goalText = (goal.title + " " + goal.description).toLowerCase()
      const matchCount = messageWords.filter((w) => goalText.includes(w)).length
      return { goal, score: matchCount / messageWords.length }
    })
    .filter((m) => m.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .map((m) => m.goal)
    .slice(0, 3)
}
