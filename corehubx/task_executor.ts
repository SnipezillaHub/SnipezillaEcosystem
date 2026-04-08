import { execCommand, ExecResult } from "./execCommand"

export interface ShellTask {
  id: string
  command: string
  description?: string
}

export interface ShellResult {
  taskId: string
  output?: string
  stderr?: string
  exitCode?: number
  error?: string
  executedAt: number
  finishedAt: number
}

export class ShellTaskRunner {
  private tasks: ShellTask[] = []

  /**
   * Schedule a shell task for execution.
   */
  scheduleTask(task: ShellTask): void {
    this.tasks.push(task)
  }

  /**
   * Execute all scheduled tasks in sequence and return detailed results.
   */
  async runAll(): Promise<ShellResult[]> {
    const results: ShellResult[] = []
    while (this.tasks.length > 0) {
      const task = this.tasks.shift()!
      const start = Date.now()
      try {
        const execRes: ExecResult = await execCommand(task.command)
        results.push({
          taskId: task.id,
          output: execRes.stdout,
          stderr: execRes.stderr,
          exitCode: execRes.exitCode,
          executedAt: start,
          finishedAt: Date.now(),
        })
      } catch (err: any) {
        results.push({
          taskId: task.id,
          error: err.message,
          executedAt: start,
          finishedAt: Date.now(),
        })
      }
    }
    return results
  }

  /**
   * Returns the number of scheduled tasks.
   */
  pendingCount(): number {
    return this.tasks.length
  }

  /**
   * Clear all scheduled tasks without executing them.
   */
  clear(): void {
    this.tasks = []
  }
}
