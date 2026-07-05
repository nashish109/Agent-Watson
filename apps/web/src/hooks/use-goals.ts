"use client"

import { useState, useCallback, useEffect } from "react"
import type { Goal, GoalProgressUpdate, CreateGoalRequest } from "@/lib/api/types"
import * as api from "@/lib/api/api"

const USER_ID = "default"

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getGoals(USER_ID)
      setGoals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const createGoal = useCallback(async (req: CreateGoalRequest) => {
    setError(null)
    try {
      const goal = await api.createGoal(req, USER_ID)
      setGoals((prev) => [goal, ...prev])
      return goal
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create goal")
      return null
    }
  }, [])

  const updateGoal = useCallback(async (goalId: string, updates: Record<string, unknown>) => {
    setError(null)
    try {
      const updated = await api.updateGoal(goalId, updates)
      setGoals((prev) => prev.map((g) => (g.id === goalId ? updated : g)))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update goal")
      return null
    }
  }, [])

  const addProgress = useCallback(async (goalId: string, note: string, progressDelta: number) => {
    setError(null)
    try {
      const entry = await api.addGoalProgress(goalId, { note, progressDelta })
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goalId) return g
          const newProgress = Math.min(100, Math.max(0, g.progress + progressDelta))
          const newStatus = newProgress >= 100 ? "completed" : g.status
          return { ...g, progress: newProgress, status: newStatus }
        }),
      )
      return entry
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add progress")
      return null
    }
  }, [])

  const deleteGoal = useCallback(async (goalId: string) => {
    setError(null)
    try {
      await api.deleteGoal(goalId)
      setGoals((prev) => prev.filter((g) => g.id !== goalId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete goal")
    }
  }, [])

  const activeGoals = goals.filter((g) => g.status === "active")
  const completedGoals = goals.filter((g) => g.status === "completed")
  const abandonedGoals = goals.filter((g) => g.status === "abandoned")

  return {
    goals,
    activeGoals,
    completedGoals,
    abandonedGoals,
    loading,
    error,
    createGoal,
    updateGoal,
    addProgress,
    deleteGoal,
    refresh: fetchGoals,
  }
}
