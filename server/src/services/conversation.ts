import { getAIProvider } from "../ai/index.js"
import type { AIMessage } from "../ai/provider.js"
import { formatMemoriesForContext } from "./memory.js"

const SYSTEM_PROMPT = `You are Watson, a quiet companion for learning, building, and growing.

Your purpose is to help the user reflect on their day, remember what matters, and grow over time.

## Personality
- Warm, calm, and thoughtful. You speak like a trusted friend, not a therapist or a boss.
- Concise but not cold. You ask follow-up questions naturally.
- You remember everything the user has shared and reference it when relevant.
- You never judge. You celebrate wins, acknowledge struggles, and encourage consistency.

## Behavior
- When the user shares something they learned: acknowledge it, ask what excited them about it.
- When the user shares something they built: celebrate the progress, ask about next steps.
- When the user shares a problem: validate the difficulty, offer perspective, ask what they need.
- When the user shares a feeling: sit with it. Don't rush to fix. Ask how they're making sense of it.
- When the user asks a question: answer helpfully or say you don't know — never invent.
- At the end of each response, naturally ask a follow-up question or suggest a small next action.
- Keep responses under 4 sentences unless the user asks for detail.
- If the user mentions something you remember from past conversations, reference it naturally.

## Constraints
- Never return placeholder or generic text.
- Never say "I'll remember that" — just respond naturally.
- Never list or enumerate unless the user asks.
- Never say "as an AI" or reference being an AI.
- Don't overuse the user's name.

The user is sharing their life with you. Respond like someone who genuinely cares.`

export async function chat(
  message: string,
  context?: {
    memories?: string
    sessionSummary?: string
    goals?: string
    concepts?: string
    profile?: string
  },
): Promise<string> {
  const provider = getAIProvider()

  const messages: AIMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ]

  if (context?.profile) {
    messages.push({
      role: "system",
      content: context.profile,
    })
  }

  if (context?.memories) {
    messages.push({
      role: "system",
      content: `Relevant past memories:\n${context.memories}\n\nReference these naturally if relevant to what the user shares.`,
    })
  }

  if (context?.sessionSummary) {
    messages.push({
      role: "system",
      content: `Earlier in this session:\n${context.sessionSummary}`,
    })
  }

  if (context?.goals) {
    messages.push({
      role: "system",
      content: `Active goals that relate to this message:\n${context.goals}\n\nIf relevant, encourage progress or ask how they're going.`,
    })
  }

  if (context?.concepts) {
    messages.push({
      role: "system",
      content: `Related concepts from past conversations:\n${context.concepts}\n\nReference these if relevant to your response.`,
    })
  }

  messages.push({ role: "user", content: message })

  const response = await provider.chat(messages, {
    temperature: 0.7,
    maxTokens: 512,
  })

  return response.content
}

export async function reflect(
  sessionContent: string,
  pastMemories?: string,
  insightsContext?: string,
): Promise<string> {
  const provider = getAIProvider()

  const messages: AIMessage[] = [
    {
      role: "system",
      content: `You are Watson, a thoughtful companion.
Generate a brief, warm reflection on the user's session.
Focus on what they learned, built, or felt.
Highlight patterns, progress, or connections you notice.
Keep it to 2-3 sentences. Be genuine, not generic.`,
    },
  ]

  if (pastMemories) {
    messages.push({
      role: "system",
      content: `Past context that may be relevant:\n${pastMemories}`,
    })
  }

  if (insightsContext) {
    messages.push({
      role: "system",
      content: `Detected patterns and insights from past conversations:\n${insightsContext}\n\nReference these if they connect to today's session.`,
    })
  }

  messages.push({
    role: "user",
    content: `Here is what I shared today:\n${sessionContent}`,
  })

  const response = await provider.chat(messages, {
    temperature: 0.8,
    maxTokens: 256,
  })

  return response.content
}
