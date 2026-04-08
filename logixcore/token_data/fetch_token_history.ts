export interface TokenDataPoint {
  timestamp: number
  priceUsd: number
  volumeUsd: number
  marketCapUsd: number
}

export class TokenDataFetcher {
  constructor(private apiBase: string) {}

  /**
   * Fetches an array of TokenDataPoint for the given token symbol.
   * Expects endpoint: `${apiBase}/tokens/${symbol}/history`
   */
  async fetchHistory(symbol: string): Promise<TokenDataPoint[]> {
    const res = await fetch(`${this.apiBase}/tokens/${encodeURIComponent(symbol)}/history`)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to fetch history for ${symbol}: HTTP ${res.status} - ${text}`)
    }

    const raw = (await res.json()) as any[]

    return raw.map(r => ({
      timestamp: r.time * 1000,
      priceUsd: Number(r.priceUsd),
      volumeUsd: Number(r.volumeUsd),
      marketCapUsd: Number(r.marketCapUsd),
    }))
  }

  /**
   * Fetch latest datapoint only.
   */
  async fetchLatest(symbol: string): Promise<TokenDataPoint | null> {
    const history = await this.fetchHistory(symbol)
    return history.length > 0 ? history[history.length - 1] : null
  }

  /**
   * Fetch history within a time range.
   */
  async fetchHistoryInRange(symbol: string, from: number, to: number): Promise<TokenDataPoint[]> {
    const history = await this.fetchHistory(symbol)
    return history.filter(p => p.timestamp >= from && p.timestamp <= to)
  }
}
