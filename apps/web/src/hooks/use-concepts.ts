"use client"

import { useState, useCallback, useEffect } from "react"
import type { Concept, ConceptEdge } from "@/lib/api/types"
import * as api from "@/lib/api/api"

export function useConcepts() {
  const [concepts, setConcepts] = useState<Concept[]>([])
  const [edges, setEdges] = useState<ConceptEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGraph = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getConceptGraph()
      setConcepts(data.concepts)
      setEdges(data.edges)
    } catch {
      setError("Failed to load concept graph")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  return {
    concepts,
    edges,
    loading,
    error,
    refresh: fetchGraph,
  }
}
