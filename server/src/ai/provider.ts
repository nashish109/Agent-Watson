export interface AIMessage {
  role: "user" | "assistant" | "system"
  content: string
}

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
}

export interface ChatResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

export interface AIProvider {
  chat(messages: AIMessage[], options?: ChatOptions): Promise<ChatResponse>
  embed(text: string): Promise<number[]>
}
