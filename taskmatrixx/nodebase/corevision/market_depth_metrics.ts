/**
 * Analyze on-chain orderbook depth for a given market
 * Improvements: options (timeout/retries), input validation, normalization, and safer metrics
 */

export interface Order {
  price: number
  size: number
}

export interface DepthMetrics {
  averageBidDepth: number
  averageAskDepth: number
  spread: number
}

export interface AnalyzerOptions {
  timeoutMs?: number
  maxRetries?: number
}

export class TokenDepthAnalyzer {
  private timeoutMs: number
  private maxRetries: number

  constructor(
    private rpcEndpoint: string,
    private marketId: string,
    opts: AnalyzerOptions = {}
  ) {
    this.timeoutMs = Math.max(0, opts.timeoutMs ?? 10_000)
    this.maxRetries = Math.max(0, opts.maxRetries ?? 2)
  }

  async fetchOrderbook(depth = 50): Promise<{ bids: Order[]; asks: Order[] }> {
    const url = `${this.rpcEndpoint}/orderbook/${this.marketId}?depth=${depth}`
    return await this.getJsonWithRetry(url)
  }

  async analyze(depth = 50): Promise<DepthMetrics> {
    const raw = await this.fetchOrderbook(depth)
    const bids = this.normalizeOrders(raw?.bids ?? [], "bids")
    const asks = this.normalizeOrders(raw?.asks ?? [], "asks")

    const avg = (arr: Order[]) =>
      arr.length ? arr.reduce((s, o) => s + o.size, 0) / arr.length : 0

    const bestBid = bids[0]?.price ?? 0
    const bestAsk = asks[0]?.price ?? 0
    const spread =
      bestBid > 0 && bestAsk > 0 && bestAsk >= bestBid ? bestAsk - bestBid : 0

    return {
      averageBidDepth: this.round2(avg(bids)),
      averageAskDepth: this.round2(avg(asks)),
      spread: this.round6(spread),
    }
  }

  // ---------- internals ----------

  private async getJsonWithRetry<T>(url: string): Promise<T> {
    let attempt = 0
    let lastErr: unknown
    while (attempt <= this.maxRetries) {
      try {
        const controller = new AbortController()
        const t = this.timeoutMs
          ? setTimeout(() => controller.abort(), this.timeoutMs)
          : undefined
        try {
          const res = await fetch(url, { signal: controller.signal })
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
          const json = (await res.json()) as T
          return json
        } finally {
          if (t) clearTimeout(t)
        }
      } catch (err) {
        lastErr = err
        attempt++
        if (attempt > this.maxRetries) break
      }
    }
    throw new Error(
      `Orderbook fetch failed after ${this.maxRetries + 1} attempts: ${
        (lastErr as Error)?.message || "unknown error"
      }`
    )
  }

  private normalizeOrders(orders: Order[], side: "bids" | "asks"): Order[] {
    const clean = orders
      .filter(
        o =>
          Number.isFinite(o.price) &&
          Number.isFinite(o.size) &&
          o.price > 0 &&
          o.size > 0
      )
      .map(o => ({ price: Number(o.price), size: Number(o.size) }))

    // Sort best-first: bids desc, asks asc
    clean.sort((a, b) =>
      side === "bids" ? b.price - a.price : a.price - b.price
    )

    // Merge same-price levels to avoid duplicates
    const merged: Order[] = []
    for (const o of clean) {
      const last = merged[merged.length - 1]
      if (last && this.eqPrice(last.price, o.price)) last.size += o.size
      else merged.push({ ...o })
    }
    return merged
  }

  private eqPrice(a: number, b: number): boolean {
    // Treat prices equal within 1e-9 to reduce floating noise
    return Math.abs(a - b) < 1e-9
  }

  private round2(x: number): number {
    return Math.round(x * 100) / 100
  }

  private round6(x: number): number {
    return Math.round(x * 1e6) / 1e6
  }
}
