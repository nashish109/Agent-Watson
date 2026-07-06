import { getDb } from "./index.js"
import { config } from "../config.js"
import * as schema from "./schema.js"
import { eq, and, desc, sql } from "drizzle-orm"

const DB_ENABLED = Boolean(config.database.url)

// ── Session ──────────────────────────────────────────────────────
export async function insertSession(data: any): Promise<void> {
  if (!DB_ENABLED) return
  await getDb().insert(schema.sessions).values(data)
}

export async function getSessionById(id: string): Promise<any> {
  if (!DB_ENABLED) return null
  const rows = await getDb().select().from(schema.sessions).where(eq(schema.sessions.id, id)).limit(1)
  return rows[0] ?? null
}

// ── Message ───────────────────────────────────────────────────────
export async function insertMessage(data: {
  id: string
  sessionId: string
  userId: string
  role: string
  content: string
  createdAt: Date
}): Promise<void> {
  if (!DB_ENABLED) return
  await getDb().insert(schema.messages).values(data)
}

export async function getSessionMessages(sessionId: string): Promise<any[]> {
  if (!DB_ENABLED) return []
  return getDb()
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.sessionId, sessionId))
    .orderBy(schema.messages.createdAt)
}

// ── User Profile ──────────────────────────────────────────────────
export async function getUserProfile(userId: string): Promise<any> {
  if (!DB_ENABLED) return null
  const rows = await getDb().select().from(schema.userProfiles).where(eq(schema.userProfiles.userId, userId)).limit(1)
  return rows[0] ?? null
}

export async function upsertUserProfile(data: { userId: string; name?: string; details?: any }): Promise<void> {
  if (!DB_ENABLED) return
  await getDb().insert(schema.userProfiles).values({ ...data, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.userProfiles.userId, set: { ...data, updatedAt: new Date() } })
}

// ── Check Today ───────────────────────────────────────────────────
export async function hasUserContributedToday(userId: string): Promise<boolean> {
  if (!DB_ENABLED) return false
  const today = new Date().toISOString().slice(0, 10)
  const rows = await getDb()
    .select({ id: schema.messages.id })
    .from(schema.messages)
    .where(
      and(
        eq(schema.messages.userId, userId),
        sql`DATE(${schema.messages.createdAt}) = ${today}`,
      ),
    )
    .limit(1)
  return rows.length > 0
}

// ── Memory ────────────────────────────────────────────────────────
export async function insertMemory(data: any): Promise<void> {
  if (!DB_ENABLED) return
  await getDb().insert(schema.memories).values({
    id: data.id, sessionId: data.sessionId, userId: data.userId,
    type: data.type, topic: data.topic, summary: data.summary,
    content: data.content, confidence: String(data.confidence ?? 1),
    embedding: data.embedding ? `[${data.embedding.join(",")}]` as any : null,
    createdAt: data.createdAt ?? new Date(),
  })
}

export async function getAllMemories(userId: string): Promise<any[]> {
  if (!DB_ENABLED) return []
  const rows = await getDb().select().from(schema.memories).where(eq(schema.memories.userId, userId))
  return rows.map((r: any) => ({ ...r, confidence: Number(r.confidence) }))
}

// ── Goal ──────────────────────────────────────────────────────────
export async function insertGoal(data: any): Promise<void> {
  if (!DB_ENABLED) return
  await getDb().insert(schema.goals).values(data)
}

export async function getGoalsForUser(userId: string, status?: string): Promise<any[]> {
  if (!DB_ENABLED) return []
  const conditions = [eq(schema.goals.userId, userId)]
  if (status) conditions.push(eq(schema.goals.status, status))
  return getDb().select().from(schema.goals).where(and(...conditions)).orderBy(desc(schema.goals.updatedAt))
}

export async function getGoalById(id: string): Promise<any> {
  if (!DB_ENABLED) return null
  const rows = await getDb().select().from(schema.goals).where(eq(schema.goals.id, id)).limit(1)
  return rows[0] ?? null
}

export async function updateGoal(id: string, data: any): Promise<void> {
  if (!DB_ENABLED) return
  await getDb().update(schema.goals).set({ ...data, updatedAt: new Date() }).where(eq(schema.goals.id, id))
}

export async function removeGoal(id: string): Promise<void> {
  if (!DB_ENABLED) return
  await getDb().delete(schema.goalProgress).where(eq(schema.goalProgress.goalId, id))
  await getDb().delete(schema.goals).where(eq(schema.goals.id, id))
}

// ── Goal Progress ─────────────────────────────────────────────────
export async function insertGoalProgress(data: any): Promise<void> {
  if (!DB_ENABLED) return
  await getDb().insert(schema.goalProgress).values(data)
}

export async function getGoalProgress(goalId: string): Promise<any[]> {
  if (!DB_ENABLED) return []
  return getDb().select().from(schema.goalProgress).where(eq(schema.goalProgress.goalId, goalId)).orderBy(desc(schema.goalProgress.createdAt))
}

// ── Concept ───────────────────────────────────────────────────────
export async function upsertConcept(data: any): Promise<void> {
  if (!DB_ENABLED) return
  const existing = await getDb().select().from(schema.concepts)
    .where(and(eq(schema.concepts.userId, data.userId), eq(schema.concepts.name, data.name))).limit(1)
  if (existing[0]) {
    await getDb().update(schema.concepts).set({
      mentionCount: data.mentionCount,
      lastSeen: data.lastSeen,
      type: data.type,
      relatedSessions: data.relatedSessions,
    }).where(eq(schema.concepts.id, existing[0].id))
  } else {
    await getDb().insert(schema.concepts).values(data)
  }
}

export async function getAllConcepts(userId: string): Promise<any[]> {
  if (!DB_ENABLED) return []
  return getDb().select().from(schema.concepts).where(eq(schema.concepts.userId, userId)).orderBy(desc(schema.concepts.mentionCount))
}

// ── Concept Edge ──────────────────────────────────────────────────
export async function upsertConceptEdge(data: any): Promise<void> {
  if (!DB_ENABLED) return
  const sourceConceptId = data.sourceConceptId ?? data.sourceId
  const targetConceptId = data.targetConceptId ?? data.targetId
  const existing = await getDb().select().from(schema.conceptEdges)
    .where(and(
      eq(schema.conceptEdges.sourceConceptId, sourceConceptId),
      eq(schema.conceptEdges.targetConceptId, targetConceptId),
    )).limit(1)
  if (existing[0]) {
    await getDb().update(schema.conceptEdges).set({ strength: data.strength }).where(eq(schema.conceptEdges.id, existing[0].id))
  } else {
    await getDb().insert(schema.conceptEdges).values({
      id: data.id,
      sourceConceptId,
      targetConceptId,
      relation: data.relation,
      strength: data.strength,
      createdAt: data.createdAt ?? new Date(),
    })
  }
}

export async function getAllEdges(): Promise<any[]> {
  if (!DB_ENABLED) return []
  return getDb().select().from(schema.conceptEdges)
}

// ── Insight ───────────────────────────────────────────────────────
export async function insertInsight(data: any): Promise<void> {
  if (!DB_ENABLED) return
  await getDb().insert(schema.insights).values(data)
}

export async function getAllInsights(userId: string): Promise<any[]> {
  if (!DB_ENABLED) return []
  return getDb().select().from(schema.insights).where(eq(schema.insights.userId, userId)).orderBy(desc(schema.insights.createdAt))
}
