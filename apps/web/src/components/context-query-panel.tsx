"use client"

import { useState, useCallback } from "react"
import type { QueryItem } from "@/data/memories"

interface Props {
  onQuery: (text: string) => Promise<QueryItem[]>
}

export function ContextQueryPanel({ onQuery }: Props) {
  const [queryText, setQueryText] = useState("")
  const [results, setResults] = useState<QueryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = queryText.trim()
      if (!trimmed) return

      setIsLoading(true)
      setError(null)

      try {
        const items = await onQuery(trimmed)
        setResults(items)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Query failed")
      }

      setIsLoading(false)
    },
    [queryText, onQuery],
  )

  return (
    <div className="mt-8 rounded-lg border border-dashed border-muted-foreground/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-500">
          Dev Only
        </span>
        <p className="text-[11px] font-medium text-muted-foreground/60">
          Context Retrieval Engine — query across memories, concepts, and sessions
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="e.g. python, 2026-06, learning..."
          aria-label="Search context"
          className="flex-1 rounded border border-muted-foreground/20 bg-transparent px-3 py-1.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/30 focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/50"
        />
        <button
          type="submit"
          disabled={isLoading || !queryText.trim()}
          className="rounded bg-primary/20 px-3 py-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-primary/30 disabled:opacity-40"
        >
          {isLoading ? "..." : "Query"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-2 text-[11px] text-red-400">{error}</p>
      )}

      {results.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] text-muted-foreground/40">
            {results.length} result{results.length !== 1 ? "s" : ""}
          </p>
          {results.map((item) => (
            <div
              key={item.id}
              className="rounded border border-muted-foreground/10 bg-muted/30 px-2.5 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="rounded bg-muted-foreground/10 px-1 py-0.5 font-mono text-[10px] text-muted-foreground/60">
                  {item.type}
                </span>
                <span className="text-[13px] font-medium text-foreground/80">
                  {item.label}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground/40">
                  score: {item.score}
                </span>
              </div>
              {item.summary && (
                <p className="mt-0.5 text-[11px] text-muted-foreground/50 line-clamp-1">
                  {item.summary}
                </p>
              )}
              {item.matched_terms.length > 0 && (
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {item.matched_terms.map((term) => (
                    <span
                      key={term}
                      className="rounded bg-primary/5 px-1 py-0.5 font-mono text-[9px] text-primary/60"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
