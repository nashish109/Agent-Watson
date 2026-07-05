export interface Workspace {
  id: string
  name: string
  type: string
  createdAt: string
}

export interface CreateSessionResponse {
  id: string
  session_date: string
  started_at: string
  ended_at: string | null
  summary: string | null
}

export interface GetSessionResponse {
  id: string
  session_date: string
  started_at: string
  ended_at: string | null
  contributions: unknown[]
  memories: unknown[]
  reflections: unknown[]
  summary: string | null
}

export interface ContributeResponse {
  reply: string
  intent: string
  intent_confidence: number
  contribution: unknown
  memories: unknown[]
  reflections: unknown[]
  relationships: unknown[]
  concepts: string[]
  connections: string[]
}

export interface QueryItem {
  type: string
  id: string
  label: string
  summary: string
  score: number
  session_id: string
  session_date: string
  memory_type?: string
  matched_terms: string[]
}

export interface QueryResponse {
  ok: boolean
  error?: string
  query?: string
  total_count?: number
  items: QueryItem[]
}

export interface ReflectResponse {
  primary_focus: string
  topics_explored: string[]
  progress: Record<string, string[]>
  strongest_connections: Array<{
    source: string
    target: string
    relation: string
  }>
  reflection: string
}
