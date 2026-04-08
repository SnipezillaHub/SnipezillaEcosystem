import nodemailer from "nodemailer"

export interface AlertConfig {
  email?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
    to: string[]
    secure?: boolean
  }
  console?: boolean
  retries?: number
}

export interface AlertSignal {
  title: string
  message: string
  level: "info" | "warning" | "critical"
  timestamp?: number
}

export interface DispatchResult {
  signal: AlertSignal
  delivered: boolean
  error?: string
}

/**
 * Alert service: send alerts via email and/or console log.
 */
export class AlertService {
  constructor(private cfg: AlertConfig) {}

  private async sendEmail(signal: AlertSignal): Promise<void> {
    if (!this.cfg.email) return
    const { host, port, user, pass, from, to, secure } = this.cfg.email
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: secure ?? false,
      auth: { user, pass },
    })

    await transporter.sendMail({
      from,
      to,
      subject: `[${signal.level.toUpperCase()}] ${signal.title}`,
      text: `${signal.message}\n\nGenerated at: ${new Date(
        signal.timestamp ?? Date.now()
      ).toISOString()}`,
    })
  }

  private logConsole(signal: AlertSignal): void {
    if (!this.cfg.console) return
    const tag = `[${signal.level.toUpperCase()}]`
    const time = new Date(signal.timestamp ?? Date.now()).toISOString()
    console.log(`[AlertService][${tag}] ${time} :: ${signal.title}\n${signal.message}`)
  }

  /**
   * Attempt to deliver a signal, with retries if configured.
   */
  private async deliver(signal: AlertSignal): Promise<DispatchResult> {
    let attempts = 0
    const maxRetries = this.cfg.retries ?? 0
    while (attempts <= maxRetries) {
      try {
        await this.sendEmail(signal)
        this.logConsole(signal)
        return { signal, delivered: true }
      } catch (err: any) {
        attempts++
        if (attempts > maxRetries) {
          return { signal, delivered: false, error: err.message }
        }
      }
    }
    return { signal, delivered: false, error: "Unknown delivery failure" }
  }

  /**
   * Dispatch a list of signals sequentially.
   */
  async dispatch(signals: AlertSignal[]): Promise<DispatchResult[]> {
    const results: DispatchResult[] = []
    for (const sig of signals) {
      const result = await this.deliver({ ...sig, timestamp: sig.timestamp ?? Date.now() })
      results.push(result)
    }
    return results
  }
}
