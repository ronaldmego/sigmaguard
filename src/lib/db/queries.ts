import { getServerClient } from "./supabase";
import type {
  Transaction,
  TransactionInput,
  GovernanceRule,
  ApprovalItem,
  AgentDecision,
  GovernancePipelineResult,
  RulesResult,
  AnomalyResult,
  AgentRecommendation,
  FlagSource,
  AgentStrategy,
  AgentRun,
  AgentRunDecision,
  FinalOutcome,
  StrategyType,
  MarketData,
} from "@/types";

const db = () => getServerClient();

// ============================================================
// Transactions
// ============================================================

export async function getTransactionById(
  transactionId: string
): Promise<Transaction> {
  const { data, error } = await db()
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (error) throw new Error(`Transaction not found: ${error.message}`);
  return data as Transaction;
}

export async function insertTransaction(
  walletAddress: string,
  input: TransactionInput
): Promise<Transaction> {
  const { data, error } = await db()
    .from("transactions")
    .insert({
      wallet_address: walletAddress,
      recipient: input.recipient,
      amount: input.amount,
      currency: input.currency ?? "USDT",
      chain: input.chain ?? "ethereum-sepolia",
      category: input.category ?? null,
      merchant: input.merchant ?? null,
      description: input.description ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to insert transaction: ${error.message}`);
  return data as Transaction;
}

export async function updateTransactionStatus(
  transactionId: string,
  status: string,
  txHash?: string,
  governanceResult?: GovernancePipelineResult
): Promise<Transaction> {
  const update: Record<string, unknown> = { status };
  if (txHash) update.tx_hash = txHash;
  if (governanceResult) update.governance_result = governanceResult;

  const { data, error } = await db()
    .from("transactions")
    .update(update)
    .eq("id", transactionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update transaction: ${error.message}`);
  return data as Transaction;
}

export async function getTransactionHistory(
  walletAddress: string,
  options?: {
    category?: string;
    limit?: number;
    status?: string;
  }
): Promise<Transaction[]> {
  let query = db()
    .from("transactions")
    .select("*")
    .eq("wallet_address", walletAddress)
    .order("created_at", { ascending: false });

  if (options?.category) {
    query = query.eq("category", options.category);
  }
  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get transactions: ${error.message}`);
  return (data ?? []) as Transaction[];
}

export async function getTransactions(options?: {
  limit?: number;
  offset?: number;
  status?: string;
}): Promise<Transaction[]> {
  let query = db()
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get transactions: ${error.message}`);
  return (data ?? []) as Transaction[];
}

// Daily total for a wallet (for daily_cap rule)
export async function getDailyTotal(
  walletAddress: string,
  currency: string
): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await db()
    .from("transactions")
    .select("amount")
    .eq("wallet_address", walletAddress)
    .eq("currency", currency)
    .in("status", ["approved", "executed", "pending"])
    .gte("created_at", todayStart.toISOString());

  if (error) throw new Error(`Failed to get daily total: ${error.message}`);
  return (data ?? []).reduce((sum, tx) => sum + Number(tx.amount), 0);
}

// Transaction count in time window (for frequency_limit rule)
export async function getTransactionCountInWindow(
  walletAddress: string,
  windowMinutes: number
): Promise<number> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  const { data, error } = await db()
    .from("transactions")
    .select("id", { count: "exact" })
    .eq("wallet_address", walletAddress)
    .in("status", ["approved", "executed", "pending"])
    .gte("created_at", windowStart.toISOString());

  if (error) throw new Error(`Failed to get tx count: ${error.message}`);
  return data?.length ?? 0;
}

// ============================================================
// Governance Rules
// ============================================================

export async function getActiveRules(
  walletAddress?: string
): Promise<GovernanceRule[]> {
  let query = db()
    .from("governance_rules")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: true });

  // Get rules that apply globally (wallet_address IS NULL) OR to this specific wallet
  if (walletAddress) {
    query = query.or(`wallet_address.is.null,wallet_address.eq.${walletAddress}`);
  } else {
    query = query.is("wallet_address", null);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get rules: ${error.message}`);
  return (data ?? []) as GovernanceRule[];
}

export async function updateRule(
  ruleId: string,
  updates: Partial<Pick<GovernanceRule, "name" | "description" | "config" | "is_active" | "priority">>
): Promise<GovernanceRule> {
  const { data, error } = await db()
    .from("governance_rules")
    .update(updates)
    .eq("id", ruleId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update rule: ${error.message}`);
  return data as GovernanceRule;
}

// ============================================================
// Approval Queue
// ============================================================

