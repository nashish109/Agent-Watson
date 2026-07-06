"use client"

import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 text-center", className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border/30 bg-card/50">
        <Icon className="h-5 w-5 text-muted-foreground/40" />
      </div>
      <h3 className="text-sm font-medium text-foreground/70">{title}</h3>
      <p className="mt-1.5 max-w-xs text-xs text-muted-foreground/40 leading-relaxed">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-primary/15 px-4 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
