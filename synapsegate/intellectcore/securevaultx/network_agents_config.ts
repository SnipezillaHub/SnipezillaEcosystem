export interface AgentCapabilities {
  canAnswerProtocolQuestions: boolean
  canAnswerTokenQuestions: boolean
  canDescribeTooling: boolean
  canReportEcosystemNews: boolean
  canHandleCrossChain?: boolean
}

export interface AgentFlags {
  requiresExactInvocation: boolean
  noAdditionalCommentary: boolean
  enforceJsonOutput?: boolean
}

/**
 * Factory helper to create capability sets
 */
export function createCapabilities(
  overrides: Partial<AgentCapabilities> = {}
): AgentCapabilities {
  return {
    canAnswerProtocolQuestions: false,
    canAnswerTokenQuestions: false,
    canDescribeTooling: false,
    canReportEcosystemNews: false,
    canHandleCrossChain: false,
    ...overrides,
  }
}

/**
 * Factory helper to create agent flags
 */
export function createFlags(
  overrides: Partial<AgentFlags> = {}
): AgentFlags {
  return {
    requiresExactInvocation: true,
    noAdditionalCommentary: true,
    enforceJsonOutput: false,
    ...overrides,
  }
}

/** ------------------ Network Profiles ------------------- **/

export const SOLANA_AGENT_CAPABILITIES: AgentCapabilities = createCapabilities({
  canAnswerProtocolQuestions: true,
  canAnswerTokenQuestions: true,
  canDescribeTooling: true,
  canReportEcosystemNews: true,
  canHandleCrossChain: true,
})

export const SOLANA_AGENT_FLAGS: AgentFlags = createFlags({
  requiresExactInvocation: true,
  noAdditionalCommentary: true,
})

export const ETHEREUM_AGENT_CAPABILITIES: AgentCapabilities = createCapabilities({
  canAnswerProtocolQuestions: true,
  canAnswerTokenQuestions: true,
  canDescribeTooling: true,
  canReportEcosystemNews: false,
})

export const ETHEREUM_AGENT_FLAGS: AgentFlags = createFlags({
  requiresExactInvocation: true,
  enforceJsonOutput: true,
})

export const BSC_AGENT_CAPABILITIES: AgentCapabilities = createCapabilities({
  canAnswerProtocolQuestions: true,
  canAnswerTokenQuestions: true,
  canDescribeTooling: false,
  canReportEcosystemNews: true,
})

export const BSC_AGENT_FLAGS: AgentFlags = createFlags({
  requiresExactInvocation: false,
  noAdditionalCommentary: true,
})
