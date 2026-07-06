"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type {
  Session,
  TimelineItem,
} from "@/data/memories"
import { buildSessionTitle } from "@/data/memories"
import * as api from "@/lib/api/api"

const USER_ID = "default"
const STORAGE_KEY = "watson_session_id"

export function useSession(workspaceId?: string) {
  const [session, setSession] = useState<Session | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const wsRef = useRef(workspaceId)
  wsRef.current = workspaceId

  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY)
    if (storedId) {
      sessionIdRef.current = storedId
      Promise.all([
        api.getSession(storedId),
        api.getSessionMessages(storedId),
      ]).then(([s, msgRes]) => {
        const items: TimelineItem[] = msgRes.messages.map((m, i) => ({
          id: `msg-${i}`,
          type: m.role === "user" ? "contribution" as const : "response" as const,
          content: m.content,
          createdAt: new Date(m.createdAt),
        }))
        setSession({
          id: s.id,
          title: buildSessionTitle(new Date(s.sessionDate)),
          date: new Date(s.sessionDate),
          items,
          summary: s.summary ?? null,
        })
      }).catch(() => {
        localStorage.removeItem(STORAGE_KEY)
        sessionIdRef.current = null
      })
    }
  }, [workspaceId])

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current

    const s = await api.createSession(USER_ID)
    sessionIdRef.current = s.id
    localStorage.setItem(STORAGE_KEY, s.id)

    setSession({
      id: s.id,
      title: buildSessionTitle(new Date(s.sessionDate)),
      date: new Date(s.sessionDate),
      items: [],
      summary: s.summary ?? null,
    })

    return s.id
  }, [])

  const contribute = useCallback(
    async (text: string): Promise<TimelineItem[]> => {
      const sessionId = await ensureSession()

      const data = await api.chat(sessionId, text, USER_ID)

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const now = new Date()

      const userItem: TimelineItem = {
        id: `user-${id}`,
        type: "contribution",
        content: text,
        createdAt: now,
      }

      const watsonItem: TimelineItem = {
        id: `watson-${id}`,
        type: "response",
        content: data.reply,
        createdAt: now,
      }

      const items = [userItem, watsonItem]

      setSession((prev) => {
        if (!prev) return prev
        const existingIds = new Set(prev.items.map(i => i.id))
        const newItems = items.filter(i => !existingIds.has(i.id))
        if (newItems.length === 0) return prev
        return { ...prev, items: [...prev.items, ...newItems] }
      })

      return items
    },
    [ensureSession],
  )

  const getSession = useCallback((): Session | null => {
    return session
  }, [session])

  const query = useCallback(
    async (text: string) => {
      await ensureSession()
      const result = await api.getContext(text, USER_ID)
      return result.items.map((item) => ({
        type: item.type,
        id: item.id,
        label: item.label,
        summary: item.summary,
        score: item.score,
        session_id: item.session_id,
        session_date: item.session_date,
        memory_type: item.memory_type,
        matched_terms: item.matched_terms,
      }))
    },
    [ensureSession],
  )

  const reflect = useCallback(async () => {
    await ensureSession()
    const sid = sessionIdRef.current!
    const summary = await api.getReflection(sid, USER_ID)
    return {
      primary_focus: summary.primary_focus,
      topics_explored: summary.topics_explored,
      progress: summary.progress,
      strongest_connections: summary.strongest_connections,
      reflection: summary.reflection,
    }
  }, [ensureSession])

  const loadSession = useCallback(async (sessionId: string) => {
    sessionIdRef.current = sessionId
    localStorage.setItem(STORAGE_KEY, sessionId)
    const [s, msgRes] = await Promise.all([
      api.getSession(sessionId),
      api.getSessionMessages(sessionId),
    ])
    const items: TimelineItem[] = msgRes.messages.map((m, i) => ({
      id: `msg-${i}`,
      type: m.role === "user" ? "contribution" as const : "response" as const,
      content: m.content,
      createdAt: new Date(m.createdAt),
    }))
    setSession({
      id: s.id,
      title: buildSessionTitle(new Date(s.sessionDate)),
      date: new Date(s.sessionDate),
      items,
      summary: s.summary ?? null,
    })
  }, [])

  const startNewSession = useCallback(async (): Promise<string> => {
    const s = await api.createSession(USER_ID)
    sessionIdRef.current = s.id
    localStorage.setItem(STORAGE_KEY, s.id)
    setSession({
      id: s.id,
      title: buildSessionTitle(new Date(s.sessionDate)),
      date: new Date(s.sessionDate),
      items: [],
      summary: s.summary ?? null,
    })
    return s.id
  }, [])

  const clearSession = useCallback(() => {
    sessionIdRef.current = null
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }, [])

  return {
    session,
    contribute,
    query,
    reflect,
    getSession,
    loadSession,
    startNewSession,
    clearSession,
  }
}
