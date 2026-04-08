import type { TokenDataPoint } from "./tokenDataFetcher"

export interface DataIframeConfig {
  containerId: string
  iframeUrl: string
  token: string
  refreshMs?: number
}

export class TokenDataIframeEmbedder {
  private iframe?: HTMLIFrameElement

  constructor(private cfg: DataIframeConfig) {}

  /**
   * Initialize the iframe and start posting token data at intervals.
   */
  async init() {
    const container = document.getElementById(this.cfg.containerId)
    if (!container) throw new Error(`Container not found: ${this.cfg.containerId}`)

    this.iframe = document.createElement("iframe")
    this.iframe.src = this.cfg.iframeUrl
    this.iframe.style.border = "none"
    this.iframe.width = "100%"
    this.iframe.height = "100%"
    this.iframe.onload = () => this.postTokenData()
    container.appendChild(this.iframe)

    if (this.cfg.refreshMs) {
      setInterval(() => this.postTokenData(), this.cfg.refreshMs)
    }
  }

  /**
   * Post the latest token data into the iframe.
   */
  private async postTokenData() {
    if (!this.iframe?.contentWindow) return

    try {
      const { TokenDataFetcher } = await import("./tokenDataFetcher")
      const fetcher = new TokenDataFetcher(this.cfg.iframeUrl)
      const data: TokenDataPoint[] = await fetcher.fetchHistory(this.cfg.token)

      this.iframe.contentWindow.postMessage(
        { type: "TOKEN_DATA", token: this.cfg.token, data },
        "*"
      )
    } catch (err) {
      console.error("Failed to fetch or post token data:", err)
    }
  }

  /**
   * Remove the iframe from the DOM.
   */
  destroy() {
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe)
    }
    this.iframe = undefined
  }
}
