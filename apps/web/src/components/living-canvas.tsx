"use client"

import { forwardRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface LivingCanvasProps {
  children: ReactNode
  onActivate?: () => void
  className?: string
}

export const LivingCanvas = forwardRef<HTMLDivElement, LivingCanvasProps>(
  function LivingCanvas({ children, onActivate, className }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex-1 overflow-y-auto",
          "bg-[radial-gradient(ellipse_at_center,_hsl(0_0%_5%)_0%,_hsl(0_0%_2%)_70%)]",
          className,
        )}
        onClick={onActivate}
      >
        <div className="mx-auto min-h-full max-w-2xl px-6 pb-32 pt-16 sm:pt-20">
          {children}
        </div>
      </div>
    )
  },
)
