import type { AIProvider, AIMessage, ChatOptions, ChatResponse } from "./provider.js"
import { config } from "../config.js"

interface OllamaChatResponse {
  message?: { content?: string }
}

interface OllamaEmbeddingResponse {
  embedding?: number[]
}

export class OllamaProvider implements AIProvider {
  private baseUrl: string
  private model: string

  constructor() {
    this.baseUrl = config.ai.ollama.baseUrl
    this.model = config.ai.ollama.model
  }

  async chat(messages: AIMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 2048,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`)
    }

    const data = (await response.json()) as OllamaChatResponse
    return {
      content: data.message?.content ?? "",
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: text,
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama embedding error: ${response.status}`)
    }

    const data = (await response.json()) as OllamaEmbeddingResponse
    return data.embedding ?? []
  }
}
