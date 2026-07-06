import type { Session, ChatResponse, QueryResponse, ReflectResponse, Goal, GoalProgressUpdate, CreateGoalRequest, AddProgressRequest, ConceptGraphResponse, InsightsResponse } from "./types"
import { ApiConnectionError } from "./errors"

const USER_ID = "default"

function getBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (apiUrl) {
    return apiUrl.replace(/\/+$/, "")
  }
  return ""
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}${path}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "")
    throw new ApiConnectionError(`${res.status} on ${path}${bodyText ? ` — ${bodyText.slice(0, 200)}` : ""}`)
  }
  const data = await res.json()
  if (data && typeof data === "object" && "ok" in data && data.ok === false) {
    throw new ApiConnectionError(data.error ?? `Error on ${path}`)
  }
  return data as T
}

async function apiGet<T>(path: string): Promise<T> {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}${path}`
  const res = await fetch(url)
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "")
    throw new ApiConnectionError(`${res.status} on ${path}${bodyText ? ` — ${bodyText.slice(0, 200)}` : ""}`)
  }
  const data = await res.json()
  if (data && typeof data === "object" && "ok" in data && data.ok === false) {
    throw new ApiConnectionError(data.error ?? `Error on ${path}`)
  }
  return data as T
}

export async function createSession(
  userId: string = USER_ID,
): Promise<Session> {
  return apiPost<Session>("/api/sessions", { userId })
}

export async function getSession(sessionId: string): Promise<Session> {
  return apiGet<Session>(`/api/sessions/${sessionId}`)
}

export async function chat(
  sessionId: string,
  message: string,
  userId: string = USER_ID,
): Promise<ChatResponse> {
  return apiPost<ChatResponse>("/api/chat", { sessionId, message, userId })
}

export async function getContext(
  text: string,
  userId: string = USER_ID,
): Promise<QueryResponse> {
  return apiPost<QueryResponse>("/api/search", { text, userId })
}

export async function getReflection(
  sessionId: string,
  userId: string = USER_ID,
): Promise<ReflectResponse> {
  return apiPost<ReflectResponse>(`/api/sessions/${sessionId}/reflect`, { userId })
}

export async function createGoal(req: CreateGoalRequest, userId: string = USER_ID): Promise<Goal> {
  return apiPost<Goal>("/api/goals", { ...req, userId })
}

export async function getGoals(userId: string = USER_ID): Promise<Goal[]> {
  return apiGet<Goal[]>(`/api/goals?userId=${userId}`)
}

export async function updateGoal(goalId: string, req: Record<string, unknown>): Promise<Goal> {
  return apiPost<Goal>(`/api/goals/${goalId}`, req)
}

export async function addGoalProgress(goalId: string, req: AddProgressRequest): Promise<GoalProgressUpdate> {
  return apiPost<GoalProgressUpdate>(`/api/goals/${goalId}/progress`, req)
}

export async function getGoalProgress(goalId: string): Promise<GoalProgressUpdate[]> {
  return apiGet<GoalProgressUpdate[]>(`/api/goals/${goalId}/progress`)
}

export async function deleteGoal(goalId: string): Promise<void> {
  await apiPost(`/api/goals/${goalId}/delete`, {})
}

export async function getConceptGraph(): Promise<ConceptGraphResponse> {
  return apiGet<ConceptGraphResponse>("/api/concepts/graph")
}

export async function generateInsights(userId: string = USER_ID): Promise<InsightsResponse> {
  return apiPost<InsightsResponse>("/api/insights/generate", { userId })
}

export async function getInsights(userId: string = USER_ID): Promise<InsightsResponse> {
  return apiGet<InsightsResponse>(`/api/insights?userId=${userId}`)
}

export async function getSessionMessages(sessionId: string): Promise<{ ok: boolean; messages: Array<{ role: string; content: string; createdAt: string }> }> {
  return apiGet(`/api/sessions/${sessionId}/messages`)
}

export async function checkToday(userId: string = USER_ID): Promise<{ ok: boolean; contributed: boolean }> {
  return apiGet(`/api/user/check-today?userId=${userId}`)
}
