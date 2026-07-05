"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Goal } from "@/lib/api/types"
import { GoalCard } from "./goal-card"

interface GoalListProps {
  activeGoals: Goal[]
  completedGoals: Goal[]
  loading: boolean
  onAddProgress: (goalId: string, note: string, progressDelta: number) => void
  onStatusChange: (goalId: string, status: string) => void
  onDelete: (goalId: string) => void
}

type Tab = "active" | "completed"

export function GoalList({
  activeGoals,
  completedGoals,
  loading,
  onAddProgress,
  onStatusChange,
  onDelete,
}: GoalListProps) {
  const [tab, setTab] = useState<Tab>("active")

  const currentGoals = tab === "active" ? activeGoals : completedGoals

  return (
    <div>
      <div className="mb-4 flex items-center gap-1 rounded-lg border border-border/30 bg-card p-0.5">
        <button
          onClick={() => setTab("active")}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "active"
              ? "bg-primary/15 text-primary shadow-sm"
              : "text-muted-foreground/50 hover:text-muted-foreground",
          )}
        >
          Active ({activeGoals.length})
        </button>
        <button
          onClick={() => setTab("completed")}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "completed"
              ? "bg-emerald-500/15 text-emerald-400 shadow-sm"
              : "text-muted-foreground/50 hover:text-muted-foreground",
          )}
        >
          Completed ({completedGoals.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-xs text-muted-foreground/40">Loading goals...</p>
        </div>
      ) : currentGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-xs text-muted-foreground/40">
            {tab === "active"
              ? "No active goals yet. Create your first goal above."
              : "No completed goals yet. Keep working on your active goals!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {currentGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onAddProgress={onAddProgress}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
