// ============================================================
// Transaction types
// ============================================================

export type TransactionStatus = "pending" | "approved" | "rejected" | "executed" | "failed";

export interface Transaction {
  id: string;
  wallet_address: string;
  recipient: string;
  amount: number;
  currency: string;
  chain: string;
  category: string | null;
  merchant: string | null;
  description: string | null;
  status: TransactionStatus;
  tx_hash: string | null;
  governance_result: GovernancePipelineResult | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionInput {
  recipient: string;
  amount: number;
  currency?: string;
  chain?: string;
  category?: string;
  merchant?: string;
  description?: string;
}

// ============================================================
// Governance rule types
// ============================================================

export type RuleType =
  | "max_amount"
  | "daily_cap"
  | "merchant_blacklist"
  | "merchant_whitelist"
  | "category_limit"
  | "frequency_limit";

export interface GovernanceRule {
  id: string;
  rule_type: RuleType;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  is_active: boolean;
  priority: number;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Rules evaluation result
// ============================================================

export interface RuleEvaluation {
  rule_id: string;
  rule_type: RuleType;
  rule_name: string;
  passed: boolean;
  reason: string;
  details?: Record<string, unknown>;
}

export interface RulesResult {
  passed: boolean;
  evaluations: RuleEvaluation[];
  failed_rules: RuleEvaluation[];
}

// ============================================================
// Anomaly detection result
// ============================================================

export interface AnomalyResult {
  is_anomaly: boolean;
  z_score: number | null;
  iqr_outlier: boolean | null;
  method: "z_score" | "iqr" | "cold_start";
  percentile: number | null;
  historical_mean: number | null;
  historical_std: number | null;
  sample_size: number;
  threshold: number;
  reason: string;
}

// ============================================================
// Agent interpretation
// ============================================================

export type AgentRecommendation = "auto_approve" | "flag_for_review" | "reject";

export interface AgentInterpretation {
  explanation: string;
  recommendation: AgentRecommendation;
  confidence: number;
  model_used: string;
  tokens_used: number;
  latency_ms: number;
  raw_prompt: string;
  raw_response: string;
}

// ============================================================
// Governance pipeline result (stored in transaction.governance_result)
// ============================================================

export type FinalOutcome = "auto_approve" | "flag_for_review" | "reject";

export interface GovernancePipelineResult {
  rules_result: RulesResult;
  anomaly_result: AnomalyResult;
  agent_interpretation: AgentInterpretation;
  final_outcome: FinalOutcome;
  timestamp: string;
}

// ============================================================
// Approval queue
// ============================================================

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";
export type FlagSource = "rules" | "anomaly" | "agent" | "manual";

export interface ApprovalItem {
  id: string;
  transaction_id: string;
  reason: string;
  flag_source: FlagSource;
  agent_explanation: string | null;
  anomaly_details: AnomalyResult | null;
  status: ApprovalStatus;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

// ============================================================
// Agent decisions (audit trail)
// ============================================================

export interface AgentDecision {
  id: string;
  transaction_id: string;
  rules_result: RulesResult;
  anomaly_result: AnomalyResult;
  explanation: string | null;
  recommendation: AgentRecommendation;
  confidence: number | null;
  model_used: string | null;
  tokens_used: number | null;
  latency_ms: number | null;
  raw_prompt: string | null;
  raw_response: string | null;
  created_at: string;
}

// ============================================================
// Autonomous Agent types
// ============================================================

export type StrategyType = "dca" | "rebalance" | "yield";

export type AgentStatus = "running" | "paused" | "error";

export interface MarketData {
  prices: Record<string, { usd: number; usd_24h_change: number }>;
  fetched_at: string;
}

export interface DcaConfig {
  asset: string;
  chain: string;
  amount_per_interval: number;
  interval_seconds: number;
  vault_address: string;
  last_execution_at: string | null;
}

export interface RebalanceConfig {
  target_allocation: Record<string, number>;
  drift_threshold_pct: number;
  vault_address: string;
  chains: string[];
}

export interface YieldConfig {
  asset: string;
  chain: string;
  token_address: string;
  min_idle_amount: number;
  protocol: "aave-v3";
}

export interface AgentStrategy {
  id: string;
  strategy_type: StrategyType;
  name: string;
  description: string | null;
  config: DcaConfig | RebalanceConfig | YieldConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AgentRunDecision = "hold" | "transfer" | "swap" | "supply";

export interface AgentRun {
  id: string;
  strategy_id: string;
  strategy_type: StrategyType;
  market_data: MarketData;
  decision: AgentRunDecision;
  decision_reason: string;
  transaction_id: string | null;
  governance_outcome: FinalOutcome | null;
  created_at: string;
}

export interface AgentStatusInfo {
  status: AgentStatus;
  last_run: string | null;
  next_run_at: string | null;
  interval_seconds: number;
  strategies: { total: number; active: number };
  runs: { total: number; transfers: number };
  has_recent_activity: boolean;
}
