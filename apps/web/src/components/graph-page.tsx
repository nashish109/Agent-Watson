"use client"

import { useConcepts } from "@/hooks/use-concepts"
import { ConceptGraph } from "./concept-graph"

export function GraphPage() {
  const { concepts, edges, loading, error, refresh } = useConcepts()

  return (
    <div className="mx-auto flex h-full flex-col px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Knowledge Graph</h2>
          <p className="mt-0.5 text-xs text-muted-foreground/50">
            Concepts and connections from your conversations
          </p>
        </div>
        <button
          onClick={refresh}
          className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary/70 transition-colors hover:bg-primary/20"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground/40">Loading graph...</p>
        </div>
      ) : (
        <div className="flex-1">
          <ConceptGraph concepts={concepts} edges={edges} />
        </div>
      )}
    </div>
  )
}
