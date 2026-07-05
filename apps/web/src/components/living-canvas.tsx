"use client"

import { forwardRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface LivingCanvasProps {
  children: ReactNode
  onActivate?: () => void
  onScroll?: () => void
  className?: string
}

export const LivingCanvas = forwardRef<HTMLDivElement, LivingCanvasProps>(
  function LivingCanvas({ children, onActivate, onScroll, className }, ref) {
    return (
      <div
        ref={ref}
        onScroll={onScroll}
        className={cn(
          "relative flex-1 overflow-y-auto",
          "bg-[radial-gradient(ellipse_at_center,hsl(220_10%_96%)_0%,hsl(48_20%_97%)_70%)]",
          "dark:bg-[radial-gradient(ellipse_at_center,hsl(0_0%_5%)_0%,hsl(0_0%_2%)_70%)]",
          className,
        )}
        onClick={onActivate}
        role={onActivate ? "button" : undefined}
        tabIndex={onActivate ? 0 : undefined}
        onKeyDown={onActivate ? (e) => { if (e.key === "Enter" || e.key === " ") onActivate() } : undefined}
      >
        <div className="mx-auto min-h-full max-w-2xl px-6 pb-32 pt-16 sm:pt-20">
          {children}
        </div>
      </div>
    )
  },
)
