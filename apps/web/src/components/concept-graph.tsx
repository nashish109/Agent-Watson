"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import type { Concept, ConceptEdge } from "@/lib/api/types"
import { cn } from "@/lib/utils"

interface ConceptGraphProps {
  concepts: Concept[]
  edges: ConceptEdge[]
}

const TYPE_COLORS: Record<string, string> = {
  language: "border-blue-400/40 bg-blue-500/10 text-blue-300",
  technology: "border-violet-400/40 bg-violet-500/10 text-violet-300",
  project: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  person: "border-rose-400/40 bg-rose-500/10 text-rose-300",
  topic: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  skill: "border-cyan-400/40 bg-cyan-500/10 text-cyan-300",
  habit: "border-orange-400/40 bg-orange-500/10 text-orange-300",
  resource: "border-pink-400/40 bg-pink-500/10 text-pink-300",
  generic: "border-border/40 bg-card text-muted-foreground",
}

export function ConceptGraph({ concepts, edges }: ConceptGraphProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 })

  useEffect(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width > 0) {
      setDimensions({ width: rect.width, height: Math.max(400, rect.height) })
    }
  }, [])

  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>()
    const cx = dimensions.width / 2
    const cy = dimensions.height / 2
    const r = Math.min(cx, cy) * 0.65

    if (concepts.length === 0) return pos
    pos.set(concepts[0].id, { x: cx, y: cy })

    const step = (2 * Math.PI) / Math.max(1, concepts.length - 1)
    let idx = 0
    for (const concept of concepts) {
      if (pos.has(concept.id)) continue
      const angle = idx * step - Math.PI / 2
      pos.set(concept.id, {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      })
      idx++
    }
    return pos
  }, [concepts, dimensions])

  const visibleEdges = useMemo(() => {
    if (!selected) return edges
    return edges.filter((e) => e.sourceId === selected || e.targetId === selected)
  }, [edges, selected])

  const activeIds = useMemo(() => {
    const ids = new Set<string>()
    if (!selected) return ids
    for (const e of edges) {
      if (e.sourceId === selected) ids.add(e.targetId)
      if (e.targetId === selected) ids.add(e.sourceId)
    }
    ids.add(selected)
    return ids
  }, [edges, selected])

  const selectedConcept = concepts.find((c) => c.id === selected)

  const TYPE_LABELS: Record<string, string> = {
    language: "Language",
    technology: "Tech",
    project: "Project",
    person: "Person",
    topic: "Topic",
    skill: "Skill",
    habit: "Habit",
    resource: "Resource",
    generic: "Other",
  }

  if (concepts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-center">
        <p className="text-xs text-muted-foreground/40">
          No concepts yet. Start a conversation to build your knowledge graph.
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-4">
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden rounded-xl border border-border/30 bg-card/30"
        style={{ minHeight: 400 }}
      >
        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-1.5">
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <span
              key={type}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider",
                TYPE_COLORS[type] ?? TYPE_COLORS.generic,
              )}
            >
              {label}
            </span>
          ))}
        </div>
        <svg
          width={dimensions.width}
          height={dimensions.height}
          className="absolute inset-0 transition-opacity duration-300"
        >
          {visibleEdges.map((edge) => {
            const source = positions.get(edge.sourceId)
            const target = positions.get(edge.targetId)
            if (!source || !target) return null

            const highlight = !selected ||
              edge.sourceId === selected ||
              edge.targetId === selected

            return (
              <line
                key={edge.id}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={highlight ? "hsl(220 10% 50% / 0.2)" : "hsl(220 10% 50% / 0.05)"}
                strokeWidth={highlight ? Math.max(1, edge.strength) : 0.5}
                className="transition-all duration-300"
              />
            )
          })}
        </svg>

        {concepts.map((concept) => {
          const pos = positions.get(concept.id)
          if (!pos) return null

          const isSelected = selected === concept.id
          const isConnected = activeIds.has(concept.id)
          const isDimmed = selected && !isConnected

          return (
            <button
              key={concept.id}
              className={cn(
                "absolute flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300",
                TYPE_COLORS[concept.type] ?? TYPE_COLORS.generic,
                isSelected && "ring-2 ring-primary/50 scale-110",
                hovered === concept.id && !isSelected && "scale-105",
                isDimmed && "opacity-25",
              )}
              style={{
                left: pos.x,
                top: pos.y,
                transform: "translate(-50%, -50%)",
              }}
              onClick={() => setSelected(isSelected ? null : concept.id)}
              onMouseEnter={() => setHovered(concept.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
              {concept.name}
            </button>
          )
        })}
      </div>

      {selectedConcept && (
        <div
          className="w-64 shrink-0 animate-fade-in space-y-3"
        >
          <div className="rounded-xl border border-border/30 bg-card p-4">
            <h3 className="text-sm font-medium text-foreground">{selectedConcept.name}</h3>
            <span className="mt-1 inline-block rounded-full border border-border/30 px-2 py-0.5 text-[10px] text-muted-foreground/60">
              {selectedConcept.type}
            </span>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground/50">
              <p>Mentioned {selectedConcept.mentionCount} times</p>
              <p>First seen: {new Date(selectedConcept.firstSeen).toLocaleDateString()}</p>
              <p>Last seen: {new Date(selectedConcept.lastSeen).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/30 bg-card p-4">
            <h4 className="mb-2 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
              Connections
            </h4>
            {visibleEdges.length === 0 ? (
              <p className="text-xs text-muted-foreground/30">No connections yet</p>
            ) : (
              <div className="space-y-1">
                {visibleEdges.map((edge) => {
                  const otherId = edge.sourceId === selected ? edge.targetId : edge.sourceId
                  const other = concepts.find((c) => c.id === otherId)
                  if (!other) return null
                  return (
                    <div
                      key={edge.id}
                      className="flex items-center gap-2 rounded-lg bg-card/50 px-2 py-1.5 text-xs"
                    >
                      <span className="text-muted-foreground/60">{other.name}</span>
                      <span className="text-[10px] text-muted-foreground/30">{edge.relation}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
