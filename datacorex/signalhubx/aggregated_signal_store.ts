import type { SightCoreMessage } from "./WebSocketClient"

export interface AggregatedSignal {
  topic: string
  count: number
  lastPayload: any
  lastTimestamp: number
  firstTimestamp: number
}

export class SignalAggregator {
  private counts: Record<string, AggregatedSignal> = {}

  /**
   * Process an incoming WebSocket message and update aggregation.
   */
  processMessage(msg: SightCoreMessage): AggregatedSignal {
    const { topic, payload, timestamp } = msg
    const existing = this.counts[topic]

    const entry: AggregatedSignal = existing
      ? {
          ...existing,
          count: existing.count + 1,
          lastPayload: payload,
          lastTimestamp: timestamp,
        }
      : {
          topic,
          count: 1,
          lastPayload: payload,
          lastTimestamp: timestamp,
          firstTimestamp: timestamp,
        }

    this.counts[topic] = entry
    return entry
  }

  /**
   * Get aggregated data for a single topic.
   */
  getAggregated(topic: string): AggregatedSignal | undefined {
    return this.counts[topic]
  }

  /**
   * Get aggregated data for all topics.
   */
  getAllAggregated(): AggregatedSignal[] {
    return Object.values(this.counts)
  }

  /**
   * Find the most active topic by message count.
   */
  getMostActiveTopic(): AggregatedSignal | undefined {
    const all = this.getAllAggregated()
    return all.reduce((max, curr) =>
      curr.count > (max?.count ?? 0) ? curr : max, undefined as AggregatedSignal | undefined
    )
  }

  /**
   * Reset all aggregation state.
   */
  reset(): void {
    this.counts = {}
  }
}
