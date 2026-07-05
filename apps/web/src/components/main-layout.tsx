"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Menu, X, Pin, PinOff, Sparkles } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import type { Workspace } from "@/lib/api/types"
import { cn } from "@/lib/utils"

const PIN_STORAGE_KEY = "watson_sidebar_pinned"

interface MainLayoutProps {
  children: React.ReactNode
  workspaces: Workspace[]
  currentWorkspaceId: string | null
  onSelectWorkspace: (workspaceId: string) => void
  onGrowth: () => void
  onInsights: () => void
}

export function MainLayout({ children, workspaces, currentWorkspaceId, onSelectWorkspace, onGrowth, onInsights }: MainLayoutProps) {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem(PIN_STORAGE_KEY) === "true"
  })
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Persist pin preference
  useEffect(() => {
    localStorage.setItem(PIN_STORAGE_KEY, pinned ? "true" : "false")
  }, [pinned])

  // Escape to close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open])

  // Outside click to close
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    // Delay to avoid same-click closing
    const id = setTimeout(() => document.addEventListener("mousedown", handler), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener("mousedown", handler)
    }
  }, [open])

  const handleSelect = useCallback((id: string) => {
    onSelectWorkspace(id)
    if (!pinned) setOpen(false)
  }, [onSelectWorkspace, pinned])

  const handleGrowth = useCallback(() => {
    onGrowth()
    if (!pinned) setOpen(false)
  }, [onGrowth, pinned])

  const handleInsights = useCallback(() => {
    onInsights()
    if (!pinned) setOpen(false)
  }, [onInsights, pinned])

  const showSidebar = open || (pinned && typeof window !== "undefined")

  return (
    <div className="flex h-dvh overflow-hidden">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      {/* Sidebar overlay backdrop */}
      {open && !pinned && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex",
          "transition-transform duration-200 ease-out",
          showSidebar ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar
          workspaces={workspaces}
          currentWorkspaceId={currentWorkspaceId}
          onSelectWorkspace={handleSelect}
          onGrowth={handleGrowth}
          onInsights={handleInsights}
        />

        {/* Pin toggle — desktop only */}
        {open && (
          <button
            onClick={() => { setPinned(p => !p); if (pinned) setOpen(false) }}
            className="hidden md:flex absolute -right-10 top-4 h-8 w-8 items-center justify-center rounded-r-lg border border-l-0 border-border/40 bg-background text-muted-foreground/40 shadow-sm transition-colors hover:text-muted-foreground/70"
            aria-label={pinned ? "Unpin sidebar" : "Pin sidebar"}
            title={pinned ? "Unpin sidebar" : "Pin sidebar"}
          >
            {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Main content area */}
      <div className="relative flex flex-1 flex-col min-w-0">
        {/* Header */}
        <Header
          currentWorkspaceName={
            workspaces.find(w => w.id === currentWorkspaceId)?.name ?? ""
          }
          sidebarOpen={open}
          sidebarPinned={pinned}
          onMenuToggle={() => setOpen(o => !o)}
        />

        <main id="main-content" className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

function Header({
  currentWorkspaceName,
  sidebarOpen,
  sidebarPinned,
  onMenuToggle,
}: {
  currentWorkspaceName: string
  sidebarOpen: boolean
  sidebarPinned: boolean
  onMenuToggle: () => void
}) {
  return (
    <header className="flex items-center justify-between border-b border-border/30 bg-background/80 backdrop-blur-sm px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-1.5 text-muted-foreground/50 transition-all hover:bg-accent hover:text-muted-foreground/80 active:scale-95"
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen && !sidebarPinned ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground/70">
            {currentWorkspaceName || "Watson"}
          </span>
        </div>
      </div>
      <div className="w-7" />
    </header>
  )
}
