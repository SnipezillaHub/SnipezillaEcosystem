export interface Signal {
  id: string
  type: string
  timestamp: number
  payload: Record<string, any>
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
  fetchedAt?: number
}

/**
 * HTTP client for fetching signals from ArchiNet.
 */
export class SignalApiClient {
  constructor(private baseUrl: string, private apiKey?: string) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  private async handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
    const fetchedAt = Date.now()
    if (!res.ok) {
      return {
        success: false,
        error: `HTTP ${res.status}`,
        statusCode: res.status,
        fetchedAt,
      }
    }
    try {
      const data = (await res.json()) as T
      return { success: true, data, statusCode: res.status, fetchedAt }
    } catch (err: any) {
      return {
        success: false,
        error: `Invalid JSON: ${err.message}`,
        statusCode: res.status,
        fetchedAt,
      }
    }
  }

  async fetchAllSignals(): Promise<ApiResponse<Signal[]>> {
    try {
      const res = await fetch(`${this.baseUrl}/signals`, {
        method: "GET",
        headers: this.getHeaders(),
      })
      return this.handleResponse<Signal[]>(res)
    } catch (err: any) {
      return { success: false, error: err.message, fetchedAt: Date.now() }
    }
  }

  async fetchSignalById(id: string): Promise<ApiResponse<Signal>> {
    try {
      const res = await fetch(`${this.baseUrl}/signals/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: this.getHeaders(),
      })
      return this.handleResponse<Signal>(res)
    } catch (err: any) {
      return { success: false, error: err.message, fetchedAt: Date.now() }
    }
  }
}
