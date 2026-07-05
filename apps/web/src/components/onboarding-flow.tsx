"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"

interface OnboardingFlowProps {
  onComplete: () => void
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: "Welcome to Watson",
      description: "Your quiet companion for learning, building, and growing — one day at a time.",
    },
    {
      title: "Share Your Day",
      description: "Tell Watson what you learned, built, or felt today. Every contribution builds your personal knowledge graph.",
    },
    {
      title: "Watch It Grow",
      description: "Over time, Watson helps you see patterns in your learning, projects, and personal growth.",
    },
  ]

  const current = steps[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="mx-auto max-w-sm px-6 text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="space-y-3 mb-8">
          <h1 className="text-xl font-semibold tracking-tight">{current.title}</h1>
          <p className="text-sm text-muted-foreground/60">{current.description}</p>
        </div>
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === step ? "bg-primary" : "bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => {
            if (step < steps.length - 1) {
              setStep(step + 1)
            } else {
              onComplete()
            }
          }}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
        >
          {step < steps.length - 1 ? "Next" : "Get Started"}
        </button>
      </div>
    </div>
  )
}
