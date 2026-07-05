"use client"

import { Sparkles } from "lucide-react"
import type { Workspace } from "@/lib/api/types"

interface WorkspaceLandingProps {
  workspace: Workspace
  onStartSession: () => void
  onContinueSession: (sessionId: string) => void
}

export function WorkspaceLanding({ workspace, onStartSession, onContinueSession }: WorkspaceLandingProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mx-auto max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground/90">
            {workspace.name}
          </h1>
          <p className="text-sm text-muted-foreground/50">
            A quiet space for reflection and growth, one day at a time.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={onStartSession}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            Start New Session
          </button>
        </div>
      </div>
    </div>
  )
}
