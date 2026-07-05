"use client"

import { useState, useCallback, useEffect } from "react"
import type { Insight } from "@/lib/api/types"
import * as api from "@/lib/api/api"

export function useInsights() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getInsights()
      setInsights(data.insights ?? [])
    } catch {
      setError("Failed to load insights")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const generate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const data = await api.generateInsights()
      if (data.insights) {
        setInsights((prev) => [...data.insights, ...prev])
      }
      return data.message ?? null
    } catch {
      setError("Failed to generate insights")
      return null
    } finally {
      setGenerating(false)
    }
  }, [])

  return {
    insights,
    loading,
    generating,
    error,
    generate,
    refresh: fetchInsights,
  }
}
