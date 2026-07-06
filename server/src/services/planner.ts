import { getAIProvider } from "../ai/index.js"
import type { AIMessage } from "../ai/provider.js"

export interface PlannedAction {
  tool: string
  params: Record<string, unknown>
}

export interface PlanResult {
  reasoning: string
  actions: PlannedAction[]
}

const PLANNER_PROMPT = `You are Watson's action planner. Your job is to analyze the user's message and decide what actions to execute.

## Available Tools

### create_goal
Create a new goal.
Params: { title: string, description?: string, category?: string, targetDate?: string }

### update_goal
Update an existing goal's status, progress, or details.
Params: { goalId: string, title?: string, description?: string, status?: "active" | "completed" | "archived", progress?: number, category?: string, targetDate?: string }
If the user says something is "done" or "complete", set status to "completed".

### delete_goal
Delete a goal permanently.
Params: { goalId: string }

### search_memories
Search past memories for information.
Params: { query: string }

### create_memory
Store a new memory explicitly requested by the user.
Params: { content: string, type?: string, topic?: string }

### reflect
Generate a reflection on the current session.
Params: { sessionId: string }

## Rules
1. If the user asks you to DO something (create, update, delete, save, remember, set, add, remove), return the corresponding action.
2. If they're just chatting, asking a question, or giving an opinion, return no actions.
3. For compound requests like "create a study plan and add it to my goals", return MULTIPLE actions in order (e.g., first create_goal, then create_memory).
4. If you're unsure which goal to update, try to infer it from context. If truly ambiguous, return no actions and let the conversation handle it.
5. NEVER return actions for things you can't do (e.g., sending emails, browsing the web).
6. When the user says "remember this" or "save this", use create_memory.

Return ONLY valid JSON:
{
  "reasoning": "Brief explanation of what you decided and why",
  "actions": [{ "tool": "tool_name", "params": { ... } }]
}`

export async function planActions(
  message: string,
  context: {
    goals?: string
    memories?: string
    sessionId?: string
  },
): Promise<PlanResult> {
  const provider = getAIProvider()

  const messages: AIMessage[] = [
    { role: "system", content: PLANNER_PROMPT },
  ]

  if (context.goals) {
    messages.push({
      role: "system",
      content: `User's current goals:\n${context.goals}`,
    })
  }

  if (context.memories) {
    messages.push({
      role: "system",
      content: `Relevant past memories:\n${context.memories}`,
    })
  }

  messages.push({ role: "user", content: message })

  const response = await provider.chat(messages, {
    temperature: 0.1,
    maxTokens: 512,
  })

  try {
    const cleaned = response.content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*$/gm, "")
      .trim()

    const parsed = JSON.parse(cleaned) as PlanResult
    return {
      reasoning: parsed.reasoning || "",
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    }
  } catch {
    return { reasoning: "Failed to parse plan", actions: [] }
  }
}
