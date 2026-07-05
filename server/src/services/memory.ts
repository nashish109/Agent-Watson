import { generateEmbedding, cosineSimilarity } from "./embedding.js"
import { getAIProvider } from "../ai/index.js"
import { insertMemory } from "../db/db-service.js"

export interface StoredMemory {
  id: string
  sessionId: string
  userId: string
  type: string
  topic: string
  summary: string
  content: string
  embedding: number[]
  createdAt: string
}

const memories: StoredMemory[] = []

export function getAllStoredMemories(): StoredMemory[] {
  return [...memories]
}

export function hydrateMemories(data: StoredMemory[]): void {
  memories.length = 0
  memories.push(...data)
}

export async function extractAndStoreMemory(
  sessionId: string,
  userId: string,
  message: string,
  reply: string,
): Promise<StoredMemory> {
  const extraction = await extractMemoryMetadata(message, reply)

  const embedding = await generateEmbedding(message)

  const memory: StoredMemory = {
    id: crypto.randomUUID(),
    sessionId,
    userId,
    type: extraction.type,
    topic: extraction.topic,
    summary: extraction.summary,
    content: message,
    embedding,
    createdAt: new Date().toISOString(),
  }

  memories.push(memory)

  insertMemory({
    id: memory.id, sessionId: memory.sessionId, userId: memory.userId,
    type: memory.type, topic: memory.topic, summary: memory.summary,
    content: memory.content, embedding: memory.embedding,
    confidence: 1, createdAt: new Date(memory.createdAt),
  }).catch(() => {})

  return memory
}

export async function searchMemories(
  query: string,
  limit = 5,
): Promise<StoredMemory[]> {
  try {
    const queryEmbedding = await generateEmbedding(query)

    const scored = memories
      .map((m) => ({
        memory: m,
        score: cosineSimilarity(queryEmbedding, m.embedding),
      }))
      .filter((m) => m.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return scored.map((s) => s.memory)
  } catch {
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/)

    const scored = memories
      .map((m) => {
        const textLower = (m.topic + " " + m.summary + " " + m.content).toLowerCase()
        const matchCount = queryWords.filter((w) => textLower.includes(w)).length
        return { memory: m, score: matchCount / queryWords.length }
      })
      .filter((m) => m.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return scored.map((s) => s.memory)
  }
}

export function formatMemoriesForContext(memoriesList: StoredMemory[]): string {
  if (memoriesList.length === 0) return ""

  return memoriesList
    .map((m) => `- ${m.topic} (${m.type}): ${m.summary}`)
    .join("\n")
}

export async function getSessionMemories(sessionId: string): Promise<StoredMemory[]> {
  return memories.filter((m) => m.sessionId === sessionId)
}

export function formatSessionSummary(sessionId: string): string {
  const sessionMems = memories.filter((m) => m.sessionId === sessionId)
  if (sessionMems.length === 0) return ""

  return sessionMems
    .map((m) => `- ${m.topic}: ${m.summary}`)
    .join("\n")
}

async function extractMemoryMetadata(
  message: string,
  reply: string,
): Promise<{ type: string; topic: string; summary: string }> {
  const provider = getAIProvider()

  const response = await provider.chat([
    {
      role: "system",
      content: `Extract a single memory from this conversation exchange.
Return a JSON object with exactly these fields:
{
  "type": "learning" | "project" | "career" | "health" | "reflection" | "generic",
  "topic": "short topic label (3-6 words)",
  "summary": "one sentence summary"
}

Rules:
- type should reflect the domain of the memory
- topic should be concise and descriptive
- summary should capture what happened or was learned
- If nothing memorable was shared, return type "generic" with an appropriate topic`,
    },
    {
      role: "user",
      content: `User said: "${message}"\nWatson replied: "${reply}"`,
    },
  ])

  try {
    const cleaned = response.content
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim()

    const parsed = JSON.parse(cleaned)
    return {
      type: parsed.type ?? "generic",
      topic: parsed.topic ?? "General note",
      summary: parsed.summary ?? "No summary available",
    }
  } catch {
    return {
      type: "generic",
      topic: inferTopic(message),
      summary: message.length > 100 ? message.slice(0, 100) + "..." : message,
    }
  }
}

function inferTopic(text: string): string {
  const textLower = text.toLowerCase()

  const patterns: Array<{ keywords: string[]; topic: string }> = [
    { keywords: ["learn", "study", "read", "course", "tutorial", "understand"], topic: "Learning" },
    { keywords: ["build", "create", "develop", "implement", "deploy", "code", "project"], topic: "Project" },
    { keywords: ["work", "career", "job", "interview", "promotion", "colleague"], topic: "Career" },
    { keywords: ["gym", "run", "workout", "health", "exercise", "yoga", "meditate"], topic: "Health" },
    { keywords: ["feel", "think", "reflect", "realize", "notice", "wonder"], topic: "Reflection" },
  ]

  for (const pattern of patterns) {
    if (pattern.keywords.some((k) => textLower.includes(k))) {
      return pattern.topic
    }
  }

  return "General note"
}
