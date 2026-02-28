import type {
  Transaction,
  TransactionInput,
  GovernanceRule,
  RulesResult,
  RuleEvaluation,
} from "@/types";
import { getActiveRules, getDailyTotal, getTransactionCountInWindow } from "@/lib/db/queries";

interface EvaluationContext {
  walletAddress: string;
  transaction: TransactionInput;
  amount: number;
  currency: string;
  chain: string;
}

// Main entry point: evaluate all active rules against a transaction
export async function evaluateRules(
  walletAddress: string,
  transaction: TransactionInput
): Promise<RulesResult> {
  const rules = await getActiveRules(walletAddress);
  const context: EvaluationContext = {
    walletAddress,
    transaction,
    amount: transaction.amount,
    currency: transaction.currency ?? "USDT",
    chain: transaction.chain ?? "ethereum-sepolia",
  };

  const evaluations: RuleEvaluation[] = [];

  for (const rule of rules) {
    const evaluation = await evaluateRule(rule, context);
    evaluations.push(evaluation);
  }

  const failedRules = evaluations.filter((e) => !e.passed);

  return {
    passed: failedRules.length === 0,
    evaluations,
    failed_rules: failedRules,
  };
}

async function evaluateRule(
  rule: GovernanceRule,
  ctx: EvaluationContext
): Promise<RuleEvaluation> {
  const evaluators: Record<string, () => Promise<RuleEvaluation>> = {
    max_amount: () => evalMaxAmount(rule, ctx),
    daily_cap: () => evalDailyCap(rule, ctx),
    merchant_blacklist: () => evalMerchantBlacklist(rule, ctx),
    merchant_whitelist: () => evalMerchantWhitelist(rule, ctx),
    category_limit: () => evalCategoryLimit(rule, ctx),
    frequency_limit: () => evalFrequencyLimit(rule, ctx),
  };

  const evaluator = evaluators[rule.rule_type];
  if (!evaluator) {
    return {
      rule_id: rule.id,
      rule_type: rule.rule_type,
      rule_name: rule.name,
      passed: true,
      reason: `Unknown rule type: ${rule.rule_type} (skipped)`,
    };
  }

  return evaluator();
}

// --- Rule evaluators ---

async function evalMaxAmount(
  rule: GovernanceRule,
  ctx: EvaluationContext
): Promise<RuleEvaluation> {
  const maxAmount = Number(rule.config.max_amount);
  const passed = ctx.amount <= maxAmount;

  return {
    rule_id: rule.id,
    rule_type: rule.rule_type,
    rule_name: rule.name,
    passed,
    reason: passed
      ? `Amount $${ctx.amount} is within limit of $${maxAmount}`
      : `Amount $${ctx.amount} exceeds maximum of $${maxAmount}`,
    details: { max_amount: maxAmount, actual_amount: ctx.amount },
  };
}

async function evalDailyCap(
  rule: GovernanceRule,
  ctx: EvaluationContext
): Promise<RuleEvaluation> {
  const dailyCap = Number(rule.config.daily_cap);
  const currentTotal = await getDailyTotal(ctx.walletAddress, ctx.currency);
  const projectedTotal = currentTotal + ctx.amount;
  const passed = projectedTotal <= dailyCap;

  return {
    rule_id: rule.id,
    rule_type: rule.rule_type,
    rule_name: rule.name,
    passed,
    reason: passed
      ? `Daily total $${projectedTotal.toFixed(2)} is within cap of $${dailyCap}`
      : `Daily total $${projectedTotal.toFixed(2)} would exceed cap of $${dailyCap} (current: $${currentTotal.toFixed(2)})`,
    details: { daily_cap: dailyCap, current_total: currentTotal, projected_total: projectedTotal },
  };
}

async function evalMerchantBlacklist(
  rule: GovernanceRule,
  ctx: EvaluationContext
): Promise<RuleEvaluation> {
  const blacklist = (rule.config.merchants as string[]) ?? [];
  const merchant = ctx.transaction.merchant?.toLowerCase() ?? "";
  const isBlacklisted = blacklist.some((m) => merchant === m.toLowerCase());

  return {
    rule_id: rule.id,
    rule_type: rule.rule_type,
    rule_name: rule.name,
    passed: !isBlacklisted,
    reason: isBlacklisted
      ? `Merchant "${ctx.transaction.merchant}" is blacklisted`
      : `Merchant "${ctx.transaction.merchant ?? "unknown"}" is not blacklisted`,
    details: { merchant: ctx.transaction.merchant, blacklist },
  };
}

async function evalMerchantWhitelist(
  rule: GovernanceRule,
  ctx: EvaluationContext
): Promise<RuleEvaluation> {
  const whitelist = (rule.config.merchants as string[]) ?? [];
  const merchant = ctx.transaction.merchant?.toLowerCase() ?? "";

  // If no merchant specified, whitelist doesn't apply
  if (!ctx.transaction.merchant) {
    return {
      rule_id: rule.id,
      rule_type: rule.rule_type,
      rule_name: rule.name,
      passed: true,
      reason: "No merchant specified, whitelist rule skipped",
    };
  }

  const isWhitelisted = whitelist.some((m) => merchant === m.toLowerCase());

  return {
    rule_id: rule.id,
    rule_type: rule.rule_type,
    rule_name: rule.name,
    passed: isWhitelisted,
    reason: isWhitelisted
      ? `Merchant "${ctx.transaction.merchant}" is whitelisted`
      : `Merchant "${ctx.transaction.merchant}" is not in the whitelist`,
    details: { merchant: ctx.transaction.merchant, whitelist },
  };
}

async function evalCategoryLimit(
  rule: GovernanceRule,
  ctx: EvaluationContext
): Promise<RuleEvaluation> {
  const category = (rule.config.category as string)?.toLowerCase();
  const maxAmount = Number(rule.config.max_amount);
  const txCategory = ctx.transaction.category?.toLowerCase() ?? "";

  // Only applies if transaction category matches the rule's category
  if (txCategory !== category) {
    return {
      rule_id: rule.id,
      rule_type: rule.rule_type,
      rule_name: rule.name,
      passed: true,
      reason: `Category "${ctx.transaction.category ?? "none"}" doesn't match rule category "${category}"`,
    };
  }

  const passed = ctx.amount <= maxAmount;

  return {
    rule_id: rule.id,
    rule_type: rule.rule_type,
    rule_name: rule.name,
    passed,
    reason: passed
      ? `${category} transaction $${ctx.amount} is within limit of $${maxAmount}`
      : `${category} transaction $${ctx.amount} exceeds category limit of $${maxAmount}`,
    details: { category, max_amount: maxAmount, actual_amount: ctx.amount },
  };
}

async function evalFrequencyLimit(
  rule: GovernanceRule,
  ctx: EvaluationContext
): Promise<RuleEvaluation> {
  const maxTransactions = Number(rule.config.max_transactions);
  const windowMinutes = Number(rule.config.window_minutes ?? 60);
  const count = await getTransactionCountInWindow(ctx.walletAddress, windowMinutes);
  const passed = count < maxTransactions;

  return {
    rule_id: rule.id,
    rule_type: rule.rule_type,
    rule_name: rule.name,
    passed,
    reason: passed
      ? `${count} transactions in last ${windowMinutes}min (limit: ${maxTransactions})`
      : `${count} transactions in last ${windowMinutes}min exceeds limit of ${maxTransactions}`,
    details: { max_transactions: maxTransactions, window_minutes: windowMinutes, current_count: count },
  };
}
