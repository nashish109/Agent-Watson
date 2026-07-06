"use client"

import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { cn } from "@/lib/utils"

const PROMPTS = [
  "What happened today?",
  "What's on your mind?",
  "Share a thought or idea...",
  "What did you learn today?",
  "Anything you want to explore?",
  "What's something new you tried?",
  "What are you grateful for?",
  "What challenged you today?",
]

interface ContributionInputProps {
  onSubmit: (content: string) => void
  onCancel?: () => void
}

export function ContributionInput({ onSubmit, onCancel }: ContributionInputProps) {
  const [value, setValue] = useState("")
  const [promptIndex, setPromptIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    if (value) return
    const interval = setInterval(() => {
      setPromptIndex((i) => (i + 1) % PROMPTS.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [value])

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
      role="dialog"
      aria-modal="true"
      aria-label="Contribute your thoughts"
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
          placeholder={PROMPTS[promptIndex]}
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          aria-label="Your contribution"
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
