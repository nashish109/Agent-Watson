import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { chat, reflect } from "../services/conversation.js"
import {
  extractAndStoreMemory,
  searchMemories,
  getSessionMemories,
  formatMemoriesForContext,
  formatSessionSummary,
} from "../services/memory.js"
import { getInsightsForMemories, formatInsightsForContext } from "../services/insights.js"
import { findRelatedGoals, formatGoalsForContext } from "../services/goals.js"
import { extractAndStoreConcepts, getRelatedConcepts, formatConceptsForContext } from "../services/concepts.js"
import { insertSession, insertMessage, getSessionMessages } from "../db/db-service.js"

interface SessionData {
  id: string
  userId: string
  sessionDate: string
  mode: string
  startedAt: string
  endedAt?: string
  summary?: string
  messages: Array<{ role: string; content: string }>
}

const sessions = new Map<string, SessionData>()

export async function chatRoutes(app: FastifyInstance) {
  app.post("/api/chat", async (request) => {
    const body = z.object({
      sessionId: z.string(),
      message: z.string().min(1),
      userId: z.string().default("default"),
    }).parse(request.body)

    let session = sessions.get(body.sessionId)
    if (!session) {
      session = {
        id: body.sessionId,
        userId: body.userId,
        sessionDate: new Date().toISOString().slice(0, 10),
        mode: "focus",
        startedAt: new Date().toISOString(),
        messages: [],
      }
      sessions.set(body.sessionId, session)

      insertSession({
        id: session.id, userId: session.userId,
        sessionDate: session.sessionDate, title: null,
        mode: session.mode,
        startedAt: new Date(session.startedAt),
        endedAt: null, summary: null,
      }).catch(() => {})
    }

    session.messages.push({ role: "user", content: body.message })
    insertMessage({
      id: crypto.randomUUID(),
      sessionId: body.sessionId,
      userId: body.userId,
      role: "user",
      content: body.message,
      createdAt: new Date(),
    }).catch(() => {})

    const relevantMemories = await searchMemories(body.message, 5)
    const memoriesContext = formatMemoriesForContext(relevantMemories)
    const sessionSummary = formatSessionSummary(body.sessionId)

    const relatedGoals = findRelatedGoals(body.message, body.userId)
    const goalsContext = formatGoalsForContext(relatedGoals)

    const extractedConcepts = await extractAndStoreConcepts(body.message, body.sessionId, body.userId)
    const relatedConcepts = getRelatedConcepts(body.message)
    const conceptsContext = formatConceptsForContext(relatedConcepts)

    const reply = await chat(body.message, {
      memories: memoriesContext,
      sessionSummary,
      goals: goalsContext,
      concepts: conceptsContext,
    })

    session.messages.push({ role: "assistant", content: reply })
    insertMessage({
      id: crypto.randomUUID(),
      sessionId: body.sessionId,
      userId: body.userId,
      role: "assistant",
      content: reply,
      createdAt: new Date(),
    }).catch(() => {})

    const storedMemory = await extractAndStoreMemory(
      body.sessionId,
      body.userId,
      body.message,
      reply,
    )

    const relatedInsights = getInsightsForMemories([storedMemory.id])

    return {
      reply,
      memories: [
        {
          id: storedMemory.id,
          type: storedMemory.type,
          topic: storedMemory.topic,
          summary: storedMemory.summary,
          content: storedMemory.content,
          confidence: 1,
          createdAt: storedMemory.createdAt,
        },
      ],
      insights: relatedInsights.map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        description: i.description,
        category: i.category,
        strength: i.strength,
        relatedMemoryIds: i.relatedMemoryIds,
        createdAt: i.createdAt,
      })),
      reflections: [],
    }
  })

  app.post<{ Params: { id: string } }>("/api/sessions/:id/reflect", async (request) => {
    const body = z.object({ userId: z.string().default("default") }).parse(request.body)
    const session = sessions.get(request.params.id)

    if (!session || session.messages.length === 0) {
      return {
        primary_focus: "Generic",
        topics_explored: [],
        progress: {},
        strongest_connections: [],
        reflection: "Share something with Watson to generate a reflection.",
      }
    }

    const userMessages = session.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n")

    const sessionMems = await getSessionMemories(request.params.id)
    const sessionSummary = formatSessionSummary(request.params.id)
    const sessionMemoryIds = sessionMems.map((m) => m.id)
    const relatedInsights = getInsightsForMemories(sessionMemoryIds)
    const insightsContext = formatInsightsForContext(relatedInsights)

    const reflectionText = await reflect(userMessages, sessionSummary, insightsContext)

    return {
      primary_focus: "Mixed",
      topics_explored: sessionMems.map((m) => m.topic),
      progress: {
        [sessionMems[0]?.type ?? "Notes"]: sessionMems.map((m) => `${m.topic}: ${m.summary}`),
      },
      strongest_connections: relatedInsights.map((i) => i.title),
      reflection: reflectionText,
    }
  })
}

export async function hydrateSessionMessages(data: Array<{
  sessionId: string
  userId: string
  role: string
  content: string
  createdAt: string
}>): Promise<void> {
  for (const msg of data) {
    let session = sessions.get(msg.sessionId)
    if (!session) {
      session = {
        id: msg.sessionId,
        userId: msg.userId,
        sessionDate: new Date(msg.createdAt).toISOString().slice(0, 10),
        mode: "focus",
        startedAt: msg.createdAt,
        messages: [],
      }
      sessions.set(msg.sessionId, session)
    }
    session.messages.push({ role: msg.role, content: msg.content })
  }
}
