"use client"

import { useState, useRef, useEffect } from "react"
import type { Session } from "@/data/memories"
import type { Workspace } from "@/lib/api/types"
import { ContributionInput } from "@/components/contribution-input"
import { MemoryCard } from "@/components/memory-card"
import { SessionHeader } from "@/components/session-header"
import { LivingCanvas } from "@/components/living-canvas"
import { ContextQueryPanel } from "@/components/context-query-panel"
import { TodayReflection } from "@/components/today-reflection"
import { useSession } from "@/hooks/use-session"
import { cn } from "@/lib/utils"

type DailyMode = "morning" | "focus" | "evening"

interface DailyJourneyProps {
  session: Session | null
  currentWorkspace: Workspace | null
  isProcessing: boolean
  onContribute: (content: string) => Promise<void>
  onCancel: () => void
  onActivate: () => void
  onGrowth: () => void
  initialMode?: DailyMode
  onModeChange?: (mode: DailyMode) => void
}

export function DailyJourney({
  session,
  currentWorkspace,
  isProcessing,
  onContribute,
  onCancel,
  onActivate,
  onGrowth,
  initialMode,
  onModeChange,
}: DailyJourneyProps) {
  const [showInput, setShowInput] = useState(false)
  const { query, reflect } = useSession(currentWorkspace?.id)

  const handleContribute = async (content: string) => {
    await onContribute(content)
    setShowInput(false)
  }

  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [session?.items.length])

  if (!session) {
    return (
      <LivingCanvas>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <p className="text-sm text-muted-foreground/40">Begin your session by sharing what happened today.</p>
          <button
            onClick={() => setShowInput(true)}
            className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            Share Something
          </button>
        </div>
        {showInput && <ContributionInput onSubmit={handleContribute} onCancel={() => setShowInput(false)} />}
      </LivingCanvas>
    )
  }

  return (
    <LivingCanvas onActivate={onActivate}>
      <SessionHeader title={session.title} date={session.date} />
      {isProcessing && (
        <div className="mt-4 animate-fade-in rounded-xl border border-primary/15 bg-primary/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
            </div>
            <span className="text-xs text-muted-foreground/50 font-medium">
              Watson is thinking
            </span>
          </div>
          <div className="mt-2 h-4 w-3/4 rounded bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 bg-[length:200%_100%] animate-shimmer" />
        </div>
      )}
      <div className="mt-6 space-y-3">
        {session.items.map((item, index) => (
          <div key={item.id} style={{ animationDelay: `${index * 0.06}s` }}>
            <MemoryCard item={item} />
          </div>
        ))}
      </div>
      <div ref={bottomRef} />
      <div className="mt-6">
        <button
          onClick={() => setShowInput(true)}
          className="w-full rounded-lg border border-dashed border-muted-foreground/20 px-4 py-3 text-sm text-muted-foreground/40 transition-colors hover:border-primary/30 hover:text-primary/60"
        >
          Share what happened next...
        </button>
      </div>
      {showInput && <ContributionInput onSubmit={handleContribute} onCancel={() => setShowInput(false)} />}
      <ContextQueryPanel onQuery={query} />
      <TodayReflection onReflect={reflect} />
    </LivingCanvas>
  )
}
