"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type {
  Session,
  TimelineItem,
  BridgeQueryItem,
} from "@/data/memories"
import { buildSessionTitle } from "@/data/memories"
import * as api from "@/lib/api/api"
import { ApiConnectionError } from "@/lib/api/errors"
import type { ContributeResponse } from "@/lib/api/types"

const USER_ID = "default"
const STORAGE_KEY = "watson_session_id"

export function useSession(workspaceId?: string) {
  const [session, setSession] = useState<Session | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const wsRef = useRef(workspaceId)
  wsRef.current = workspaceId

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY)
    if (storedId) {
      sessionIdRef.current = storedId
      api.getSession(storedId, USER_ID).then((s) => {
        if (s) {
          setSession({
            id: s.id,
            title: buildSessionTitle(new Date(s.session_date)),
            date: new Date(s.session_date),
            items: [],
            summary: s.summary ?? null,
          })
        }
      }).catch(() => {
        localStorage.removeItem(STORAGE_KEY)
        sessionIdRef.current = null
      })
    }
  }, [workspaceId])

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current

    const s = await api.createSession(USER_ID, wsRef.current)
    sessionIdRef.current = s.id
    localStorage.setItem(STORAGE_KEY, s.id)

    setSession({
      id: s.id,
      title: buildSessionTitle(new Date(s.session_date)),
      date: new Date(s.session_date),
      items: [],
      summary: s.summary ?? null,
    })

    return s.id
  }, [])

  const contribute = useCallback(
    async (text: string): Promise<TimelineItem[]> => {
      const sessionId = await ensureSession()

      const data: ContributeResponse = await api.contribute(
        sessionId,
        USER_ID,
        text,
      )

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const now = new Date()

      const items: TimelineItem[] = [
        {
          id: `user-${id}`,
          type: "contribution",
          content: text,
          createdAt: now,
        },
        {
          id: `watson-${id}`,
          type: "response",
          content: data.reply,
          createdAt: now,
        },
      ]

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
    async (text: string): Promise<BridgeQueryItem[]> => {
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
    try {
      const summary = await api.getReflection(sid, USER_ID)
      return {
        primary_focus: summary!.primary_focus,
        topics_explored: summary!.topics_explored,
        progress: summary!.progress,
        strongest_connections: summary!.strongest_connections,
        reflection: summary!.reflection,
      }
    } catch (err: unknown) {
      if (err instanceof ApiConnectionError) throw err
      return {
        primary_focus: "Unknown",
        topics_explored: [],
        progress: {},
        strongest_connections: [],
        reflection: "Submit more contributions to generate a reflection.",
      }
    }
  }, [ensureSession])

  const loadSession = useCallback(async (sessionId: string) => {
    sessionIdRef.current = sessionId
    localStorage.setItem(STORAGE_KEY, sessionId)
    const s = await api.getSession(sessionId, USER_ID)
    if (s) {
      setSession({
        id: s.id,
        title: buildSessionTitle(new Date(s.session_date)),
        date: new Date(s.session_date),
        items: [],
        summary: s.summary ?? null,
      })
    }
  }, [])

  const clearSession = useCallback(() => {
    sessionIdRef.current = null
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }, [])

  return { session, contribute, query, reflect, getSession, loadSession, clearSession }
}
