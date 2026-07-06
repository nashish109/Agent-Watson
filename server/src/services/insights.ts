import type { StoredMemory } from "./memory.js"
import { getAIProvider } from "../ai/index.js"

type MemoryInput = Pick<StoredMemory, "id" | "sessionId" | "userId" | "type" | "topic" | "summary" | "content" | "createdAt">

export interface Briefing {
  todaySummary: string
  keyInsight: string
  recommendation: string
  watchFor?: string
}

interface PatternGroup {
  topic: string
  type: string
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
        type: m.type,
        count: 1,
        firstSeen: m.createdAt,
        lastSeen: m.createdAt,
        memoryIds: [m.id],
      })
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.count - a.count)
}

export async function generateBriefing(memories: MemoryInput[]): Promise<Briefing | null> {
  if (memories.length === 0) return null

  const groups = groupMemoriesByTopic(memories)

  const provider = getAIProvider()
  const memorySummary = groups
    .slice(0, 10)
    .map((g) => {
      const timespan = g.firstSeen === g.lastSeen
        ? "today"
        : `over ${Math.round(daysDiff(g.firstSeen, g.lastSeen)) + 1} days`
      return `- ${g.topic} (${g.type}): mentioned ${g.count} times ${timespan}`
    })
    .join("\n")

  try {
    const response = await provider.chat([
      {
        role: "system",
        content: `You are Watson's executive briefing engine. Analyze the user's memory patterns and produce a concise, high-value CEO-style briefing.

Return JSON with exactly these fields:
{
  "todaySummary": "One sentence summarizing what happened recently — focus on the most important activity or pattern.",
  "keyInsight": "One meaningful observation about progress, habits, focus shifts, learning trends, or behavioral patterns.",
  "recommendation": "One specific, actionable next step the user should take — not generic advice.",
  "watchFor": "Optional. One thing to monitor going forward. Omit this field entirely if nothing stands out."
}

Rules:
- Each field must be 1-2 sentences. Be concise but specific.
- Reference actual topics or patterns from the user's data — don't be generic.
- Answer: What happened? Why does it matter? What should I do next?
- Prioritize: emerging habits, goal progress, behavioral patterns, focus shifts, learning trends, consistency changes.
- Ignore: message counts, contribution stats, minor sentiment changes, small activity counts.
- If memory patterns are very thin, keep insights brief but still meaningful.`,
      },
      {
        role: "user",
        content: `Here are the user's memory patterns:\n${memorySummary}\n\nTotal memories analyzed: ${memories.length}`,
      },
    ])

    const cleaned = response.content
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim()

    const parsed = JSON.parse(cleaned)
    if (!parsed.todaySummary && !parsed.keyInsight) return null

    return {
      todaySummary: parsed.todaySummary ?? "",
      keyInsight: parsed.keyInsight ?? "",
      recommendation: parsed.recommendation ?? "",
      watchFor: parsed.watchFor,
    }
  } catch {
    return null
  }
}

function daysDiff(a: string, b: string): number {
  const da = new Date(a).getTime()
  const db = new Date(b).getTime()
  return Math.abs(da - db) / (1000 * 60 * 60 * 24)
}

// ── Legacy insight store (kept for chat context & hydration) ──────
export interface InsightData {
  id: string
  type: string
  title: string
  description: string
  category: string
  strength: number
  relatedMemoryIds: string[]
  createdAt: string
}

const insightsStore: InsightData[] = []

export function hydrateInsights(data: InsightData[]): void {
  insightsStore.length = 0
  insightsStore.push(...data)
}

export function getAllInsights(): InsightData[] {
  return [...insightsStore].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export function getInsightsForMemories(memoryIds: string[]): InsightData[] {
  return insightsStore.filter((insight) =>
    insight.relatedMemoryIds?.some((id) => memoryIds.includes(id)),
  )
}

export function formatInsightsForContext(insightsList: InsightData[]): string {
  if (insightsList.length === 0) return ""
  return insightsList
    .map((i) => `- ${i.title}: ${i.description}`)
    .join("\n")
}

// Kept for backward compat — routes/chat.ts imports this
export async function generateInsights(
  memories: MemoryInput[],
): Promise<InsightData[]> {
  const briefing = await generateBriefing(memories)
  if (!briefing) return []
  return [{
    id: crypto.randomUUID(),
    type: "briefing",
    title: "Today's Briefing",
    description: `${briefing.todaySummary}\n\nKey Insight: ${briefing.keyInsight}\n\nRecommendation: ${briefing.recommendation}`,
    category: "generic",
    strength: 1,
    relatedMemoryIds: [],
    createdAt: new Date().toISOString(),
  }]
}
