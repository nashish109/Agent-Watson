"use client"

import { useInsights } from "@/hooks/use-insights"
import { cn } from "@/lib/utils"
import { useState } from "react"

const INSIGHT_ICONS: Record<string, string> = {
  pattern: "border-blue-400/20 bg-blue-500/5",
  trend: "border-violet-400/20 bg-violet-500/5",
  observation: "border-emerald-400/20 bg-emerald-500/5",
  milestone: "border-amber-400/20 bg-amber-500/5",
  suggestion: "border-rose-400/20 bg-rose-500/5",
}

const INSIGHT_DOTS: Record<string, string> = {
  pattern: "bg-blue-400",
  trend: "bg-violet-400",
  observation: "bg-emerald-400",
  milestone: "bg-amber-400",
  suggestion: "bg-rose-400",
}

const CATEGORY_LABELS: Record<string, string> = {
  learning: "Learning",
  project: "Project",
  career: "Career",
  health: "Health",
  reflection: "Reflection",
  generic: "General",
}

export function InsightsPage() {
  const { insights, loading, generating, error, generate } = useInsights()
  const [message, setMessage] = useState<string | null>(null)

  const handleGenerate = async () => {
    setMessage(null)
    const msg = await generate()
    if (msg) setMessage(msg)
  }

  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Insights</h2>
          <p className="mt-0.5 text-xs text-muted-foreground/50">
            Patterns and trends from your conversations
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg bg-primary/15 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate Insights"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-400">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-400/70">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-xs text-muted-foreground/40">Loading insights...</p>
        </div>
      ) : insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-xs text-muted-foreground/40">
            No insights yet. Start a conversation, then generate insights to see patterns emerge.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={cn(
                "rounded-xl border px-4 py-3.5",
                INSIGHT_ICONS[insight.type] ?? "border-border/30 bg-card",
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  "mt-1 h-2 w-2 shrink-0 rounded-full",
                  INSIGHT_DOTS[insight.type] ?? "bg-muted-foreground/30",
                )} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-foreground">{insight.title}</h4>
                    <span className="rounded-full border border-border/20 px-2 py-0.5 text-[10px] text-muted-foreground/50">
                      {CATEGORY_LABELS[insight.category] ?? insight.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground/30">
                      {(insight.strength * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground/60 leading-relaxed">
                    {insight.description}
                  </p>
                  <p className="mt-1.5 text-[10px] text-muted-foreground/30">
                    {new Date(insight.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
