"use client"

import { useState, useCallback, useRef } from "react"
import {
  type Memory,
  type Session,
  createNewSession,
  getReflection,
  getMemoryLabel,
  extractTopic,
} from "@/data/memories"

let memoryCounter = 0

export function useSession() {
  const [session, setSession] = useState<Session>(() => createNewSession())

  const addMemory = useCallback(
    (memory: Memory) => {
      setSession((prev) => ({
        ...prev,
        memories: [...prev.memories, memory],
      }))
    },
    [],
  )

  const contribute = useCallback(
    (content: string): Memory => {
      const memory: Memory = {
        id: `mem-${Date.now()}-${memoryCounter++}`,
        type: "contribution",
        content,
        createdAt: new Date(),
        sessionId: session.id,
      }
      addMemory(memory)
      return memory
    },
    [session.id, addMemory],
  )

  const createMemory = useCallback(
    (content: string): Memory => {
      const topic = extractTopic(content)
      const memory: Memory = {
        id: `mem-${Date.now()}-${memoryCounter++}`,
        type: "memory-created",
        content: topic,
        createdAt: new Date(),
        sessionId: session.id,
        topic,
      }
      addMemory(memory)
      return memory
    },
    [session.id, addMemory],
  )

  const reflect = useCallback(
    (): Memory => {
      const memory: Memory = {
        id: `mem-${Date.now()}-${memoryCounter++}`,
        type: "reflection",
        content: getReflection(),
        createdAt: new Date(),
        sessionId: session.id,
        memoryLabel: getMemoryLabel(),
      }
      addMemory(memory)
      return memory
    },
    [session.id, addMemory],
  )

  return { session, contribute, createMemory, reflect }
}
