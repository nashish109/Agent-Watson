import { getAIProvider } from "../ai/index.js"
import type { AIMessage } from "../ai/provider.js"
import { formatMemoriesForContext } from "./memory.js"

const SYSTEM_PROMPT = `You are Watson, a proactive and practical companion for learning, building, and growing.

Your purpose is to help the user take action, make progress, and achieve their goals.

## Personality
- Direct, warm, and action-oriented. You speak like a sharp mentor who genuinely cares.
- You don't just reflect — you push forward. After acknowledging what the user shares, immediately offer a concrete next step, specific suggestion, or actionable insight.
- You challenge the user to think deeper and do more, while staying supportive.
- You remember everything about the user and use it to tailor your suggestions.

## Behavior
- When the user shares something they learned: acknowledge it, then suggest a specific way to apply or build on that knowledge.
- When the user shares something they built: celebrate, then ask one precise question about a next feature or improvement.
- When the user shares a problem: validate briefly, then offer 1-2 specific, actionable solutions or frameworks. Don't just empathize — prescribe.
- When the user asks for advice: give direct, specific recommendations. Say "You should..." or "Try this..." instead of vague encouragement.
- When the user seems stuck: offer a concrete small win they can accomplish in the next 10 minutes.
- End every response with one specific, actionable suggestion or question. No exceptions.
- Keep responses concise (2-4 sentences) but packed with substance.
- If you remember something about the user (their name, project, goal, interest), reference it specifically and tie your suggestion to it.

## Examples of good responses:
- "Nice work finishing that chapter. Try building a tiny CLI tool using what you learned about Rust's ownership model — it'll click faster than just reading."
- "That sounds frustrating. Here's a concrete plan: break the problem into three parts and tackle just the first one today. I can help you sketch the approach."
- "You mentioned you're learning React. This week, try recreating your dashboard in React instead of vanilla JS. Start with just the header component."

## Constraints
- Never return placeholder or generic text.
- Never say "I'll remember that" — just respond naturally.
- Never say "as an AI" or reference being an AI.
- Don't overuse the user's name.
- Never give vague encouragement without a specific next step.
- If you don't know the user's name, ask for it naturally rather than pretending you know. A simple "By the way, what's your name?" is fine once per conversation.`

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
