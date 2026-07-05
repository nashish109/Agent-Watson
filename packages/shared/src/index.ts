export type MemoryType =
  | "learning"
  | "project"
  | "career"
  | "health"
  | "reflection"
  | "generic"

export type IntentType =
  | "goal"
  | "achievement"
  | "problem"
  | "question"
  | "decision"
  | "learning"
  | "career"
  | "health"
  | "reflection"
  | "project"
  | "habit"
  | "personal"
  | "generic"

export type SessionMode = "morning" | "focus" | "evening"

export type RelationshipType =
  | "related_topic"
  | "same_project"
  | "same_domain"
  | "career_learning"
  | "health_pattern"
  | "generic"

export interface Session {
  id: string
  userId?: string
  sessionDate: string
  title?: string
  mode: SessionMode
  startedAt: string
  endedAt?: string
  summary?: string
}

export interface Contribution {
  id: string
  sessionId: string
  text: string
  source: string
  createdAt: string
}

export interface Memory {
  id: string
  sessionId: string
  type: MemoryType
  topic: string
  summary: string
  content?: string
  confidence: number
  embedding?: number[]
  createdAt: string
}

export interface Reflection {
  id: string
  sessionId: string
  text: string
  relatedTo: string[]
  createdAt: string
}

export interface AIMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface ChatRequest {
  sessionId: string
  message: string
  memories?: Memory[]
}

export interface ChatResponse {
  reply: string
  memories: Memory[]
  reflections: Reflection[]
}

export type ConceptType =
  | "technology"
  | "language"
  | "project"
  | "person"
  | "topic"
  | "skill"
  | "habit"
  | "resource"
  | "generic"

export interface Concept {
  id: string
  name: string
  type: ConceptType
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

export type InsightType =
  | "pattern"
  | "trend"
  | "observation"
  | "milestone"
  | "suggestion"

export interface Insight {
  id: string
  type: InsightType
  title: string
  description: string
  category: MemoryType
  strength: number
  relatedMemoryIds: string[]
  createdAt: string
}

export interface GenerateInsightsResponse {
  insights: Insight[]
}

export type GoalStatus = "active" | "completed" | "abandoned"

export interface Goal {
  id: string
  userId: string
  title: string
  description: string
  category: MemoryType
  status: GoalStatus
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
  category?: MemoryType
  targetDate?: string
}

export interface UpdateGoalRequest {
  title?: string
  description?: string
  category?: MemoryType
  status?: GoalStatus
  targetDate?: string
}

export interface AddProgressRequest {
  note: string
  progressDelta: number
}

export interface APIResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}
