import OpenAI from "openai"
import type { AIProvider, AIMessage, ChatOptions, ChatResponse } from "./provider.js"
import { config } from "../config.js"

export class OpenAIProvider implements AIProvider {
  private client: OpenAI
  private model: string

  constructor() {
    this.client = new OpenAI({ apiKey: config.ai.openai.apiKey })
    this.model = config.ai.openai.model
  }

  async chat(messages: AIMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
    })

    const choice = completion.choices[0]
    return {
      content: choice?.message?.content ?? "",
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
          }
        : undefined,
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    })
    return response.data[0].embedding
  }
}
