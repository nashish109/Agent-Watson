import type { AIProvider, AIMessage, ChatOptions, ChatResponse } from "./provider.js"
import { config } from "../config.js"

interface GeminiPart {
  text?: string
}

interface GeminiContent {
  parts?: GeminiPart[]
}

interface GeminiCandidate {
  content?: GeminiContent
}

interface GeminiUsage {
  promptTokenCount?: number
  candidatesTokenCount?: number
}

interface GeminiResponse {
  candidates?: GeminiCandidate[]
  usageMetadata?: GeminiUsage
}

interface GeminiEmbeddingResponse {
  embedding?: { values?: number[] }
}

export class GeminiProvider implements AIProvider {
  private apiKey: string
  private model: string

  constructor() {
    this.apiKey = config.ai.gemini.apiKey
    this.model = config.ai.gemini.model
  }

  async chat(messages: AIMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const contents = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : msg.role,
      parts: [{ text: msg.content }],
    }))

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens ?? 2048,
          },
        }),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API error: ${response.status} — ${error}`)
    }

    const data = (await response.json()) as GeminiResponse
    const candidate = data.candidates?.[0]
    return {
      content: candidate?.content?.parts?.[0]?.text ?? "",
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount ?? 0,
            completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
          }
        : undefined,
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini embedding error: ${response.status}`)
    }

    const data = (await response.json()) as GeminiEmbeddingResponse
    return data.embedding?.values ?? []
  }
}
