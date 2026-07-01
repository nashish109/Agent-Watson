"use client"

import { useState, useCallback, useRef } from "react"
import type {
  Session,
  TimelineItem,
  BridgeSession,
  BridgeContribution,
  BridgeMemory,
  BridgeReflection,
  BridgeRelationship,
  BridgeQueryResponse,
  BridgeQueryItem,
  BridgeReflectResponse,
} from "@/data/memories"
import { buildSessionTitle } from "@/data/memories"

// ---------------------------------------------------------------------------
// Types for the API
// ---------------------------------------------------------------------------

interface BridgeResponse {
  ok: boolean
  error?: string
  intent?: string
  intent_confidence?: number
  response?: string | null
  session?: BridgeSession
  contribution?: BridgeContribution
  memories?: BridgeMemory[]
  reflections?: BridgeReflection[]
  relationships?: BridgeRelationship[]
  concepts?: string[]
  connections?: string[]
  summary?: string
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current

    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "create_session" }),
    })

    const data: BridgeResponse = await res.json()
    if (!data.ok || !data.session) {
      throw new Error(data.error ?? "Failed to create session")
    }

    sessionIdRef.current = data.session.id

    setSession({
      id: data.session.id,
      title: buildSessionTitle(new Date(data.session.session_date)),
      date: new Date(data.session.session_date),
      items: [],
      summary: null,
    })

    return data.session.id
  }, [])

  const contribute = useCallback(
    async (text: string): Promise<TimelineItem[]> => {
      const sessionId = await ensureSession()

      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: "contribute", session_id: sessionId, text }),
      })

      const data: BridgeResponse = await res.json()
      if (!data.ok) {
        throw new Error(data.error ?? "Contribution failed")
      }

      const contributionId = data.contribution!.id
      const items: TimelineItem[] = []

      // 1. Contribution
      items.push({
        id: contributionId,
        type: "contribution",
        content: data.contribution!.text,
        createdAt: new Date(data.contribution!.timestamp),
      })

      // 2. Conversational response (for Question intents and similar)
      if (data.response) {
        items.push({
          id: `response-${contributionId}`,
          type: "response",
          content: data.response,
          createdAt: new Date(),
        })
      }

      // Bridge returns memories/reflections either as arrays or (in the session
      // object) as properly serialised JSON. Use the session data when the
      // top-level fields are not usable arrays.
      const sessionMemories = data.session?.memories ?? []
      const sessionReflections = data.session?.reflections ?? []

      const isStr = (v: unknown): v is string => typeof v === "string"

      const memories: BridgeMemory[] = isStr(data.memories)
        ? sessionMemories.filter((m: BridgeMemory) => m.contribution_id === contributionId)
        : (data.memories ?? sessionMemories)

      const reflections: BridgeReflection[] = isStr(data.reflections)
        ? sessionReflections.filter((r: BridgeReflection) =>
            memories.some((m) => m.id === r.memory_id),
          )
        : (data.reflections ?? sessionReflections)

      // 3. Memories
      for (const m of memories) {
        items.push({
          id: m.id,
          type: "memory",
          content: m.summary,
          topic: m.topic,
          memoryType: m.display_label ?? m.type,
          displayLabel: m.display_label,
          createdAt: new Date(m.created_at),
        })
      }

      // 4. Reflections
      for (const r of reflections) {
        items.push({
          id: r.id,
          type: "reflection",
          content: r.text,
          relatedTo: r.related_to?.length ? r.related_to : undefined,
          concepts: data.concepts?.length ? data.concepts : undefined,
          connections: data.connections?.length ? data.connections : undefined,
          createdAt: new Date(r.created_at),
        })
      }

      setSession((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: [...prev.items, ...items],
        }
      })

      return items
    },
    [ensureSession],
  )

  const getSession = useCallback((): Session | null => {
    return session
  }, [session])

  const query = useCallback(
    async (text: string): Promise<BridgeQueryItem[]> => {
      const sessionId = await ensureSession()

      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: "query", session_id: sessionId, text }),
      })

      const data: BridgeQueryResponse = await res.json()
      if (!data.ok) {
        throw new Error(data.error ?? "Query failed")
      }

      return data.items ?? []
    },
    [ensureSession],
  )

  const reflect = useCallback(async () => {
    const sessionId = await ensureSession()

    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: "reflect", session_id: sessionId }),
    })

    const data: BridgeReflectResponse = await res.json()
    if (!data.ok) {
      throw new Error(data.error ?? "Reflect failed")
    }

    return {
      primary_focus: data.primary_focus,
      topics_explored: data.topics_explored,
      progress: data.progress,
      strongest_connections: data.strongest_connections,
      reflection: data.reflection,
    }
  }, [ensureSession])

  return { session, contribute, query, reflect, getSession }
}
