"use client"

import { cn } from "@/lib/utils"
import {
  ScrollText,
  BrainCircuit,
  BookOpen,
  Briefcase,
  Search,
  Settings,
  Sparkles,
} from "lucide-react"

const navItems = [
  { label: "Session", icon: ScrollText, active: true, disabled: false },
  { label: "Memory", icon: BrainCircuit, active: false, disabled: true },
  { label: "Learning", icon: BookOpen, active: false, disabled: true },
  { label: "Career", icon: Briefcase, active: false, disabled: true },
  { label: "Research", icon: Search, active: false, disabled: true },
  { label: "Settings", icon: Settings, active: false, disabled: true },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-52 flex-col border-r border-border/50 bg-background",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-5">
        <div className="flex h-6 w-6 items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Watson</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {navItems.map((item) => (
          <button
            key={item.label}
            disabled={item.disabled}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
              item.active && "bg-primary/10 text-primary font-medium",
              !item.active &&
                !item.disabled &&
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              item.disabled && "cursor-not-allowed text-muted-foreground/30",
            )}
          >
            <item.icon
              className={cn(
                "h-4 w-4 shrink-0",
                item.active && "text-primary",
                item.disabled && "text-muted-foreground/20",
              )}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {item.disabled && (
              <span className="text-[10px] text-muted-foreground/35 italic">
                Coming soon
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="border-t border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">
            A
          </div>
          <span className="text-sm text-muted-foreground/80">Ashish</span>
        </div>
      </div>
    </aside>
  )
}
