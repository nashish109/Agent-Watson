import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { config } from "../config.js"
import * as schema from "./schema.js"

let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (!db) {
    db = drizzle(postgres(config.database.url, { max: 1 }), { schema })
  }
  return db
}
