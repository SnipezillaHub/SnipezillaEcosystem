/**
 * Simple task executor: registers and runs tasks by name
 * Expanded with: typed results, optional timeouts, single-step execution,
 * bulk ops, queue utilities, and safer error handling
 */

export type Handler<TParams = any, TResult = any> = (params: TParams) => Promise<TResult>

export interface Task<TParams = any> {
  id: string
  type: string
  params: TParams
  timeoutMs?: number
}

export interface TaskResult<TResult = any> {
  id: string
  result?: TResult
  error?: string
}

export class ExecutionEngine {
  private handlers: Record<string, Handler<any, any>> = {}
  private queue: Array<Task<any>> = []

  register<TParams = any, TResult = any>(type: string, handler: Handler<TParams, TResult>): void {
    this.handlers[type] = handler as Handler<any, any>
  }

  registerMany(map: Record<string, Handler<any, any>>): void {
    for (const [type, handler] of Object.entries(map)) this.register(type, handler)
  }

  hasHandler(type: string): boolean {
    return typeof this.handlers[type] === "function"
  }

  enqueue<TParams = any>(id: string, type: string, params: TParams, options?: { timeoutMs?: number }): void {
    if (!this.handlers[type]) throw new Error(`No handler for ${type}`)
    this.queue.push({ id, type, params, timeoutMs: options?.timeoutMs })
  }

  enqueueBatch(tasks: Array<Task<any>>): void {
    for (const t of tasks) this.enqueue(t.id, t.type, t.params, { timeoutMs: t.timeoutMs })
  }

  get size(): number {
    return this.queue.length
  }

  clear(): void {
    this.queue.length = 0
  }

  cancel(id: string): boolean {
    const idx = this.queue.findIndex(t => t.id === id)
    if (idx >= 0) {
      this.queue.splice(idx, 1)
      return true
    }
    return false
  }

  async runNext(): Promise<TaskResult | undefined> {
    const task = this.queue.shift()
    if (!task) return undefined
    try {
      const handler = this.handlers[task.type]
      const data = await this.executeWithTimeout(handler(task.params), task.timeoutMs)
      return { id: task.id, result: data }
    } catch (err) {
      return { id: task.id, error: this.stringifyError(err) }
    }
  }

  /**
   * Run all queued tasks with optional concurrency (defaults to 1)
   */
  async runAll(concurrency = 1): Promise<Array<TaskResult>> {
    if (!Number.isInteger(concurrency) || concurrency < 1) concurrency = 1
    const results: TaskResult[] = []
    const workers: Array<Promise<void>> = []

    const worker = async () => {
      // Continuously pull from the shared queue until empty
      for (;;) {
        const next = this.queue.shift()
        if (!next) break
        try {
          const handler = this.handlers[next.type]
          const data = await this.executeWithTimeout(handler(next.params), next.timeoutMs)
          results.push({ id: next.id, result: data })
        } catch (err) {
          results.push({ id: next.id, error: this.stringifyError(err) })
        }
      }
    }

    for (let i = 0; i < concurrency; i++) workers.push(worker())
    await Promise.all(workers)
    return results
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
    if (!timeoutMs || timeoutMs <= 0) return promise
    let timeoutHandle: NodeJS.Timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => reject(new Error(`Task timed out after ${timeoutMs}ms`)), timeoutMs)
    })
    try {
      const result = await Promise.race([promise, timeoutPromise])
      return result as T
    } finally {
      // @ts-expect-error timeoutHandle is always assigned when timeoutMs > 0
      clearTimeout(timeoutHandle)
    }
  }

  private stringifyError(err: unknown): string {
    if (err instanceof Error) return err.message
    try {
      return typeof err === "string" ? err : JSON.stringify(err)
    } catch {
      return "Unknown error"
    }
  }
}
