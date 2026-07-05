import type {
  CreateSessionResponse,
  GetSessionResponse,
  ContributeResponse,
  QueryItem,
  QueryResponse,
  ReflectResponse,
} from "./types"
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
    throw new ApiConnectionError(`API error: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  if (data && typeof data === "object" && "ok" in data && data.ok === false) {
    throw new ApiConnectionError(data.error ?? "API returned an error")
  }
  return data as T
}

export async function createSession(
  userId: string = USER_ID,
  workspaceId?: string,
): Promise<CreateSessionResponse> {
  return apiPost<CreateSessionResponse>("/api/memory", {
    cmd: "create_session",
    user_id: userId,
    workspace_id: workspaceId,
  })
}

export async function getSession(
  sessionId: string,
  userId: string = USER_ID,
): Promise<GetSessionResponse> {
  return apiPost<GetSessionResponse>("/api/memory", {
    cmd: "get_session",
    session_id: sessionId,
    user_id: userId,
  })
}

export async function contribute(
  sessionId: string,
  userId: string,
  text: string,
): Promise<ContributeResponse> {
  return apiPost<ContributeResponse>("/api/memory", {
    cmd: "contribute",
    session_id: sessionId,
    user_id: userId,
    text,
    source: "user",
  })
}

export async function getContext(
  text: string,
  userId: string = USER_ID,
): Promise<QueryResponse> {
  return apiPost<QueryResponse>("/api/memory", {
    cmd: "query",
    text,
    user_id: userId,
  })
}

export async function getReflection(
  sessionId: string,
  userId: string = USER_ID,
): Promise<ReflectResponse> {
  return apiPost<ReflectResponse>("/api/memory", {
    cmd: "reflect",
    session_id: sessionId,
    user_id: userId,
  })
}

export async function queryItems(
  text: string,
  userId: string = USER_ID,
): Promise<QueryItem[]> {
  const result = await getContext(text, userId)
  return result.items ?? []
}
