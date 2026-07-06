"use client"

import { useState, useCallback, useEffect } from "react"
import type { Briefing } from "@/lib/api/types"
import * as api from "@/lib/api/api"

export function useInsights() {
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const generate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    setMessage(null)
    try {
      const data = await api.generateInsights()
      if (data.briefing) {
        setBriefing(data.briefing)
      }
      if (data.message) {
        setMessage(data.message)
      }
      return data.message ?? null
    } catch {
      setError("Failed to generate briefing")
      return null
    } finally {
      setGenerating(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    api.generateInsights().then((data) => {
      if (data.briefing) {
        setBriefing(data.briefing)
      }
      if (data.message) {
        setMessage(data.message)
      }
    }).catch(() => {
      setError("Failed to load insights")
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  return {
    briefing,
    loading,
    generating,
    error,
    message,
    generate,
  }
}
