import type { Signal } from "./SignalApiClient"

/**
 * Processes raw signals into actionable events.
 */
export class SignalProcessor {
  /**
   * Filter signals by type and recency.
   * @param signals Array of Signal
   * @param type Desired signal type
   * @param sinceTimestamp Only include signals after this time
   */
  filter(signals: Signal[], type: string, sinceTimestamp: number): Signal[] {
    return signals.filter(
      s => s.type === type && s.timestamp > sinceTimestamp
    )
  }

  /**
   * Aggregate signals by type, counting occurrences.
   * @param signals Array of Signal
   */
  aggregateByType(signals: Signal[]): Record<string, number> {
    return signals.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * Find the most frequent signal type in the batch.
   * Returns undefined if no signals are provided.
   */
  mostFrequentType(signals: Signal[]): string | undefined {
    const counts = this.aggregateByType(signals)
    return Object.keys(counts).reduce(
      (maxType, type) =>
        counts[type] > (counts[maxType] ?? 0) ? type : maxType,
      Object.keys(counts)[0]
    )
  }

  /**
   * Group signals by type for structured analysis.
   */
  groupByType(signals: Signal[]): Record<string, Signal[]> {
    return signals.reduce((acc, s) => {
      if (!acc[s.type]) acc[s.type] = []
      acc[s.type].push(s)
      return acc
    }, {} as Record<string, Signal[]>)
  }

  /**
   * Transform a signal into a human-readable summary string.
   */
  summarize(signal: Signal): string {
    const time = new Date(signal.timestamp).toISOString()
    return `[${time}] ${signal.type.toUpperCase()}: ${JSON.stringify(
      signal.payload
    )}`
  }
}
