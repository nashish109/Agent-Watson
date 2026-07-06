import { type PlannedAction } from "./planner.js"
import {
  createGoal,
  updateGoal as updateGoalService,
  deleteGoal as deleteGoalService,
  getGoal,
  findRelatedGoals,
} from "./goals.js"
import { searchMemories } from "./memory.js"

export interface ActionResult {
  tool: string
  success: boolean
  data?: unknown
  error?: string
}

export async function executeAction(
  action: PlannedAction,
  context: { userId: string; sessionId: string },
): Promise<ActionResult> {
  try {
    switch (action.tool) {
      case "create_goal": {
        const goal = createGoal({
          userId: context.userId,
          title: String(action.params.title ?? ""),
          description: action.params.description ? String(action.params.description) : undefined,
          category: action.params.category ? String(action.params.category) : undefined,
          targetDate: action.params.targetDate ? String(action.params.targetDate) : undefined,
        })
        return { tool: "create_goal", success: true, data: goal }
      }

      case "update_goal": {
        const goalId = String(action.params.goalId ?? "")
        if (!goalId) {
          // If no goalId given, try to find by title
          const titleMatch = String(action.params.title ?? "").toLowerCase()
          const found = findRelatedGoals(titleMatch, context.userId)
          if (found.length === 0) {
            return { tool: "update_goal", success: false, error: "No matching goal found" }
          }
          const updated = updateGoalService(found[0].id, action.params as Record<string, unknown>)
          if (!updated) return { tool: "update_goal", success: false, error: "Goal not found" }
          return { tool: "update_goal", success: true, data: updated }
        }
        const updates: Record<string, unknown> = {}
        if (action.params.title !== undefined) updates.title = String(action.params.title)
        if (action.params.description !== undefined) updates.description = String(action.params.description)
        if (action.params.status !== undefined) updates.status = String(action.params.status)
        if (action.params.progress !== undefined) updates.progress = Number(action.params.progress)
        if (action.params.category !== undefined) updates.category = String(action.params.category)
        if (action.params.targetDate !== undefined) updates.targetDate = String(action.params.targetDate)
        const updated = updateGoalService(goalId, updates)
        if (!updated) return { tool: "update_goal", success: false, error: "Goal not found" }
        return { tool: "update_goal", success: true, data: updated }
      }

      case "delete_goal": {
        const goalId = String(action.params.goalId ?? "")
        if (!goalId) {
          const titleMatch = String(action.params.title ?? "").toLowerCase()
          const found = findRelatedGoals(titleMatch, context.userId)
          if (found.length === 0) {
            return { tool: "delete_goal", success: false, error: "No matching goal found" }
          }
          deleteGoalService(found[0].id)
          return { tool: "delete_goal", success: true, data: { deleted: found[0].title } }
        }
        const deleted = deleteGoalService(goalId)
        if (!deleted) return { tool: "delete_goal", success: false, error: "Goal not found" }
        return { tool: "delete_goal", success: true }
      }

      case "search_memories": {
        const query = String(action.params.query ?? "")
        if (!query) return { tool: "search_memories", success: false, error: "No query provided" }
        const results = await searchMemories(query, 5)
        return { tool: "search_memories", success: true, data: results }
      }

      case "create_memory": {
        const content = String(action.params.content ?? "")
        if (!content) return { tool: "create_memory", success: false, error: "No content provided" }
        return {
          tool: "create_memory",
          success: true,
          data: { content, type: String(action.params.type ?? "general"), topic: String(action.params.topic ?? "note") },
        }
      }

      case "reflect": {
        return { tool: "reflect", success: true, data: { sessionId: context.sessionId } }
      }

      default:
        return { tool: action.tool, success: false, error: `Unknown tool: ${action.tool}` }
    }
  } catch (err) {
    return { tool: action.tool, success: false, error: String(err) }
  }
}

export function formatActionResult(action: PlannedAction, result: ActionResult): string {
  const toolName = action.tool.replace(/_/g, " ")
  if (!result.success) {
    return `[Action: ${toolName}] Failed: ${result.error}`
  }

  switch (action.tool) {
    case "create_goal": {
      const goal = result.data as { title?: string; category?: string }
      return `[Action: Created goal "${goal?.title ?? ""}" in category "${goal?.category ?? "general"}"]`
    }
    case "update_goal": {
      const goal = result.data as { title?: string; status?: string; progress?: number }
      const changes: string[] = []
      if (action.params.status) changes.push(`status → ${action.params.status}`)
      if (action.params.progress !== undefined) changes.push(`progress → ${action.params.progress}%`)
      return `[Action: Updated goal "${goal?.title ?? ""}" — ${changes.join(", ") || "details changed"}]`
    }
    case "delete_goal": {
      const data = result.data as { deleted?: string } | undefined
      return `[Action: Deleted goal "${data?.deleted ?? ""}"]`
    }
    case "search_memories": {
      const data = result.data as Array<unknown> | undefined
      return `[Action: Searched memories — found ${data?.length ?? 0} results]`
    }
    case "create_memory": {
      return `[Action: Memory saved]`
    }
    case "reflect":
      return `[Action: Reflection generated]`
    default:
      return `[Action: ${toolName} executed]`
  }
}
