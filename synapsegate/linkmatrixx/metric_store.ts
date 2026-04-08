export interface MetricEntry {
  key: string
  value: number
  updatedAt: number
}

export class MetricsCache {
  private cache = new Map<string, MetricEntry>()

  get(key: string): MetricEntry | undefined {
    return this.cache.get(key)
  }

  set(key: string, value: number): void {
    this.cache.set(key, { key, value, updatedAt: Date.now() })
  }

  hasRecent(key: string, maxAgeMs: number): boolean {
    const entry = this.cache.get(key)
    return !!entry && Date.now() - entry.updatedAt < maxAgeMs
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  entries(): MetricEntry[] {
    return Array.from(this.cache.values())
  }

  /**
   * Return number of stored metrics.
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Get the most recent metric by updatedAt.
   */
  latest(): MetricEntry | undefined {
    let latest: MetricEntry | undefined
    for (const entry of this.cache.values()) {
      if (!latest || entry.updatedAt > latest.updatedAt) {
        latest = entry
      }
    }
    return latest
  }

  /**
   * Update a metric value only if it exists.
   */
  updateIfPresent(key: string, value: number): boolean {
    if (!this.cache.has(key)) return false
    this.set(key, value)
    return true
  }

  /**
   * Export cache as plain object for serialization.
   */
  toObject(): Record<string, MetricEntry> {
    const obj: Record<string, MetricEntry> = {}
    for (const [k, v] of this.cache.entries()) {
      obj[k] = v
    }
    return obj
  }
}
