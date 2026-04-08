import { z } from "zod"

/**
 * Schema type for validating action inputs.
 */
export type ActionSchema = z.ZodObject<z.ZodRawShape>

/**
 * Standardized response type for any flow action.
 */
export interface ActionResponse<T> {
  notice: string
  data?: T
  error?: string
  meta?: Record<string, any>
}

/**
 * Base contract for every action inside the flow.
 */
export interface BaseAction<
  S extends ActionSchema,
  R,
  Ctx = unknown
> {
  /** Unique identifier of the action */
  id: string

  /** One-line summary of the action purpose */
  summary: string

  /** Zod schema for validating inputs */
  input: S

  /** Execute the action with validated payload and context */
  execute(args: {
    payload: z.infer<S>
    context: Ctx
  }): Promise<ActionResponse<R>>
}

/**
 * Utility: safely validate action input before execution.
 */
export function validateActionInput<S extends ActionSchema>(
  schema: S,
  raw: unknown
): { success: boolean; data?: z.infer<S>; error?: string } {
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map(e => e.message).join("; ") }
  }
  return { success: true, data: parsed.data }
}
