import type { BaseAction, ActionResponse } from "./baseAction"
import { z } from "zod"

export interface AgentContext {
  apiEndpoint: string
  apiKey: string
  network?: string
}

/**
 * Central Agent: manages and routes calls to registered actions.
 */
export class ActionAgent {
  private actions = new Map<string, BaseAction<any, any, AgentContext>>()

  /**
   * Register a new action with this agent.
   */
  register<S, R>(action: BaseAction<S, R, AgentContext>): void {
    if (this.actions.has(action.id)) {
      throw new Error(`Action with id "${action.id}" is already registered`)
    }
    this.actions.set(action.id, action)
  }

  /**
   * Invoke a registered action with payload and context.
   */
  async invoke<R>(
    actionId: string,
    payload: unknown,
    ctx: AgentContext
  ): Promise<ActionResponse<R>> {
    const action = this.actions.get(actionId)
    if (!action) {
      throw new Error(`Unknown action "${actionId}"`)
    }

    const parsed = action.input.safeParse(payload)
    if (!parsed.success) {
      return {
        notice: `Validation failed for action "${actionId}"`,
        data: { issues: parsed.error.issues } as any,
      }
    }

    try {
      return await action.execute({ payload: parsed.data, context: ctx })
    } catch (err: any) {
      return {
        notice: `Execution error in action "${actionId}"`,
        data: { error: err.message } as any,
      }
    }
  }

  /**
   * List all registered action IDs.
   */
  listActions(): string[] {
    return Array.from(this.actions.keys())
  }

  /**
   * Clear all registered actions.
   */
  reset(): void {
    this.actions.clear()
  }
}
