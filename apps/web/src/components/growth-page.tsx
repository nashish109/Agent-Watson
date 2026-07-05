"use client"

import { useState } from "react"
import { useGoals } from "@/hooks/use-goals"
import { GoalCreateForm } from "./goal-create-form"
import { GoalList } from "./goal-list"

export function GrowthPage() {
  const {
    activeGoals,
    completedGoals,
    loading,
    error,
    createGoal,
    addProgress,
    updateGoal,
    deleteGoal,
  } = useGoals()

  const [showCreateForm, setShowCreateForm] = useState(false)

  const handleCreateGoal = async (data: { title: string; description: string; category: string }) => {
    await createGoal(data)
    setShowCreateForm(false)
  }

  const avgProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length)
    : 0

  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Goals</h2>
          <p className="mt-0.5 text-xs text-muted-foreground/50">
            Track what matters, celebrate progress
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-lg bg-primary/15 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
        >
          {showCreateForm ? "Cancel" : "+ New Goal"}
        </button>
      </div>

      {!loading && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border/30 bg-card px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40">Active</p>
            <p className="mt-0.5 text-lg font-semibold text-foreground">{activeGoals.length}</p>
          </div>
          <div className="rounded-xl border border-border/30 bg-card px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40">Completed</p>
            <p className="mt-0.5 text-lg font-semibold text-emerald-400">{completedGoals.length}</p>
          </div>
          <div className="rounded-xl border border-border/30 bg-card px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40">Avg Progress</p>
            <p className="mt-0.5 text-lg font-semibold text-foreground">{avgProgress}%</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-400">
          {error}
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6">
          <GoalCreateForm
            onSubmit={handleCreateGoal}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      <GoalList
        activeGoals={activeGoals}
        completedGoals={completedGoals}
        loading={loading}
        onAddProgress={(goalId, note, progressDelta) => addProgress(goalId, note, progressDelta)}
        onStatusChange={(goalId, status) => updateGoal(goalId, { status })}
        onDelete={(goalId) => deleteGoal(goalId)}
      />
    </div>
  )
}
