import fetch from "node-fetch"

/*------------------------------------------------------
 * Types
 *----------------------------------------------------*/

interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

export type CandlestickPattern =
  | "Hammer"
  | "ShootingStar"
  | "BullishEngulfing"
  | "BearishEngulfing"
  | "Doji"

export interface PatternSignal {
  timestamp: number
  pattern: CandlestickPattern
  confidence: number
}

/*------------------------------------------------------
 * Detector
 *----------------------------------------------------*/

export class CandlestickPatternDetector {
  constructor(private readonly apiUrl: string) {}

  /** Fetch recent OHLC candles for a symbol. */
  async fetchCandles(symbol: string, limit = 100): Promise<Candle[]> {
    const res = await fetch(`${this.apiUrl}/markets/${symbol}/candles?limit=${limit}`, {
      timeout: 10_000,
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch candles ${res.status}: ${res.statusText}`)
    }
    return (await res.json()) as Candle[]
  }

  /* ------------------------- Pattern helpers ---------------------- */

  private isHammer(c: Candle): number {
    const body = Math.abs(c.close - c.open)
    const lowerWick = Math.min(c.open, c.close) - c.low
    const ratio = body > 0 ? lowerWick / body : 0
    return ratio > 2 && body / (c.high - c.low) < 0.3 ? Math.min(ratio / 3, 1) : 0
  }

  private isShootingStar(c: Candle): number {
    const body = Math.abs(c.close - c.open)
    const upperWick = c.high - Math.max(c.open, c.close)
    const ratio = body > 0 ? upperWick / body : 0
    return ratio > 2 && body / (c.high - c.low) < 0.3 ? Math.min(ratio / 3, 1) : 0
  }

  private isBullishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close > curr.open &&
      prev.close < prev.open &&
      curr.close > prev.open &&
      curr.open < prev.close
    if (!cond) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    return bodyPrev > 0 ? Math.min(bodyCurr / bodyPrev, 1) : 0.8
  }

  private isBearishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close < curr.open &&
      prev.close > prev.open &&
      curr.open > prev.close &&
      curr.close < prev.open
    if (!cond) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    return bodyPrev > 0 ? Math.min(bodyCurr / bodyPrev, 1) : 0.8
  }

  private isDoji(c: Candle): number {
    const range = c.high - c.low
    const body = Math.abs(c.close - c.open)
    const ratio = range > 0 ? body / range : 1
    return ratio < 0.1 ? 1 - ratio * 10 : 0
  }

  /* ---------------------- Scanner --------------------- */

  /**
   * Scan a series of candles for patterns.
   */
  detectPatterns(candles: Candle[]): PatternSignal[] {
    const results: PatternSignal[] = []

    for (let i = 1; i < candles.length; i++) {
      const curr = candles[i]
      const prev = candles[i - 1]

      const hammer = this.isHammer(curr)
      if (hammer > 0) results.push({ timestamp: curr.timestamp, pattern: "Hammer", confidence: hammer })

      const star = this.isShootingStar(curr)
      if (star > 0) results.push({ timestamp: curr.timestamp, pattern: "ShootingStar", confidence: star })

      const bull = this.isBullishEngulfing(prev, curr)
      if (bull > 0) results.push({ timestamp: curr.timestamp, pattern: "BullishEngulfing", confidence: bull })

      const bear = this.isBearishEngulfing(prev, curr)
      if (bear > 0) results.push({ timestamp: curr.timestamp, pattern: "BearishEngulfing", confidence: bear })

      const doji = this.isDoji(curr)
      if (doji > 0) results.push({ timestamp: curr.timestamp, pattern: "Doji", confidence: doji })
    }

    return results.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Scan a market directly via the API.
   */
  async detectForSymbol(symbol: string, limit = 100): Promise<PatternSignal[]> {
    const candles = await this.fetchCandles(symbol, limit)
    return this.detectPatterns(candles)
  }
}
