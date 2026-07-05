"use client"

import { useState, useCallback } from "react"
import type { Workspace } from "@/lib/api/types"

const DEFAULT_WORKSPACES: Workspace[] = [
  { id: "default", name: "My Space", type: "Personal", createdAt: new Date().toISOString() },
]

export function useWorkspace() {
  const [workspaces] = useState<Workspace[]>(DEFAULT_WORKSPACES)
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null)

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? null

  const selectWorkspace = useCallback((workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId)
  }, [])

  return { workspaces, currentWorkspaceId, currentWorkspace, selectWorkspace }
}
