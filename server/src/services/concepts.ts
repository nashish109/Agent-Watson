import type { Concept, ConceptEdge } from "@agent-watson/shared"
import { getAIProvider } from "../ai/index.js"
import { upsertConcept, upsertConceptEdge } from "../db/db-service.js"

const concepts = new Map<string, Concept>()
const edges: ConceptEdge[] = []

export function getAllConcepts(): Concept[] {
  return Array.from(concepts.values()).sort((a, b) => b.mentionCount - a.mentionCount)
}

export function hydrateConcepts(data: Concept[]): void {
  concepts.clear()
  for (const c of data) concepts.set(c.name.toLowerCase(), c)
}

export function hydrateEdges(data: ConceptEdge[]): void {
  edges.length = 0
  edges.push(...data)
}

export function getConcept(name: string): Concept | undefined {
  return concepts.get(name.toLowerCase())
}

export function getConceptEdges(conceptId: string): ConceptEdge[] {
  return edges.filter((e) => e.sourceId === conceptId || e.targetId === conceptId)
}

export function getConceptGraph(): { concepts: Concept[]; edges: ConceptEdge[] } {
  return {
    concepts: getAllConcepts(),
    edges: [...edges],
  }
}

export function getRelatedConcepts(message: string): Concept[] {
  const messageLower = message.toLowerCase()
  const messageWords = messageLower.split(/\s+/)

  return Array.from(concepts.values())
    .map((c) => {
      const nameWords = c.name.toLowerCase().split(/\s+/)
      const matchCount = nameWords.filter((w) => messageWords.includes(w)).length
      return { concept: c, score: matchCount / Math.max(nameWords.length, 1) }
    })
    .filter((m) => m.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .map((m) => m.concept)
    .slice(0, 5)
}

export function formatConceptsForContext(conceptsList: Concept[]): string {
  if (conceptsList.length === 0) return ""

  return conceptsList
    .map((c) => `- ${c.name} (${c.type}): mentioned ${c.mentionCount} times`)
    .join("\n")
}

export async function extractAndStoreConcepts(
  message: string,
  sessionId: string,
  userId = "default",
): Promise<Concept[]> {
  const extracted = await extractConceptsFromMessage(message)
  const created: Concept[] = []

  for (const ext of extracted) {
    const key = ext.name.toLowerCase()
    const existing = concepts.get(key)

    if (existing) {
      existing.mentionCount++
      existing.lastSeen = new Date().toISOString()
      if (!existing.relatedSessions.includes(sessionId)) {
        existing.relatedSessions.push(sessionId)
      }
      created.push(existing)
    } else {
      const concept: Concept = {
        id: crypto.randomUUID(),
        name: ext.name,
        type: ext.type as Concept["type"],
        mentionCount: 1,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        relatedSessions: [sessionId],
      }
      concepts.set(key, concept)
      created.push(concept)
    }
  }

  for (const c of created) {
    upsertConcept({
      id: c.id, userId,
      name: c.name, type: c.type,
      mentionCount: c.mentionCount,
      firstSeen: new Date(c.firstSeen),
      lastSeen: new Date(c.lastSeen),
      relatedSessions: c.relatedSessions,
    }).catch(() => {})
  }

  // Build edges between concepts that appear together
  if (created.length >= 2) {
    for (let i = 0; i < created.length; i++) {
      for (let j = i + 1; j < created.length; j++) {
        addEdge(created[i].id, created[j].id, "related_to")
      }
    }
  }

  return created
}

function addEdge(sourceId: string, targetId: string, relation: string) {
  const exists = edges.some(
    (e) =>
      (e.sourceId === sourceId && e.targetId === targetId) ||
      (e.sourceId === targetId && e.targetId === sourceId),
  )

  if (!exists) {
    const edge: ConceptEdge = {
      id: crypto.randomUUID(),
      sourceId,
      targetId,
      relation,
      strength: 1,
      createdAt: new Date().toISOString(),
    }
    edges.push(edge)
    upsertConceptEdge(edge).catch(() => {})
  } else {
    for (const e of edges) {
      if (
        (e.sourceId === sourceId && e.targetId === targetId) ||
        (e.sourceId === targetId && e.targetId === sourceId)
      ) {
        e.strength = Math.min(10, e.strength + 0.5)
        upsertConceptEdge(e).catch(() => {})
      }
    }
  }
}

interface ExtractedConcept {
  name: string
  type: string
}

async function extractConceptsFromMessage(message: string): Promise<ExtractedConcept[]> {
  const provider = getAIProvider()

  try {
    const response = await provider.chat([
      {
        role: "system",
        content: `Extract key concepts from the user's message. 
Return a JSON array of objects with "name" and "type" fields.
Types: technology, language, project, person, topic, skill, habit, resource, generic

Rules:
- Only extract important, specific concepts (not generic words like "I", "today", "thing")
- Limit to max 5 concepts
- If nothing specific is mentioned, return empty array []`,
      },
      {
        role: "user",
        content: message,
      },
    ])

    const cleaned = response.content
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim()

    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []

    return parsed.slice(0, 5).map((c: any) => ({
      name: typeof c.name === "string" ? c.name : c.name ?? "Unknown",
      type: typeof c.type === "string" ? c.type : "generic",
    }))
  } catch {
    return extractConceptsWithRegex(message)
  }
}

function extractConceptsWithRegex(message: string): ExtractedConcept[] {
  const concepts: ExtractedConcept[] = []
  const messageLower = message.toLowerCase()

  const patterns: Array<{ regex: RegExp; type: string }> = [
    { regex: /typescript|javascript|python|rust|go\b|java|ruby|php|c\+\+|swift|kotlin/gi, type: "language" },
    { regex: /react|vue|angular|next\.?js|node|django|flask|spring|express/gi, type: "technology" },
    { regex: /project|app|website|api|service|platform|tool|library/gi, type: "project" },
  ]

  const seen = new Set<string>()

  for (const pattern of patterns) {
    const matches = messageLower.match(pattern.regex)
    if (matches) {
      for (const match of matches) {
        const normalized = match.charAt(0).toUpperCase() + match.slice(1)
        if (!seen.has(normalized)) {
          seen.add(normalized)
          concepts.push({ name: normalized, type: pattern.type })
        }
      }
    }
  }

  return concepts.slice(0, 5)
}
