import type {
  AgentStrategy,
  DcaConfig,
  RebalanceConfig,
  MarketData,
  AgentRunDecision,
} from "@/types";
import type { WalletBalance } from "@/lib/wdk";

export interface StrategyDecision {
  decision: AgentRunDecision;
  reason: string;
  transfer?: {
    amount: number;
    chain: string;
    vault_address: string;
    currency: string;
  };
}

// ============================================================
// Main dispatcher
// ============================================================

export function evaluateStrategy(
  strategy: AgentStrategy,
  marketData: MarketData,
  walletBalances: WalletBalance[]
): StrategyDecision {
  switch (strategy.strategy_type) {
    case "dca":
      return evaluateDca(strategy, marketData);
    case "rebalance":
      return evaluateRebalance(strategy, marketData, walletBalances);
    default:
      return { decision: "hold", reason: `Unknown strategy type: ${strategy.strategy_type}` };
  }
}

// ============================================================
// DCA evaluator
// ============================================================

export function evaluateDca(
  strategy: AgentStrategy,
  marketData: MarketData
): StrategyDecision {
  const config = strategy.config as DcaConfig;

  // Check if market data is available for this chain
  const chainPrice = marketData.prices[config.chain];
  if (!chainPrice) {
    return {
      decision: "hold",
      reason: `No market data available for ${config.chain}`,
    };
  }

  // Check if interval has elapsed since last execution
  const now = Date.now();
  const lastExec = config.last_execution_at
    ? new Date(config.last_execution_at).getTime()
    : 0; // null = never executed, should run immediately

  const elapsedSeconds = (now - lastExec) / 1000;

  if (elapsedSeconds < config.interval_seconds) {
    const remaining = Math.ceil(config.interval_seconds - elapsedSeconds);
    return {
      decision: "hold",
      reason: `DCA interval not elapsed. ${remaining}s remaining (interval: ${config.interval_seconds}s)`,
    };
  }

  // Interval elapsed — transfer
  const priceStr = `$${chainPrice.usd.toLocaleString()} (${chainPrice.usd_24h_change >= 0 ? "+" : ""}${chainPrice.usd_24h_change.toFixed(2)}% 24h)`;

  return {
    decision: "transfer",
    reason: `DCA interval elapsed (${config.interval_seconds}s). Transferring ${config.amount_per_interval} ${config.asset} to vault. Current price: ${priceStr}`,
    transfer: {
      amount: config.amount_per_interval,
      chain: config.chain,
      vault_address: config.vault_address,
      currency: config.asset,
    },
  };
}

// ============================================================
// Rebalance evaluator
// ============================================================

export function evaluateRebalance(
  strategy: AgentStrategy,
  marketData: MarketData,
  walletBalances: WalletBalance[]
): StrategyDecision {
  const config = strategy.config as RebalanceConfig;

  // Calculate current USD portfolio allocation
  const allocations: { chain: string; usdValue: number; balance: number }[] = [];
  let totalUsd = 0;

  for (const chain of config.chains) {
    const balance = walletBalances.find((w) => w.chain === chain);
    const price = marketData.prices[chain];

    if (!balance || !price) continue;

    const nativeBalance = parseFloat(balance.nativeBalance) || 0;
    const usdValue = nativeBalance * price.usd;
    allocations.push({ chain, usdValue, balance: nativeBalance });
    totalUsd += usdValue;
  }

  // Zero portfolio — nothing to rebalance
  if (totalUsd === 0) {
    return {
      decision: "hold",
      reason: "Portfolio value is $0. Nothing to rebalance.",
    };
  }

  // Calculate drift for each chain — prioritize overweight chains since we can only send
  let maxOverweightChain = "";
  let maxOverweightDrift = 0;
  let maxAbsDrift = 0;
  let maxAbsDriftChain = "";

  for (const alloc of allocations) {
    const currentPct = (alloc.usdValue / totalUsd) * 100;
    const targetPct = (config.target_allocation[alloc.chain] ?? 0) * 100;
    const drift = currentPct - targetPct;

    if (Math.abs(drift) > maxAbsDrift) {
      maxAbsDrift = Math.abs(drift);
      maxAbsDriftChain = alloc.chain;
    }

    // Track the most overweight chain separately (drift > 0 = overweight)
    if (drift > maxOverweightDrift) {
      maxOverweightDrift = drift;
      maxOverweightChain = alloc.chain;
    }
  }

  // Check if any drift exceeds threshold
  if (maxAbsDrift < config.drift_threshold_pct) {
    return {
      decision: "hold",
      reason: `Portfolio within tolerance. Max drift: ${maxAbsDrift.toFixed(1)}% on ${maxAbsDriftChain} (threshold: ${config.drift_threshold_pct}%)`,
    };
  }

  // Can only send, not receive from vault — only act on overweight chains
  if (maxOverweightDrift < config.drift_threshold_pct) {
    return {
      decision: "hold",
      reason: `No chain overweight beyond threshold. Max overweight: ${maxOverweightDrift.toFixed(1)}%. Cannot receive from vault — holding.`,
    };
  }

  const maxDriftChain = maxOverweightChain;
  const maxDrift = maxOverweightDrift;

  // Overweight — transfer half the excess to vault
  const overweightAlloc = allocations.find((a) => a.chain === maxDriftChain);
  if (!overweightAlloc) {
    return { decision: "hold", reason: "Could not find overweight allocation." };
  }

  const price = marketData.prices[maxDriftChain];
  const excessUsd = (Math.abs(maxDrift) / 100) * totalUsd;
  const halfExcessNative = excessUsd / 2 / price.usd;

  // Don't transfer more than what's available
  const transferAmount = Math.min(halfExcessNative, overweightAlloc.balance * 0.9);

  if (transferAmount <= 0) {
    return {
      decision: "hold",
      reason: "Calculated transfer amount is zero or negative.",
    };
  }

  const symbol = maxDriftChain.includes("polygon") ? "MATIC" : "ETH";

  return {
    decision: "transfer",
    reason: `Rebalance: ${maxDriftChain} overweight by ${maxDrift.toFixed(1)}% (threshold: ${config.drift_threshold_pct}%). Transferring ${transferAmount.toFixed(6)} ${symbol} to vault.`,
    transfer: {
      amount: transferAmount,
      chain: maxDriftChain,
      vault_address: config.vault_address,
      currency: symbol,
    },
  };
}
