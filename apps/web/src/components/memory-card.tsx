"use client"

import { cn } from "@/lib/utils"
import type { Memory } from "@/data/memories"

interface MemoryCardProps {
  memory: Memory
}

export function MemoryCard({ memory }: MemoryCardProps) {
  return (
    <div
      className={cn(
        "animate-fade-in rounded-xl border px-5 py-4 text-sm leading-relaxed transition-colors",
        memory.type === "contribution"
          ? "border-border/40 bg-card text-foreground"
          : "border-primary/10 bg-card/60 text-foreground/85",
      )}
    >
      {memory.type === "contribution" && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/40">
            Contribution
          </span>
        </div>
      )}

      {memory.type === "reflection" && (
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-primary/60">
            Reflection
          </span>
        </div>
      )}

      <p>{memory.content}</p>

      {memory.type === "reflection" && memory.memoryLabel && (
        <p className="mt-2 text-[11px] italic text-primary/40">
          {memory.memoryLabel}
        </p>
      )}

      {memory.type !== "memory-created" && (
        <p
          className={cn(
            "mt-1.5 text-[10px]",
            memory.type === "contribution"
              ? "text-muted-foreground/20"
              : "text-muted-foreground/15",
          )}
        >
          {formatTime(memory.createdAt)}
        </p>
      )}
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
