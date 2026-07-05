import type { AIProvider, AIMessage, ChatOptions, ChatResponse } from "./provider.js"
import { config } from "../config.js"

interface ClaudeContent {
  text?: string
}

interface ClaudeUsage {
  input_tokens?: number
  output_tokens?: number
}

interface ClaudeResponse {
  content?: ClaudeContent[]
  usage?: ClaudeUsage
}

export class ClaudeProvider implements AIProvider {
  private apiKey: string
  private model: string

  constructor() {
    this.apiKey = config.ai.claude.apiKey
    this.model = config.ai.claude.model
  }

  async chat(messages: AIMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const systemMessages = messages.filter((m) => m.role === "system")
    const chatMessages = messages.filter((m) => m.role !== "system")

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: options?.maxTokens ?? 2048,
      messages: chatMessages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    }

    if (systemMessages.length > 0) {
      body.system = systemMessages.map((m) => m.content).join("\n")
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Claude API error: ${response.status} — ${error}`)
    }

    const data = (await response.json()) as ClaudeResponse
    return {
      content: data.content?.[0]?.text ?? "",
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens ?? 0,
            completionTokens: data.usage.output_tokens ?? 0,
          }
        : undefined,
    }
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error("Claude does not support embeddings. Use OpenAI or another provider for embeddings.")
  }
}
