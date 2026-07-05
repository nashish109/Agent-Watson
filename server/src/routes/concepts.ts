import type { FastifyInstance } from "fastify"
import { getAllConcepts, getConcept, getConceptEdges, getConceptGraph } from "../services/concepts.js"

export async function conceptRoutes(app: FastifyInstance) {
  app.get("/api/concepts", async () => {
    const conceptsList = getAllConcepts()
    return { ok: true, concepts: conceptsList }
  })

  app.get("/api/concepts/graph", async () => {
    const graph = getConceptGraph()
    return { ok: true, ...graph }
  })

  app.get<{ Params: { name: string } }>("/api/concepts/:name", async (request) => {
    const concept = getConcept(request.params.name)
    if (!concept) {
      return { ok: false, error: "Concept not found" }
    }

    const relatedEdges = getConceptEdges(concept.id)

    return {
      ok: true,
      concept,
      edges: relatedEdges,
    }
  })
}
