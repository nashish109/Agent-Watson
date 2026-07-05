"use client"

interface SessionHeaderProps {
  title: string
  date: Date
}

export function SessionHeader({ title, date }: SessionHeaderProps) {
  return (
    <div className="animate-fade-in-up">
      <h1 className="text-xl font-medium tracking-tight sm:text-2xl">
        Today&apos;s Session
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground/60">
        {date.toLocaleDateString("en-US", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
    </div>
  )
}
