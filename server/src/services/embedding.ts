import { getAIProvider } from "../ai/index.js"

export async function generateEmbedding(text: string): Promise<number[]> {
  const provider = getAIProvider()

  try {
    const embedding = await provider.embed(text)
    if (embedding.length === 0) {
      throw new Error("Empty embedding returned")
    }
    return embedding
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("does not support embeddings")) {
      return generateFallbackEmbedding(text)
    }
    throw error
  }
}

function generateFallbackEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/)
  const dims = 128
  const vector = new Array(dims).fill(0)

  for (let i = 0; i < words.length; i++) {
    const hash = simpleHash(words[i])
    const idx = Math.abs(hash) % dims
    vector[idx] += 1
  }

  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  if (magnitude > 0) {
    for (let i = 0; i < dims; i++) {
      vector[i] /= magnitude
    }
  }

  return vector
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
  return magnitude === 0 ? 0 : dotProduct / magnitude
}
