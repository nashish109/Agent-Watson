"use client"

import { Lightbulb, Target, Eye, ArrowRight, RefreshCw } from "lucide-react"
import { useInsights } from "@/hooks/use-insights"
import { EmptyState } from "./ui/empty-state"

export function InsightsPage() {
  const { briefing, loading, generating, error, message, generate } = useInsights()

  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Briefing</h2>
          <p className="mt-0.5 text-xs text-muted-foreground/50">
            Your daily executive summary
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Generating..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <RefreshCw className="mx-auto h-5 w-5 animate-spin text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/40">Analyzing your patterns...</p>
          </div>
        </div>
      ) : message && !briefing ? (
        <EmptyState
          icon={Lightbulb}
          title="Not enough data yet"
          description={message}
          action={{ label: "Start a conversation", onClick: () => {} }}
        />
      ) : briefing ? (
        <div className="space-y-4 animate-fade-in">
          {/* Today's Summary */}
          <div className="rounded-xl border border-border/30 bg-card px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                <Lightbulb className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                Today&apos;s Summary
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/85">
              {briefing.todaySummary}
            </p>
          </div>

          {/* Key Insight */}
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15">
                <Target className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/60">
                Key Insight
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/85">
              {briefing.keyInsight}
            </p>
          </div>

          {/* Recommendation */}
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15">
                <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/60">
                Recommendation
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/85">
              {briefing.recommendation}
            </p>
          </div>

          {/* Watch For (optional) */}
          {briefing.watchFor && (
            <div className="rounded-xl border border-violet-400/15 bg-violet-500/5 px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/15">
                  <Eye className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/60">
                  Watch For
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground/85">
                {briefing.watchFor}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
