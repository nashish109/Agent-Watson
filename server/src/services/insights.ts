import type { Insight, MemoryType, InsightType } from "@agent-watson/shared"
import { getAIProvider } from "../ai/index.js"
import type { StoredMemory } from "./memory.js"
import { insertInsight } from "../db/db-service.js"

type MemoryInput = Pick<StoredMemory, "id" | "sessionId" | "userId" | "type" | "topic" | "summary" | "content" | "createdAt">

export interface InsightData {
  id: string
  type: InsightType
  title: string
  description: string
  category: MemoryType
  strength: number
  relatedMemoryIds: string[]
  createdAt: string
}

const insightsStore: InsightData[] = []

export function hydrateInsights(data: InsightData[]): void {
  insightsStore.length = 0
  insightsStore.push(...data)
}

interface PatternGroup {
  topic: string
  type: MemoryType
  count: number
  firstSeen: string
  lastSeen: string
  memoryIds: string[]
}

function groupMemoriesByTopic(memories: MemoryInput[]): PatternGroup[] {
  const groups = new Map<string, PatternGroup>()

  for (const m of memories) {
    const key = `${m.type}:${m.topic}`
    const existing = groups.get(key)
    if (existing) {
      existing.count++
      existing.memoryIds.push(m.id)
      if (m.createdAt < existing.firstSeen) existing.firstSeen = m.createdAt
      if (m.createdAt > existing.lastSeen) existing.lastSeen = m.createdAt
    } else {
      groups.set(key, {
        topic: m.topic,
        type: m.type as MemoryType,
        count: 1,
        firstSeen: m.createdAt,
        lastSeen: m.createdAt,
        memoryIds: [m.id],
      })
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.count - a.count)
}

function detectPatternInsights(groups: PatternGroup[]): InsightData[] {
  const insights: InsightData[] = []

  for (const group of groups) {
    if (group.count >= 3) {
      const daysBetween = daysDiff(group.firstSeen, group.lastSeen)
      const frequency = daysBetween > 0 ? group.count / daysBetween : group.count

      insights.push({
        id: crypto.randomUUID(),
        type: "pattern",
        title: `Repeated topic: ${group.topic}`,
        description: `You've mentioned "${group.topic}" ${group.count} times over ${Math.max(1, daysBetween)} day(s).`,
        category: group.type,
        strength: Math.min(1, group.count / 10),
        relatedMemoryIds: group.memoryIds,
        createdAt: new Date().toISOString(),
      })

      if (frequency >= 1 && group.count >= 3) {
        insights.push({
          id: crypto.randomUUID(),
          type: "trend",
          title: `Growing interest: ${group.topic}`,
          description: `"${group.topic}" appears frequently — you've mentioned it ${group.count} times. This may be an area of active focus.`,
          category: group.type,
          strength: Math.min(1, frequency / 3),
          relatedMemoryIds: group.memoryIds,
          createdAt: new Date().toISOString(),
        })
      }
    }
  }

  return insights
}

function detectTypeDistributionInsights(
  memories: MemoryInput[],
  groups: PatternGroup[],
): InsightData[] {
  const insights: InsightData[] = []
  const typeCounts = new Map<string, number>()
  for (const m of memories) {
    typeCounts.set(m.type, (typeCounts.get(m.type) || 0) + 1)
  }

  const dominantType = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])[0]
  if (dominantType && dominantType[1] >= 3) {
    const typeLabel = dominantType[0]
    const total = memories.length
    const pct = Math.round((dominantType[1] / total) * 100)

    insights.push({
      id: crypto.randomUUID(),
      type: "observation",
      title: `Primary focus: ${typeLabel}`,
      description: `${pct}% of your memories are about ${typeLabel}. This is your most discussed area.`,
      category: dominantType[0] as MemoryType,
      strength: Math.min(1, dominantType[1] / 15),
      relatedMemoryIds: memories.filter((m) => m.type === dominantType[0]).map((m) => m.id),
      createdAt: new Date().toISOString(),
    })
  }

  return insights
}

function daysDiff(a: string, b: string): number {
  const da = new Date(a).getTime()
  const db = new Date(b).getTime()
  return Math.abs(da - db) / (1000 * 60 * 60 * 24)
}

export async function generateInsights(
  memories: MemoryInput[],
): Promise<InsightData[]> {
  const newInsights: InsightData[] = []

  const groups = groupMemoriesByTopic(memories)
  newInsights.push(...detectPatternInsights(groups))
  newInsights.push(...detectTypeDistributionInsights(memories, groups))

  const aiInsight = await generateAIInsight(memories, groups)
  if (aiInsight) newInsights.push(aiInsight)

  const userId = memories[0]?.userId ?? "default"

  for (const insight of newInsights) {
    insightsStore.push(insight)
    insertInsight({
      id: insight.id, userId,
      type: insight.type,
      title: insight.title, description: insight.description,
      category: insight.category, strength: insight.strength,
      relatedMemoryIds: insight.relatedMemoryIds,
      createdAt: new Date(insight.createdAt),
    }).catch(() => {})
  }

  return newInsights
}

async function generateAIInsight(
  memories: MemoryInput[],
  groups: PatternGroup[],
): Promise<InsightData | null> {
  if (memories.length < 3) return null

  const provider = getAIProvider()
  const memorySummary = groups
    .slice(0, 5)
    .map((g) => `- ${g.topic} (${g.type}): mentioned ${g.count} times`)
    .join("\n")

  try {
    const response = await provider.chat([
      {
        role: "system",
        content: `You are Watson's insight engine. Analyze the user's memory patterns and produce ONE insight.
Return JSON:
{
  "type": "pattern" | "observation" | "milestone" | "suggestion",
  "title": "short title (3-8 words)",
  "description": "one insightful sentence that connects patterns or suggests something meaningful",
  "category": "learning" | "project" | "career" | "health" | "reflection" | "generic"
}

Rules:
- Be specific and genuine, not generic
- Connect dots between different topics if relevant
- If there aren't enough patterns, return null`,
      },
      {
        role: "user",
        content: `Memory patterns found:\n${memorySummary}\n\nTotal memories: ${memories.length}`,
      },
    ])

    const cleaned = response.content
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim()

    if (cleaned === "null") return null

    const parsed = JSON.parse(cleaned)
    if (!parsed || !parsed.title) return null

    const relatedIds = groups
      .slice(0, 3)
      .flatMap((g) => g.memoryIds)

    return {
      id: crypto.randomUUID(),
      type: parsed.type ?? "observation",
      title: parsed.title,
      description: parsed.description ?? parsed.title,
      category: parsed.category ?? "generic",
      strength: 0.7,
      relatedMemoryIds: relatedIds,
      createdAt: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function getAllInsights(): InsightData[] {
  return [...insightsStore].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function getInsightsForMemories(memoryIds: string[]): InsightData[] {
  return insightsStore.filter((insight) =>
    insight.relatedMemoryIds.some((id) => memoryIds.includes(id)),
  )
}

export function formatInsightsForContext(insightsList: InsightData[]): string {
  if (insightsList.length === 0) return ""

  return insightsList
    .map((i) => `- ${i.title}: ${i.description}`)
    .join("\n")
}
