/**
 * Detect volume-based patterns in a series of activity amounts
 * Improvements: input validation, rolling sum optimization,
 * variance check, normalization option, and summary utilities
 */

export interface PatternMatch {
  index: number
  window: number
  average: number
  variance: number
  sum: number
}

export interface DetectionOptions {
  normalize?: boolean
  minVariance?: number
  maxVariance?: number
}

export function detectVolumePatterns(
  volumes: number[],
  windowSize: number,
  threshold: number,
  opts: DetectionOptions = {}
): PatternMatch[] {
  if (!Array.isArray(volumes)) throw new Error("volumes must be an array")
  if (!Number.isInteger(windowSize) || windowSize <= 0)
    throw new Error("windowSize must be a positive integer")
  if (!Number.isFinite(threshold))
    throw new Error("threshold must be a finite number")

  const data = opts.normalize ? normalize(volumes) : volumes.slice()
  const matches: PatternMatch[] = []

  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum += data[i]
    if (i >= windowSize) sum -= data[i - windowSize]

    if (i + 1 >= windowSize) {
      const start = i + 1 - windowSize
      const avg = sum / windowSize
      if (avg >= threshold) {
        const slice = data.slice(start, start + windowSize)
        const variance = computeVariance(slice, avg)
        if (
          (opts.minVariance === undefined || variance >= opts.minVariance) &&
          (opts.maxVariance === undefined || variance <= opts.maxVariance)
        ) {
          matches.push({
            index: start,
            window: windowSize,
            average: avg,
            variance,
            sum,
          })
        }
      }
    }
  }
  return matches
}

/**
 * Summarize pattern matches into aggregate stats
 */
export function summarizePatterns(matches: PatternMatch[]): {
  count: number
  avgOfAverages: number
  maxAverage: number
  minAverage: number
} {
  if (!matches.length)
    return { count: 0, avgOfAverages: 0, maxAverage: 0, minAverage: 0 }
  const avgOfAverages =
    matches.reduce((s, m) => s + m.average, 0) / matches.length
  const maxAverage = Math.max(...matches.map(m => m.average))
  const minAverage = Math.min(...matches.map(m => m.average))
  return { count: matches.length, avgOfAverages, maxAverage, minAverage }
}

// ---------- helpers ----------

function normalize(arr: number[]): number[] {
  if (!arr.length) return []
  const max = Math.max(...arr.map(v => Math.abs(v)))
  return max === 0 ? arr.map(() => 0) : arr.map(v => v / max)
}

function computeVariance(arr: number[], mean: number): number {
  if (!arr.length) return 0
  const diffs = arr.map(v => (v - mean) ** 2)
  return diffs.reduce((a, b) => a + b, 0) / arr.length
}
