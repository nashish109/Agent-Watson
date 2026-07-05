import type { AIProvider, AIMessage, ChatOptions, ChatResponse } from "./provider.js"
import { config } from "../config.js"

interface OpenRouterChoice {
  message?: { content?: string }
}

interface OpenRouterUsage {
  prompt_tokens?: number
  completion_tokens?: number
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[]
  usage?: OpenRouterUsage
}

interface OpenRouterEmbeddingData {
  embedding?: number[]
}

interface OpenRouterEmbeddingResponse {
  data?: OpenRouterEmbeddingData[]
}

export class OpenRouterProvider implements AIProvider {
  private apiKey: string
  private model: string

  constructor() {
    this.apiKey = config.ai.openrouter.apiKey
    this.model = config.ai.openrouter.model
  }

  async chat(messages: AIMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} — ${error}`)
    }

    const data = (await response.json()) as OpenRouterResponse
    const choice = data.choices?.[0]
    return {
      content: choice?.message?.content ?? "",
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
          }
        : undefined,
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter embedding error: ${response.status}`)
    }

    const data = (await response.json()) as OpenRouterEmbeddingResponse
    return data.data?.[0]?.embedding ?? []
  }
}
