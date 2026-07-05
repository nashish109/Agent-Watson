"use client"

import { cn } from "@/lib/utils"
import type { TimelineItem } from "@/data/memories"

const TYPE_LABELS: Record<string, { label: string; dot: string; text: string }> = {
  contribution: { label: "You", dot: "bg-muted-foreground/30", text: "text-muted-foreground/40" },
  response: { label: "Watson", dot: "bg-primary/60", text: "text-primary/80" },
  memory: { label: "Saved", dot: "bg-amber-400/50", text: "text-amber-400/60" },
  reflection: { label: "Thought", dot: "bg-primary/40", text: "text-primary/60" },
  coach: { label: "Coach", dot: "bg-emerald-400/50", text: "text-emerald-400/70" },
}

interface MemoryCardProps {
  item: TimelineItem
}

export function MemoryCard({ item }: MemoryCardProps) {
  const meta = TYPE_LABELS[item.type] ?? { label: "Entry", dot: "bg-muted-foreground/30", text: "text-muted-foreground/40" }

  return (
    <div
      className={cn(
        "animate-fade-in rounded-xl border px-5 py-4 text-sm leading-relaxed transition-colors",
        item.type === "contribution"
          ? "border-border/40 bg-card text-foreground"
          : item.type === "response"
            ? "border-primary/20 bg-primary/5 text-foreground"
            : item.type === "reflection"
              ? "border-primary/10 bg-card/60 text-foreground/85"
              : "border-border/30 bg-card/50 text-foreground/90",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} aria-hidden="true" />
        <span className={cn("text-[11px] font-medium uppercase tracking-[0.08em]", meta.text)}>
          {item.type === "memory" ? (item.displayLabel ?? item.memoryType ?? "Saved") : meta.label}
        </span>
      </div>

      <p>{item.content}</p>

      {item.type === "reflection" && item.relatedTo && item.relatedTo.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/40">
            Related to
          </span>
          {item.relatedTo.map((label) => (
            <span
              key={label}
              className="rounded-full border border-primary/10 bg-primary/5 px-2 py-0.5 text-[11px] text-primary/70"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {item.type === "reflection" && item.concepts && item.concepts.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/40">
            Topics
          </span>
          {item.concepts.map((name) => (
            <span
              key={name}
              className="rounded-full border border-indigo-500/10 bg-indigo-500/5 px-2 py-0.5 text-[11px] text-indigo-400/80"
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {item.type === "reflection" && item.connections && item.connections.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/40">
            Related
          </span>
          {item.connections.map((conn) => (
            <span
              key={conn}
              className="text-[11px] text-muted-foreground/60"
            >
              {conn}
            </span>
          ))}
        </div>
      )}

      {item.type === "memory" && item.topic && (
        <p className="mt-2 text-[11px] italic text-amber-400/40">
          {item.topic}
        </p>
      )}

      <p
        className={cn(
          "mt-1.5 text-[10px]",
          item.type === "contribution"
            ? "text-muted-foreground/20"
            : "text-muted-foreground/15",
        )}
      >
        {formatTime(item.createdAt)}
      </p>
    </div>
  )
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}
