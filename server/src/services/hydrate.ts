import { config } from "../config.js"
import { getDb } from "../db/index.js"
import { eq } from "drizzle-orm"
import { getAllMemories, getGoalsForUser, getAllConcepts, getAllEdges, getAllInsights } from "../db/db-service.js"
import { hydrateMemories } from "./memory.js"
import { hydrateGoals, hydrateGoalProgress } from "./goals.js"
import { hydrateConcepts, hydrateEdges } from "./concepts.js"
import { hydrateInsights } from "./insights.js"
import { hydrateSessions, getAllSessions } from "../routes/sessions.js"
import { hydrateSessionMessages } from "../routes/chat.js"
import * as schema from "../db/schema.js"

function parseEmbedding(v: unknown): number[] {
  if (!v) return []
  if (Array.isArray(v)) return v
  if (typeof v === "string") {
    try { return JSON.parse(v) } catch { return [] }
  }
  return []
}

function toIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

export async function hydrateFromDb(): Promise<void> {
  if (!config.database.url) return

  try {
    const userId = "default"

    const dbSessions = await getDb().select().from(schema.sessions)
    if (dbSessions.length > 0) {
      hydrateSessions(
        dbSessions.map((s: any) => ({
          id: s.id, userId: s.userId, sessionDate: s.sessionDate,
          title: s.title, mode: s.mode,
          startedAt: toIso(s.startedAt),
          endedAt: s.endedAt ? toIso(s.endedAt) : undefined,
          summary: s.summary,
        })),
      )
    }

    const memories = await getAllMemories(userId)
    if (memories.length > 0) {
      hydrateMemories(
        memories.map((m: any) => ({
          id: m.id,
          sessionId: m.sessionId,
          userId: m.userId,
          type: m.type,
          topic: m.topic,
          summary: m.summary,
          content: m.content,
          embedding: parseEmbedding(m.embedding),
          createdAt: toIso(m.createdAt),
        })),
      )
    }

    const goals = await getGoalsForUser(userId)
    if (goals.length > 0) {
      hydrateGoals(
        goals.map((g: any) => ({
          id: g.id,
          userId: g.userId,
          title: g.title,
          description: g.description,
          category: g.category,
          status: g.status,
          progress: g.progress,
          targetDate: g.dueDate ? toIso(g.dueDate) : undefined,
          createdAt: toIso(g.createdAt),
          updatedAt: toIso(g.updatedAt),
        })),
      )
    }

    const concepts = await getAllConcepts(userId)
    if (concepts.length > 0) {
      hydrateConcepts(
        concepts.map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          mentionCount: c.mentionCount,
          firstSeen: toIso(c.firstSeen),
          lastSeen: toIso(c.lastSeen),
          relatedSessions: c.relatedSessions ?? [],
        })),
      )
    }

    const edges = await getAllEdges()
    if (edges.length > 0) {
      hydrateEdges(
        edges.map((e: any) => ({
          id: e.id,
          sourceId: e.sourceConceptId ?? e.sourceId,
          targetId: e.targetConceptId ?? e.targetId,
          relation: e.relation,
          strength: e.strength,
          createdAt: toIso(e.createdAt),
        })),
      )
    }

    const insights = await getAllInsights(userId)
    if (insights.length > 0) {
      hydrateInsights(
        insights.map((i: any) => ({
          id: i.id,
          type: i.type,
          title: i.title,
          description: i.description,
          category: i.category,
          strength: i.strength,
          relatedMemoryIds: i.relatedMemoryIds ?? [],
          createdAt: toIso(i.createdAt),
        })),
      )
    }

    const dbMessages = await getDb().select().from(schema.messages).orderBy(schema.messages.createdAt)
    if (dbMessages.length > 0) {
      await hydrateSessionMessages(
        dbMessages.map((m: any) => ({
          sessionId: m.sessionId,
          userId: m.userId,
          role: m.role,
          content: m.content,
          createdAt: toIso(m.createdAt),
        })),
      )
    }
  } catch (err) {
    console.warn("Hydration skipped:", (err as Error).message)
  }
}

export { parseEmbedding }
