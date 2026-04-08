/**
 * Analyze on-chain token activity: fetches recent activity and summarizes transfers
 * Improvements: JSON-RPC usage, typed helpers, pagination, concurrency limit,
 * retries without jitter, mint-based filtering, and summary utilities
 */

export interface ActivityRecord {
  timestamp: number
  signature: string
  source: string
  destination: string
  amount: number
}

export interface AnalyzerOptions {
  commitment?: "processed" | "confirmed" | "finalized"
  maxConcurrency?: number
  maxRetries?: number
  timeoutMs?: number
}

type JsonRpcParams = unknown[]
interface JsonRpcRequest {
  jsonrpc: "2.0"
  id: number
  method: string
  params?: JsonRpcParams
}
interface JsonRpcResponse<T = any> {
  jsonrpc: "2.0"
  id: number
  result?: T
  error?: { code: number; message: string }
}

export class TokenActivityAnalyzer {
  private idCounter = 1
  private commitment: AnalyzerOptions["commitment"]
  private maxConcurrency: number
  private maxRetries: number
  private timeoutMs: number

  constructor(private rpcEndpoint: string, opts: AnalyzerOptions = {}) {
    this.commitment = opts.commitment ?? "confirmed"
    this.maxConcurrency = Math.max(1, opts.maxConcurrency ?? 4)
    this.maxRetries = Math.max(0, opts.maxRetries ?? 2)
    this.timeoutMs = Math.max(0, opts.timeoutMs ?? 20_000)
  }

  private async rpc<T>(method: string, params?: JsonRpcParams): Promise<T> {
    const body: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: this.idCounter++,
      method,
      params,
    }
    const controller = new AbortController()
    const timer = this.timeoutMs
      ? setTimeout(() => controller.abort(), this.timeoutMs)
      : undefined

    try {
      const res = await fetch(this.rpcEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(`RPC ${method} failed with ${res.status}`)
      const json = (await res.json()) as JsonRpcResponse<T>
      if (json.error) throw new Error(`RPC ${method} error: ${json.error.message}`)
      if (json.result === undefined) throw new Error(`RPC ${method} returned no result`)
      return json.result
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  private async rpcWithRetry<T>(method: string, params?: JsonRpcParams): Promise<T> {
    let attempt = 0
    let delayMs = 250
    for (;;) {
      try {
        return await this.rpc<T>(method, params)
      } catch (err) {
        if (attempt >= this.maxRetries) throw err
        await this.sleep(delayMs)
        delayMs *= 2 // no randomness per user preference
        attempt++
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Fetch recent signatures for an address with optional pagination
   * Note: For token-level analysis, pass the mint address; results will be filtered per mint later
   */
  async fetchRecentSignatures(
    address: string,
    limit = 100,
    before?: string,
    until?: string
  ): Promise<string[]> {
    const params: any[] = [
      address,
      { limit, commitment: this.commitment, before, until },
    ]
    const result = await this.rpcWithRetry<Array<{ signature: string }>>(
      "getSignaturesForAddress",
      params
    )
    return result.map(e => e.signature)
  }

  /**
   * Fetch a transaction as jsonParsed for easier token balance parsing
   */
  private async fetchTransaction(signature: string): Promise<any | null> {
    const result = await this.rpcWithRetry<any>(
      "getTransaction",
      [signature, { maxSupportedTransactionVersion: 0, commitment: this.commitment }]
    )
    return result ?? null
  }

  /**
   * Analyze activity for a given mint by scanning recent transactions touching the provided address
   * The address can be a token account, the mint itself, or a related program-derived address
   */
  async analyzeActivity(
    address: string,
    mint: string,
    limit = 50
  ): Promise<ActivityRecord[]> {
    const signatures = await this.fetchRecentSignatures(address, limit)
    if (!signatures.length) return []

    const out: ActivityRecord[] = []
    const chunks = this.chunk(signatures, this.maxConcurrency)

    for (const batch of chunks) {
      const results = await Promise.all(
        batch.map(async sig => {
          try {
            const tx = await this.fetchTransaction(sig)
            if (!tx || !tx.meta) return []
            const pre = (tx.meta.preTokenBalances || []) as any[]
            const post = (tx.meta.postTokenBalances || []) as any[]
            const bt = (tx.blockTime ?? 0) * 1000

            // Build maps by account index and mint filtering
            const records: ActivityRecord[] = []
            const maxLen = Math.max(pre.length, post.length)
            for (let i = 0; i < maxLen; i++) {
              const p = post[i]
              const q = pre[i]
              // Only consider balances for the target mint
              if ((p?.mint ?? q?.mint) !== mint) continue

              const pAmt = Number(p?.uiTokenAmount?.uiAmount || 0)
              const qAmt = Number(q?.uiTokenAmount?.uiAmount || 0)
              if (!Number.isFinite(pAmt) || !Number.isFinite(qAmt)) continue

              const delta = pAmt - qAmt
              if (delta === 0) continue

              const sourceOwner = q?.owner || "unknown"
              const destOwner = p?.owner || "unknown"

              records.push({
                timestamp: bt,
                signature: sig,
                source: delta > 0 ? "unknown" : sourceOwner,
                destination: delta > 0 ? destOwner : "unknown",
                amount: Math.abs(delta),
              })
            }
            return records
          } catch {
            return []
          }
        })
      )
      for (const r of results) out.push(...r)
    }

    // Optional: sort chronologically ascending
    out.sort((a, b) => a.timestamp - b.timestamp)
    return out
  }

  /**
   * Summarize aggregated amounts by source->destination pair
   */
  summarizeTransfers(records: ActivityRecord[]): Array<{
    key: string
    source: string
    destination: string
    totalAmount: number
    txCount: number
    firstSeen: number
    lastSeen: number
  }> {
    const map = new Map<string, {
      source: string
      destination: string
      totalAmount: number
      txCount: number
      firstSeen: number
      lastSeen: number
    }>()
    for (const r of records) {
      const key = `${r.source}->${r.destination}`
      const prev = map.get(key)
      if (!prev) {
        map.set(key, {
          source: r.source,
          destination: r.destination,
          totalAmount: r.amount,
          txCount: 1,
          firstSeen: r.timestamp,
          lastSeen: r.timestamp,
        })
      } else {
        prev.totalAmount += r.amount
        prev.txCount += 1
        if (r.timestamp < prev.firstSeen) prev.firstSeen = r.timestamp
        if (r.timestamp > prev.lastSeen) prev.lastSeen = r.timestamp
      }
    }
    return Array.from(map, ([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }
}
