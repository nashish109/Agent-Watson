/**
 * Types for the Agent Watson Memory Engine integration.
 *
 * The frontend communicates with the Python Session Engine through
 * a Next.js API route. All extraction/reflection logic lives in
 * the Python backend — this module only defines types and helpers.
 */

// ---------------------------------------------------------------------------
// Raw shapes returned by the Python bridge (snake_case from Pydantic)
// ---------------------------------------------------------------------------

export interface BridgeContribution {
  id: string
  text: string
  timestamp: string
  source: string
  tags: string[]
}

export interface BridgeMemory {
  id: string
  type: string
  topic: string
  summary: string
  confidence: number
  created_at: string
  contribution_id: string
  display_label?: string
}

export interface BridgeReflection {
  id: string
  memory_id: string
  text: string
  created_at: string
  related_to: string[]
}

export interface BridgeRelationship {
  id: string
  source_memory_id: string
  target_memory_id: string
  relationship_type: string
  label: string
  created_at: string
}

export interface BridgeSession {
  id: string
  session_date: string
  started_at: string
  ended_at: string | null
  contributions: BridgeContribution[]
  memories: BridgeMemory[]
  reflections: BridgeReflection[]
  summary: string | null
}

// ---------------------------------------------------------------------------
// UI-facing types
// ---------------------------------------------------------------------------

export type ItemType = "contribution" | "memory" | "reflection" | "response"

export interface TimelineItem {
  id: string
  type: ItemType
  content: string
  topic?: string
  memoryType?: string
  displayLabel?: string
  relatedTo?: string[]
  createdAt: Date
}

export interface Session {
  id: string
  title: string
  date: Date
  items: TimelineItem[]
  summary: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function buildSessionTitle(date: Date): string {
  return `Today's Session — ${date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}`
}
