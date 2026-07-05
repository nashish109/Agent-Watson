import Fastify from "fastify"
import cors from "@fastify/cors"
import { config } from "./config.js"
import { healthRoutes } from "./routes/health.js"
import { sessionRoutes } from "./routes/sessions.js"
import { chatRoutes } from "./routes/chat.js"
import { insightRoutes } from "./routes/insights.js"
import { goalRoutes } from "./routes/goals.js"
import { conceptRoutes } from "./routes/concepts.js"

export async function buildApp() {
  const app = Fastify({
    logger: config.nodeEnv !== "test",
  })

  await app.register(cors, {
    origin: config.cors.origin,
  })

  await app.register(healthRoutes)
  await app.register(sessionRoutes)
  await app.register(chatRoutes)
  await app.register(insightRoutes)
  await app.register(goalRoutes)
  await app.register(conceptRoutes)

  return app
}
