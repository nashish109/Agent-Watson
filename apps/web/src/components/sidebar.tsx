"use client"

import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import {
  BrainCircuit,
  Briefcase,
  BookOpen,
  FolderKanban,
  Heart,
  BookMarked,
  User,
  Sparkles,
  TrendingUp,
  Lightbulb,
  Share2,
  Sun,
  Moon,
  MessageSquare,
} from "lucide-react"
import type { Workspace } from "@/lib/api/types"

const WORKSPACE_ICONS: Record<string, typeof Sparkles> = {
  CAT: BrainCircuit,
  Career: Briefcase,
  Learning: BookOpen,
  Projects: FolderKanban,
  Health: Heart,
  Reading: BookMarked,
  Personal: User,
}

interface SidebarProps {
  className?: string
  workspaces: Workspace[]
  currentWorkspaceId: string | null
  onSelectWorkspace: (workspaceId: string) => void
  onSession: () => void
  onGrowth: () => void
  onInsights: () => void
  onGraph: () => void
}

export function Sidebar({ className, workspaces, currentWorkspaceId, onSelectWorkspace, onSession, onGrowth, onInsights, onGraph }: SidebarProps) {
  const { theme, setTheme } = useTheme()

  return (
    <aside
      className={cn(
        "flex h-full w-56 flex-col border-r border-border/40 bg-background",
        className,
      )}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-border/30 px-4 py-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Watson</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-2 pb-2" aria-label="Workspace navigation">
        <p className="px-2 pb-1 pt-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/25">
          Overview
        </p>
        <button
          onClick={onSession}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm text-primary/80 transition-all hover:bg-primary/10 font-medium"
          aria-label="Go to today's session"
        >
          <MessageSquare className="h-4 w-4 shrink-0 text-primary/60" aria-hidden="true" />
          <span className="flex-1 truncate">Today's Session</span>
        </button>
        <button
          onClick={onGrowth}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm text-muted-foreground/60 transition-all hover:bg-accent hover:text-accent-foreground"
          aria-label="View growth metrics"
        >
          <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden="true" />
          <span className="flex-1 truncate">Growth</span>
        </button>
        <button
          onClick={onInsights}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm text-muted-foreground/60 transition-all hover:bg-accent hover:text-accent-foreground"
          aria-label="View insights"
        >
          <Lightbulb className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden="true" />
          <span className="flex-1 truncate">Insights</span>
        </button>
        <button
          onClick={onGraph}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm text-muted-foreground/60 transition-all hover:bg-accent hover:text-accent-foreground"
          aria-label="View knowledge graph"
        >
          <Share2 className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden="true" />
          <span className="flex-1 truncate">Graph</span>
        </button>

        <div className="my-2 border-t border-border/20" role="separator" />

        <p className="px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/25">
          Workspaces
        </p>
        <div className="flex flex-col gap-0.5">
          {workspaces.map((ws) => {
            const Icon = WORKSPACE_ICONS[ws.type] ?? Sparkles
            const isActive = ws.id === currentWorkspaceId
            return (
              <button
                key={ws.id}
                onClick={() => onSelectWorkspace(ws.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-r-lg px-3 py-1.5 text-left text-sm transition-all",
                  isActive
                    ? "border-l-2 border-primary bg-primary/5 text-primary font-medium"
                    : "text-muted-foreground/60 hover:bg-accent hover:text-accent-foreground border-l-2 border-transparent",
                )}
                aria-current={isActive ? "page" : undefined}
                aria-label={`Switch to ${ws.name}`}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground/40",
                  )}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate">{ws.name}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border/20 px-3 py-2">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left text-sm text-muted-foreground/60 transition-all hover:bg-accent hover:text-accent-foreground"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden="true" />
          )}
          <span className="flex-1 truncate">{theme === "dark" ? "Light" : "Dark"} Theme</span>
        </button>
      </div>
    </aside>
  )
}
