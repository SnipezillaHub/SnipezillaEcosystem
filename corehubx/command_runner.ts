import { exec } from "child_process"

/**
 * Execute a shell command and return stdout, stderr, and exit code.
 * Throws an error if execution fails or times out.
 * @param command Shell command to run (e.g., "ls -la")
 * @param timeoutMs Optional timeout in milliseconds
 */
export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

export function execCommand(command: string, timeoutMs: number = 30_000): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        return reject(
          new Error(`Command failed with code ${error.code ?? "unknown"}: ${stderr || error.message}`)
        )
      }
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      })
    })

    child.on("exit", code => {
      if (code && code !== 0) {
        reject(new Error(`Command exited with non-zero code ${code}`))
      }
    })
  })
}
