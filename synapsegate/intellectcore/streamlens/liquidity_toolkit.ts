import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Toolkit exposing liquidity-related actions.
 *
 * Available actions:
 * – fetch raw pool data (token balances, reserves, volumes)
 * – run health / risk analysis on a liquidity pool
 *
 * Keys follow a `<namespace>-<action>` convention to ensure uniqueness
 * across different toolkits in the system.
 */
export const LIQUIDITY_ANALYSIS_TOOLS: Readonly<Record<string, Toolkit>> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

/**
 * Get a liquidity toolkit action by key.
 * Useful for dynamic routing of tasks.
 */
export function getLiquidityTool(key: string): Toolkit | undefined {
  return LIQUIDITY_ANALYSIS_TOOLS[key]
}

/**
 * List all available liquidity toolkit keys.
 */
export function listLiquidityToolKeys(): string[] {
  return Object.keys(LIQUIDITY_ANALYSIS_TOOLS)
}
