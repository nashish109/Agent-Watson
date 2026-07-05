export interface Session {
  id: string
  sessionDate: string
  title?: string
  mode: "morning" | "focus" | "evening"
  startedAt: string
  endedAt?: string
  summary?: string
}

export interface Contribution {
  id: string
  text: string
  source: string
  createdAt: string
}

export interface Memory {
  id: string
  type: string
  topic: string
  summary: string
  content?: string
  confidence: number
  createdAt: string
}

export interface Reflection {
  id: string
  text: string
  relatedTo: string[]
  createdAt: string
}

export interface Workspace {
  id: string
  name: string
  type: string
  description?: string
  createdAt?: string
}

export interface ChatResponse {
  reply: string
  memories: Memory[]
  reflections: Reflection[]
}

export interface QueryItem {
  id: string
  type: string
  label: string
  summary: string
  score: number
  session_id: string
  session_date: string
  memory_type: string
  matched_terms: string[]
}

export interface QueryResponse {
  query: string
  total_count: number
  items: QueryItem[]
}

export interface ReflectResponse {
  primary_focus: string
  topics_explored: string[]
  progress: Record<string, string[]>
  strongest_connections: Array<{ source: string; target: string; relation: string }>
  reflection: string
}

export interface Goal {
  id: string
  userId: string
  title: string
  description: string
  category: string
  status: "active" | "completed" | "abandoned"
  progress: number
  targetDate?: string
  createdAt: string
  updatedAt: string
}

export interface GoalProgressUpdate {
  id: string
  goalId: string
  note: string
  progressDelta: number
  createdAt: string
}

export interface CreateGoalRequest {
  title: string
  description?: string
  category?: string
  targetDate?: string
}

export interface AddProgressRequest {
  note: string
  progressDelta: number
}

export interface Concept {
  id: string
  name: string
  type: string
  mentionCount: number
  firstSeen: string
  lastSeen: string
  relatedSessions: string[]
}

export interface ConceptEdge {
  id: string
  sourceId: string
  targetId: string
  relation: string
  strength: number
  createdAt: string
}

export interface ConceptGraphResponse {
  concepts: Concept[]
  edges: ConceptEdge[]
}

export interface Insight {
  id: string
  type: "pattern" | "trend" | "observation" | "milestone" | "suggestion"
  title: string
  description: string
  category: string
  strength: number
  relatedMemoryIds: string[]
  createdAt: string
}

export interface InsightsResponse {
  ok: boolean
  insights: Insight[]
  message?: string
}
