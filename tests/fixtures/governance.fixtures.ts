import type {
  TransactionInput,
  Transaction,
  GovernanceRule,
  RulesResult,
  RuleEvaluation,
  AnomalyResult,
  AgentInterpretation,
  RuleType,
} from "@/types";

// ============================================================
// Constants
// ============================================================

export const WALLET_ADDRESS = "0xTestWalletAddress1234567890abcdef";

/**
 * 10 transactions with known statistical properties:
 * amounts: [48, 50, 52, 49, 55, 51, 53, 47, 56, 54]
 * mean = 51.5, stdDev ≈ 2.99 (sample), min = 47, max = 56
 */
export const SAMPLE_HISTORY_AMOUNTS = [48, 50, 52, 49, 55, 51, 53, 47, 56, 54];

export const SAMPLE_HISTORY: Transaction[] = SAMPLE_HISTORY_AMOUNTS.map(
  (amount, i) =>
    makeDbTransaction({
      id: `tx-hist-${i}`,
      amount,
      status: "executed",
      created_at: new Date(Date.now() - (10 - i) * 86400000).toISOString(),
    })
);

// ============================================================
// Factory: TransactionInput
// ============================================================

export function makeTransaction(
  overrides?: Partial<TransactionInput>
): TransactionInput {
  return {
    recipient: "0xRecipient1234567890abcdef",
    amount: 50,
    currency: "USDT",
    chain: "ethereum-sepolia",
    category: "transfer",
    merchant: "TestMerchant",
    description: "Test transaction",
    ...overrides,
  };
}

// ============================================================
// Factory: Transaction (DB record)
// ============================================================

export function makeDbTransaction(
  overrides?: Partial<Transaction>
): Transaction {
  return {
    id: "tx-test-001",
    wallet_address: WALLET_ADDRESS,
    recipient: "0xRecipient1234567890abcdef",
    amount: 50,
    currency: "USDT",
    chain: "ethereum-sepolia",
    category: "transfer",
    merchant: "TestMerchant",
    description: "Test transaction",
    status: "pending",
    tx_hash: null,
    governance_result: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================
// Factory: GovernanceRule
// ============================================================

export function makeRule(
  overrides?: Partial<GovernanceRule> & { rule_type?: RuleType }
): GovernanceRule {
  return {
    id: "rule-test-001",
    rule_type: "max_amount",
    name: "Test Max Amount",
    description: "Test rule",
    config: { max_amount: 100 },
    is_active: true,
    priority: 1,
    wallet_address: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================
// Factory: RulesResult
// ============================================================

export function makeRulesResult(
  overrides?: Partial<RulesResult>
): RulesResult {
  return {
    passed: true,
    evaluations: [],
    failed_rules: [],
    ...overrides,
  };
}

// ============================================================
// Factory: AnomalyResult
// ============================================================

export function makeAnomalyResult(
  overrides?: Partial<AnomalyResult>
): AnomalyResult {
  return {
    is_anomaly: false,
    z_score: 0.5,
    iqr_outlier: false,
    method: "z_score",
    percentile: 69.15,
    historical_mean: 51.5,
    historical_std: 2.99,
    sample_size: 10,
    threshold: 2.0,
    reason: "Normal transaction.",
    ...overrides,
  };
}

// ============================================================
// Factory: AgentInterpretation
// ============================================================

export function makeAgentInterpretation(
  overrides?: Partial<AgentInterpretation>
): AgentInterpretation {
  return {
    explanation: "Transaction is within normal parameters.",
    recommendation: "auto_approve",
    confidence: 0.95,
    model_used: "gpt-5.2",
    tokens_used: 150,
    latency_ms: 450,
    raw_prompt: "test prompt",
    raw_response: '{"explanation":"test","recommendation":"auto_approve","confidence":0.95}',
    ...overrides,
  };
}
