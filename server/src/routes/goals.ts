import type { FastifyInstance } from "fastify"
import { z } from "zod"
import {
  createGoal,
  getGoals,
  getGoal,
  updateGoal,
  addProgress,
  getProgress,
  deleteGoal,
} from "../services/goals.js"

export async function goalRoutes(app: FastifyInstance) {
  app.post("/api/goals", async (request) => {
    const body = z.object({
      userId: z.string().default("default"),
      title: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      targetDate: z.string().optional(),
    }).parse(request.body)

    const goal = createGoal(body)
    return goal
  })

  app.get("/api/goals", async (request) => {
    const query = z.object({
      userId: z.string().default("default"),
      status: z.string().optional(),
    }).parse(request.query)

    const goalsList = getGoals(query.userId, query.status as any)
    return goalsList
  })

  app.get<{ Params: { id: string } }>("/api/goals/:id", async (request) => {
    const goal = getGoal(request.params.id)
    if (!goal) {
      return { ok: false, error: "Goal not found" }
    }
    return goal
  })

  app.post<{ Params: { id: string } }>("/api/goals/:id", async (request) => {
    const body = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      status: z.string().optional(),
      targetDate: z.string().optional(),
    }).parse(request.body)

    const goal = updateGoal(request.params.id, body as any)
    if (!goal) {
      return { ok: false, error: "Goal not found" }
    }
    return goal
  })

  app.post<{ Params: { id: string } }>("/api/goals/:id/progress", async (request) => {
    const body = z.object({
      note: z.string().min(1),
      progressDelta: z.number().min(0).max(100),
    }).parse(request.body)

    const entry = addProgress(request.params.id, body)
    if (!entry) {
      return { ok: false, error: "Goal not found" }
    }
    return entry
  })

  app.get<{ Params: { id: string } }>("/api/goals/:id/progress", async (request) => {
    const entries = getProgress(request.params.id)
    return entries
  })

  app.post<{ Params: { id: string } }>("/api/goals/:id/delete", async (request) => {
    const deleted = deleteGoal(request.params.id)
    if (!deleted) {
      return { ok: false, error: "Goal not found" }
    }
    return { ok: true }
  })
}
