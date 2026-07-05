"use client"

import { useState } from "react"
import type { Session } from "@/data/memories"
import type { Workspace } from "@/lib/api/types"
import { ContributionInput } from "@/components/contribution-input"
import { MemoryCard } from "@/components/memory-card"
import { SessionHeader } from "@/components/session-header"
import { LivingCanvas } from "@/components/living-canvas"
import { ContextQueryPanel } from "@/components/context-query-panel"
import { TodayReflection } from "@/components/today-reflection"
import { useSession } from "@/hooks/use-session"

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

  if (!session) {
    return (
      <LivingCanvas onActivate={() => setShowInput(true)}>
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
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground/40">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60" />
          Thinking...
        </div>
      )}
      <div className="mt-6 space-y-3">
        {session.items.map((item) => (
          <MemoryCard key={item.id} item={item} />
        ))}
      </div>
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
