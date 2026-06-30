"use client"

import type { Session } from "@/data/memories"

interface SessionHeaderProps {
  session: Session
}

export function SessionHeader({ session }: SessionHeaderProps) {
  return (
    <div className="animate-fade-in-up">
      <p className="text-xl font-medium tracking-tight sm:text-2xl">
        Today&apos;s Session
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground/60">
        {session.date.toLocaleDateString("en-US", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
    </div>
  )
}
