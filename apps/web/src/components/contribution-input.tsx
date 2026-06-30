"use client"

import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"

interface ContributionInputProps {
  onSubmit: (content: string) => void
  onCancel?: () => void
}

export function ContributionInput({ onSubmit, onCancel }: ContributionInputProps) {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setValue("")
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === "Escape") {
      onCancel?.()
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/40 backdrop-blur-sm",
        "animate-fade-in",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.()
      }}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-lg animate-fade-in-up",
          "rounded-2xl border border-border/30 bg-card p-6",
          "shadow-2xl",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          placeholder="What happened today?"
          className={cn(
            "w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40",
            "focus:outline-none",
          )}
        />
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground/30">
            Enter to contribute &middot; Esc to cancel
          </span>
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className={cn(
              "rounded-lg px-4 py-2 text-xs font-medium transition-all",
              value.trim()
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "bg-muted/30 text-muted-foreground/30 cursor-not-allowed",
            )}
          >
            Contribute
          </button>
        </div>
      </div>
    </div>
  )
}
