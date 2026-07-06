import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { insertSession, getSessionMessages, getSessionById } from "../db/db-service.js"

interface SessionData {
  id: string
  userId: string
  sessionDate: string
  title?: string
  mode: string
  startedAt: string
  endedAt?: string
  summary?: string
}

const sessions = new Map<string, SessionData>()

export function getAllSessions(): SessionData[] {
  return Array.from(sessions.values())
}

export function hydrateSessions(data: SessionData[]): void {
  sessions.clear()
  for (const s of data) sessions.set(s.id, s)
}

export async function sessionRoutes(app: FastifyInstance) {
  app.post("/api/sessions", async (request) => {
    const body = z.object({ userId: z.string().default("default") }).parse(request.body)

    const session: SessionData = {
      id: crypto.randomUUID(),
      userId: body.userId,
      sessionDate: new Date().toISOString().slice(0, 10),
      mode: "focus",
      startedAt: new Date().toISOString(),
    }

    sessions.set(session.id, session)

    insertSession({
      id: session.id,
      userId: session.userId,
      sessionDate: session.sessionDate,
      title: session.title ?? null,
      mode: session.mode,
      startedAt: new Date(session.startedAt),
      endedAt: null,
      summary: session.summary ?? null,
    }).catch(() => {})

    return {
      id: session.id,
      sessionDate: session.sessionDate,
      mode: session.mode,
      startedAt: session.startedAt,
    }
  })

  app.get<{ Params: { id: string } }>("/api/sessions/:id", async (request) => {
    const id = request.params.id
    let session = sessions.get(id)
    if (!session) {
      const dbSession = await getSessionById(id)
      if (!dbSession) {
        return { ok: false, error: "Session not found" }
      }
      sessions.set(id, {
        id: dbSession.id,
        userId: dbSession.userId,
        sessionDate: dbSession.sessionDate,
        title: dbSession.title,
        mode: dbSession.mode,
        startedAt: dbSession.startedAt instanceof Date ? dbSession.startedAt.toISOString() : String(dbSession.startedAt),
        endedAt: dbSession.endedAt ? (dbSession.endedAt instanceof Date ? dbSession.endedAt.toISOString() : String(dbSession.endedAt)) : undefined,
        summary: dbSession.summary,
      })
      session = sessions.get(id)!
    }
    return {
      id: session.id,
      sessionDate: session.sessionDate,
      title: session.title,
      mode: session.mode,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      summary: session.summary,
    }
  })

  app.get<{ Params: { id: string } }>("/api/sessions/:id/messages", async (request) => {
    const dbMessages = await getSessionMessages(request.params.id)
    const messages = dbMessages.map((m: any) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : String(m.createdAt),
    }))
    return { ok: true, messages }
  })
}
