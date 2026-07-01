"use client"

import { useState, useCallback } from "react"

export interface TodayReflectionData {
  primary_focus: string
  topics_explored: string[]
  progress: Record<string, string[]>
  strongest_connections: Array<{ source: string; target: string; relation: string }>
  reflection: string
}

interface Props {
  onReflect: () => Promise<TodayReflectionData>
}

export function TodayReflection({ onReflect }: Props) {
  const [data, setData] = useState<TodayReflectionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReflect = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await onReflect()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reflection failed")
    }

    setIsLoading(false)
  }, [onReflect])

  const progressEntries = data
    ? Object.entries(data.progress)
    : []

  return (
    <div className="mt-8 rounded-lg border border-dashed border-muted-foreground/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-500">
          Dev Only
        </span>
        <p className="text-[11px] font-medium text-muted-foreground/60">
          Today&apos;s Reflection — generated from memories, concepts, and context
        </p>
      </div>

      <button
        onClick={handleReflect}
        disabled={isLoading}
        className="rounded bg-primary/20 px-3 py-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-primary/30 disabled:opacity-40"
      >
        {isLoading ? "Generating..." : data ? "Regenerate" : "Generate Reflection"}
      </button>

      {error && (
        <p className="mt-2 text-[11px] text-red-400">{error}</p>
      )}

      {data && (
        <div className="mt-4 space-y-4">
          {/* Primary Focus */}
          <Section label="Primary Focus">
            <Badge text={data.primary_focus} />
          </Section>

          {/* Topics Explored */}
          {data.topics_explored.length > 0 && (
            <Section label="Topics Explored">
              <ul className="list-inside list-disc space-y-0.5">
                {data.topics_explored.map((topic) => (
                  <li key={topic} className="text-[12px] text-foreground/70">
                    {topic}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Progress */}
          {progressEntries.length > 0 && (
            <Section label="Progress">
              {progressEntries.map(([category, items]) => (
                <div key={category} className="mb-2">
                  <p className="text-[11px] font-medium text-foreground/50">{category}</p>
                  <ul className="list-inside list-disc space-y-0.5">
                    {items.map((item) => (
                      <li key={item} className="text-[12px] text-foreground/70">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </Section>
          )}

          {/* Strongest Connections */}
          {data.strongest_connections.length > 0 && (
            <Section label="Strongest Connections">
              <div className="flex flex-wrap gap-2">
                {data.strongest_connections.map((conn, i) => (
                  <div
                    key={i}
                    className="rounded border border-muted-foreground/10 bg-muted/30 px-2 py-1"
                  >
                    <span className="text-[12px] text-foreground/80">{conn.source}</span>
                    <span className="mx-1 text-[11px] text-muted-foreground/50">{"\u2194"}</span>
                    <span className="text-[12px] text-foreground/80">{conn.target}</span>
                    <span className="ml-1.5 text-[10px] text-muted-foreground/40">{conn.relation}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Reflection */}
          <Section label="Reflection">
            <p className="text-[13px] italic text-foreground/80 leading-relaxed">
              {data.reflection}
            </p>
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/40">
        {label}
      </p>
      {children}
    </div>
  )
}

function Badge({ text }: { text: string }) {
  return (
    <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-[12px] font-medium text-primary/80">
      {text}
    </span>
  )
}
