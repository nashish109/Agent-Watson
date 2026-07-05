"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Goal } from "@/lib/api/types"

interface GoalCardProps {
  goal: Goal
  onAddProgress: (goalId: string, note: string, progressDelta: number) => void
  onStatusChange: (goalId: string, status: string) => void
  onDelete: (goalId: string) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  learning: "border-blue-500/20 bg-blue-500/5",
  project: "border-violet-500/20 bg-violet-500/5",
  career: "border-emerald-500/20 bg-emerald-500/5",
  health: "border-rose-500/20 bg-rose-500/5",
  reflection: "border-amber-500/20 bg-amber-500/5",
  generic: "border-border/40 bg-card",
}

const CATEGORY_DOTS: Record<string, string> = {
  learning: "bg-blue-400",
  project: "bg-violet-400",
  career: "bg-emerald-400",
  health: "bg-rose-400",
  reflection: "bg-amber-400",
  generic: "bg-muted-foreground/40",
}

export function GoalCard({ goal, onAddProgress, onStatusChange, onDelete }: GoalCardProps) {
  const [showProgressInput, setShowProgressInput] = useState(false)
  const [progressNote, setProgressNote] = useState("")
  const [progressAmount, setProgressAmount] = useState(10)

  const colorClass = CATEGORY_COLORS[goal.category] ?? CATEGORY_COLORS.generic
  const dotClass = CATEGORY_DOTS[goal.category] ?? CATEGORY_DOTS.generic

  const handleSubmitProgress = () => {
    if (!progressNote.trim()) return
    onAddProgress(goal.id, progressNote, progressAmount)
    setProgressNote("")
    setShowProgressInput(false)
  }

  const isActive = goal.status === "active"
  const isCompleted = goal.status === "completed"

  return (
    <div className={cn("rounded-xl border px-4 py-3.5 transition-colors", colorClass)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
            <h4 className={cn("text-sm font-medium", isCompleted && "line-through text-muted-foreground/50")}>
              {goal.title}
            </h4>
          </div>
          {goal.description && (
            <p className="mt-1 text-xs text-muted-foreground/60 line-clamp-2">{goal.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground/40">{goal.category}</span>
            <span className="text-[10px] text-muted-foreground/30">|</span>
            <span className="text-[10px] text-muted-foreground/40">{goal.progress}%</span>
          </div>
        </div>

        {isActive && (
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => setShowProgressInput(!showProgressInput)}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-primary/70 transition-colors hover:bg-primary/10"
            >
              Log
            </button>
            <button
              onClick={() => onStatusChange(goal.id, "completed")}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-emerald-400/60 transition-colors hover:bg-emerald-500/10"
            >
              Done
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-rose-400/50 transition-colors hover:bg-rose-500/10"
            >
              X
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-border/30">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isCompleted ? "bg-emerald-400/60" : "bg-primary/40",
          )}
          style={{ width: `${goal.progress}%` }}
        />
      </div>

      {/* Progress input */}
      {showProgressInput && isActive && (
        <div className="mt-3 animate-fade-in space-y-2 border-t border-border/20 pt-3">
          <div className="flex items-center gap-2">
            <input
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              placeholder="What did you do?"
              className="min-w-0 flex-1 rounded-lg border border-border/40 bg-card px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none"
            />
            <input
              type="number"
              value={progressAmount}
              onChange={(e) => setProgressAmount(Number(e.target.value))}
              min={1}
              max={100}
              className="w-14 rounded-lg border border-border/40 bg-card px-2 py-1.5 text-xs text-foreground text-center focus:border-primary/40 focus:outline-none"
            />
            <span className="text-[10px] text-muted-foreground/40">%</span>
          </div>
          <div className="flex gap-1.5">
            {[5, 10, 25, 50].map((amount) => (
              <button
                key={amount}
                onClick={() => setProgressAmount(amount)}
                className={cn(
                  "rounded-md px-2 py-1 text-[10px] transition-colors",
                  progressAmount === amount
                    ? "bg-primary/20 text-primary"
                    : "bg-card text-muted-foreground/50 border border-border/30 hover:border-border/60",
                )}
              >
                +{amount}%
              </button>
            ))}
            <button
              onClick={handleSubmitProgress}
              disabled={!progressNote.trim()}
              className="ml-auto rounded-lg bg-primary/20 px-3 py-1 text-[10px] font-medium text-primary transition-colors hover:bg-primary/30 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
