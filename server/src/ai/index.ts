import type { AIProvider } from "./provider.js"
import { config } from "../config.js"
import { OpenAIProvider } from "./openai.js"
import { OpenRouterProvider } from "./openrouter.js"
import { GeminiProvider } from "./gemini.js"
import { ClaudeProvider } from "./claude.js"
import { OllamaProvider } from "./ollama.js"

let provider: AIProvider | null = null

export function getAIProvider(): AIProvider {
  if (provider) return provider

  switch (config.ai.provider) {
    case "openai":
      provider = new OpenAIProvider()
      break
    case "openrouter":
      provider = new OpenRouterProvider()
      break
    case "gemini":
      provider = new GeminiProvider()
      break
    case "claude":
      provider = new ClaudeProvider()
      break
    case "ollama":
      provider = new OllamaProvider()
      break
    default:
      throw new Error(`Unknown AI provider: ${config.ai.provider}. Supported: openai, openrouter, gemini, claude, ollama`)
  }

  return provider
}