export async function insertApprovalItem(item: {
  transaction_id: string;
  reason: string;
  flag_source: FlagSource;
  agent_explanation?: string;
  anomaly_details?: AnomalyResult;
}): Promise<ApprovalItem> {
  const { data, error } = await db()
    .from("approval_queue")
    .insert({
      transaction_id: item.transaction_id,
      reason: item.reason,
      flag_source: item.flag_source,
      agent_explanation: item.agent_explanation ?? null,
      anomaly_details: item.anomaly_details ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to insert approval: ${error.message}`);
  return data as ApprovalItem;
}

export async function getPendingApprovals(): Promise<
  (ApprovalItem & { transaction: Transaction })[]
> {
  const { data, error } = await db()
    .from("approval_queue")
    .select("*, transaction:transactions(*)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to get approvals: ${error.message}`);
  return (data ?? []) as (ApprovalItem & { transaction: Transaction })[];
}

export async function resolveApproval(
  approvalId: string,
  decision: "approved" | "rejected",
  decidedBy: string
): Promise<ApprovalItem> {
  const { data, error } = await db()
    .from("approval_queue")
    .update({
      status: decision,
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
    })
    .eq("id", approvalId)
    .select()
    .single();

  if (error) throw new Error(`Failed to resolve approval: ${error.message}`);
  return data as ApprovalItem;
}

// ============================================================
// Agent Decisions (audit trail)
// ============================================================

export async function insertAgentDecision(decision: {
  transaction_id: string;
  rules_result: RulesResult;
  anomaly_result: AnomalyResult;
  explanation: string;
  recommendation: AgentRecommendation;
  confidence: number;
  model_used: string;
  tokens_used: number;
  latency_ms: number;
  raw_prompt: string;
  raw_response: string;
}): Promise<AgentDecision> {
  const { data, error } = await db()
    .from("agent_decisions")
    .insert(decision)
    .select()
    .single();

  if (error) throw new Error(`Failed to insert agent decision: ${error.message}`);
  return data as AgentDecision;
}

// ============================================================
// Agent Strategies
// ============================================================

export async function getActiveStrategies(): Promise<AgentStrategy[]> {
  const { data, error } = await db()
    .from("agent_strategies")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to get active strategies: ${error.message}`);
  return (data ?? []) as AgentStrategy[];
}

export async function getAllStrategies(): Promise<AgentStrategy[]> {
  const { data, error } = await db()
    .from("agent_strategies")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to get strategies: ${error.message}`);
  return (data ?? []) as AgentStrategy[];
}

export async function updateStrategyLastExecution(
  strategyId: string
): Promise<void> {
  const { data: current, error: fetchError } = await db()
    .from("agent_strategies")
    .select("config")
    .eq("id", strategyId)
    .single();

  if (fetchError) throw new Error(`Failed to fetch strategy: ${fetchError.message}`);

  const config = current.config as Record<string, unknown>;
  config.last_execution_at = new Date().toISOString();

  const { error } = await db()
    .from("agent_strategies")
    .update({ config })
    .eq("id", strategyId);

  if (error) throw new Error(`Failed to update strategy execution: ${error.message}`);
}

export async function updateStrategy(
  strategyId: string,
  updates: Partial<Pick<AgentStrategy, "is_active" | "config" | "name" | "description">>
): Promise<AgentStrategy> {
  const { data, error } = await db()
    .from("agent_strategies")
    .update(updates)
    .eq("id", strategyId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update strategy: ${error.message}`);
  return data as AgentStrategy;
}

// ============================================================
// Agent Runs (audit trail)
// ============================================================

export async function insertAgentRun(run: {
  strategy_id: string;
  strategy_type: StrategyType;
  market_data: MarketData;
  decision: AgentRunDecision;
  decision_reason: string;
  transaction_id?: string | null;
  governance_outcome?: FinalOutcome | null;
}): Promise<AgentRun> {
  const { data, error } = await db()
    .from("agent_runs")
    .insert({
      strategy_id: run.strategy_id,
      strategy_type: run.strategy_type,
      market_data: run.market_data,
      decision: run.decision,
      decision_reason: run.decision_reason,
      transaction_id: run.transaction_id ?? null,
      governance_outcome: run.governance_outcome ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to insert agent run: ${error.message}`);
  return data as AgentRun;
}

export async function getAgentRunHistory(options?: {
  limit?: number;
  offset?: number;
  strategy_id?: string;
}): Promise<AgentRun[]> {
  let query = db()
    .from("agent_runs")
    .select("*")
    .order("created_at", { ascending: false });

  if (options?.strategy_id) {
    query = query.eq("strategy_id", options.strategy_id);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit ?? 50) - 1
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get agent runs: ${error.message}`);
  return (data ?? []) as AgentRun[];
}

export async function getAgentRunStats(): Promise<{
  total: number;
  transfers: number;
}> {
  const { count: total, error: totalError } = await db()
    .from("agent_runs")
    .select("*", { count: "exact", head: true });

  if (totalError) throw new Error(`Failed to get run count: ${totalError.message}`);

  const { count: transfers, error: transferError } = await db()
    .from("agent_runs")
    .select("*", { count: "exact", head: true })
    .eq("decision", "transfer");

  if (transferError) throw new Error(`Failed to get transfer count: ${transferError.message}`);

  return {
    total: total ?? 0,
    transfers: transfers ?? 0,
  };
}
