"use client"

import { cn } from "@/lib/utils"
import type { TimelineItem } from "@/data/memories"

interface MemoryCardProps {
  item: TimelineItem
}

export function MemoryCard({ item }: MemoryCardProps) {
  return (
    <div
      className={cn(
        "animate-fade-in rounded-xl border px-5 py-4 text-sm leading-relaxed transition-colors",
        item.type === "contribution"
          ? "border-border/40 bg-card text-foreground"
          : item.type === "reflection"
            ? "border-primary/10 bg-card/60 text-foreground/85"
            : item.type === "response"
              ? "border-primary/20 bg-primary/5 text-foreground"
              : "border-border/30 bg-card/50 text-foreground/90",
      )}
    >
      {item.type === "contribution" && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/40">
            Contribution
          </span>
        </div>
      )}

      {item.type === "memory" && (
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400/50" />
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-amber-400/60">
            {item.displayLabel ?? item.memoryType ?? "Memory"}
          </span>
        </div>
      )}

      {item.type === "reflection" && (
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary/60">
            Reflection
          </span>
        </div>
      )}

      {item.type === "response" && (
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary/80">
            Watson
          </span>
        </div>
      )}

      <p>{item.content}</p>

      {item.type === "reflection" && item.relatedTo && item.relatedTo.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/40">
            Connected To
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
            Concepts
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
            Connections
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
          Topic: {item.topic}
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
