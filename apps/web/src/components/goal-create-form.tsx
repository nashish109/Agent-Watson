"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  { value: "learning", label: "Learning" },
  { value: "project", label: "Project" },
  { value: "career", label: "Career" },
  { value: "health", label: "Health" },
  { value: "reflection", label: "Reflection" },
  { value: "generic", label: "General" },
]

interface GoalCreateFormProps {
  onSubmit: (data: { title: string; description: string; category: string }) => void
  onCancel: () => void
}

export function GoalCreateForm({ onSubmit, onCancel }: GoalCreateFormProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("generic")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onSubmit({ title: trimmed, description: description.trim(), category })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-in rounded-xl border border-primary/20 bg-primary/5 p-5"
    >
      <h3 className="mb-4 text-sm font-medium text-foreground">New Goal</h3>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you want to achieve?"
            className="w-full rounded-lg border border-border/40 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details..."
            rows={2}
            className="w-full rounded-lg border border-border/40 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
            Category
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] transition-colors",
                  category === cat.value
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-card border border-border/30 text-muted-foreground/60 hover:border-border/60",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          Create Goal
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-xs font-medium text-muted-foreground/60 transition-colors hover:bg-accent hover:text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
