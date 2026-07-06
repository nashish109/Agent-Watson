import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { generateBriefing, getAllInsights, generateInsights } from "../services/insights.js"
import { getAllStoredMemories } from "../services/memory.js"

export async function insightRoutes(app: FastifyInstance) {
  app.post("/api/insights/generate", async (request) => {
    const body = z.object({ userId: z.string().default("default") }).parse(request.body)

    const userMemories = getAllStoredMemories().filter((m) => m.userId === body.userId)

    if (userMemories.length < 2) {
      return {
        ok: true,
        briefing: null,
        message: "Share a few thoughts first to generate a meaningful briefing.",
      }
    }

    const briefing = await generateBriefing(userMemories)

    return {
      ok: true,
      briefing,
      message: briefing ? null : "Not enough patterns to generate a briefing yet.",
    }
  })

  app.get("/api/insights", async () => {
    const insights = getAllInsights()

    return {
      ok: true,
      insights: insights.map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        description: i.description,
        category: i.category,
        strength: i.strength,
        relatedMemoryIds: i.relatedMemoryIds,
        createdAt: i.createdAt,
      })),
    }
  })
}
