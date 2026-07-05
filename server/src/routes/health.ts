import type { FastifyInstance } from "fastify"

export async function healthRoutes(app: FastifyInstance) {
  app.get("/api/health", async () => {
    return { ok: true, status: "alive", timestamp: new Date().toISOString() }
  })
}
