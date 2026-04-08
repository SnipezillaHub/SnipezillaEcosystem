import { z } from "zod"

/**
 * Schema for scheduling a new task via Typeform submission.
 * Validates:
 *  - name length
 *  - supported task types
 *  - at least one parameter key
 *  - cron expression format
 */
export const TaskFormSchema = z.object({
  taskName: z.string()
    .min(3, "Task name must be at least 3 characters")
    .max(100, "Task name must be at most 100 characters"),
  
  taskType: z.enum(["anomalyScan", "tokenAnalytics", "whaleMonitor"]),
  
  parameters: z.record(z.string(), z.string())
    .refine(obj => Object.keys(obj).length > 0, "Parameters must include at least one key-value pair"),
  
  scheduleCron: z.string().regex(
    /^(\*|([0-5]?\d)) (\*|([01]?\d|2[0-3])) (\*|([1-9]|[12]\d|3[01])) (\*|(1[0-2]|[1-9])) (\*|[0-6])$/,
    "Invalid cron expression. Format: 'min hour day month weekday'"
  ),
})

export type TaskFormInput = z.infer<typeof TaskFormSchema>
