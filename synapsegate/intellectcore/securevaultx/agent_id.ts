/**
 * Unique identifier for the Solana Knowledge Agent.
 * 
 * This constant should be used whenever the agent is referenced
 * across the system to ensure consistency. It acts as the global
 * key for registration, invocation, and routing of Solana-related
 * knowledge queries.
 */
export const SOLANA_KNOWLEDGE_AGENT_ID = "solana-knowledge-agent" as const

/**
 * Type-safe alias for the Solana Knowledge Agent ID.
 * Ensures that only this exact identifier is accepted.
 */
export type SolanaKnowledgeAgentId = typeof SOLANA_KNOWLEDGE_AGENT_ID

/**
 * Helper function for runtime checks.
 */
export function isSolanaKnowledgeAgent(id: string): id is SolanaKnowledgeAgentId {
  return id === SOLANA_KNOWLEDGE_AGENT_ID
}
