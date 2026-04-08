export interface LaunchConfig {
  contractName: string
  parameters: Record<string, any>
  deployEndpoint: string
  apiKey?: string
  timeoutMs?: number
}

export interface LaunchResult {
  success: boolean
  address?: string
  transactionHash?: string
  error?: string
  raw?: any
}

export class LaunchNode {
  constructor(private config: LaunchConfig) {}

  async deploy(): Promise<LaunchResult> {
    const { deployEndpoint, apiKey, contractName, parameters, timeoutMs } = this.config
    const controller = new AbortController()
    const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined

    try {
      const res = await fetch(deployEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ contractName, parameters }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        return { success: false, error: `HTTP ${res.status}: ${text}` }
      }

      const json = await res.json()
      if (!json.contractAddress || !json.txHash) {
        return { success: false, error: "Incomplete response from deploy API", raw: json }
      }

      return {
        success: true,
        address: json.contractAddress,
        transactionHash: json.txHash,
        raw: json,
      }
    } catch (err: any) {
      return { success: false, error: err.name === "AbortError" ? "Deployment request timed out" : err.message }
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
}
