import { buildApp } from "./app.js"
import { config } from "./config.js"
import { hydrateFromDb } from "./services/hydrate.js"

async function main() {
  const app = await buildApp()

  await hydrateFromDb()

  try {
    await app.listen({ port: config.port, host: config.host })
    console.log(`Watson server running at http://${config.host}:${config.port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
