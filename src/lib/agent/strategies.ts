import type {
  AgentStrategy,
  DcaConfig,
  RebalanceConfig,
  YieldConfig,
  MarketData,
  AgentRunDecision,
} from "@/types";
import type { WalletBalance } from "@/lib/wdk";
import { SWAP_TOKENS } from "@/lib/wdk";

export interface SwapDetails {
  chain: string;
  tokenIn: string;
  tokenOut: string;
  tokenInSymbol: string;
  tokenOutSymbol: string;
  amountIn: number;
  quoteAmountOut?: string;
  quoteFee?: string;
}

export interface SupplyDetails {
  chain: string;
  token: string;
  tokenSymbol: string;
  amount: number;
  protocol: "aave-v3";
  quoteFee?: string;
}

export interface StrategyDecision {
  decision: AgentRunDecision;
  reason: string;
  transfer?: {
    amount: number;
    chain: string;
    vault_address: string;
    currency: string;
  };
  swap?: SwapDetails;
  supply?: SupplyDetails;
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
    case "yield":
      return evaluateYield(strategy, walletBalances);
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
  const wrappedSymbol = maxDriftChain.includes("polygon") ? "WMATIC" : "WETH";

  // Check if swap tokens are available for this chain — use DEX swap instead of vault transfer
  const chainTokens = SWAP_TOKENS[maxDriftChain];
  if (chainTokens && chainTokens[wrappedSymbol] && chainTokens["USDT"]) {
    return {
      decision: "swap",
      reason: `Rebalance via DEX: ${maxDriftChain} overweight by ${maxDrift.toFixed(1)}% (threshold: ${config.drift_threshold_pct}%). Swapping ${transferAmount.toFixed(6)} ${symbol} → USDT via Velora DEX.`,
      swap: {
        chain: maxDriftChain,
        tokenIn: chainTokens[wrappedSymbol],
        tokenOut: chainTokens["USDT"],
        tokenInSymbol: symbol,
        tokenOutSymbol: "USDT",
        amountIn: transferAmount,
      },
    };
  }

  // Fallback: vault transfer if no swap tokens configured
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

// ============================================================
// Yield evaluator — park idle stablecoins in Aave V3
// ============================================================

export function evaluateYield(
  strategy: AgentStrategy,
  walletBalances: WalletBalance[]
): StrategyDecision {
  const config = strategy.config as YieldConfig;

  // Find wallet balance on the configured chain
  const balance = walletBalances.find((w) => w.chain === config.chain);
  if (!balance) {
    return {
      decision: "hold",
      reason: `No wallet balance available for ${config.chain}`,
    };
  }

  const nativeBalance = parseFloat(balance.nativeBalance) || 0;

  // Check if idle balance exceeds minimum threshold
  if (nativeBalance < config.min_idle_amount) {
    return {
      decision: "hold",
      reason: `Idle ${config.asset} balance (${nativeBalance.toFixed(2)}) below minimum threshold (${config.min_idle_amount}). Nothing to supply.`,
    };
  }

  // Supply the amount above the minimum threshold to Aave
  const supplyAmount = nativeBalance - config.min_idle_amount;

  if (supplyAmount <= 0) {
    return {
      decision: "hold",
      reason: "No excess balance to supply to Aave.",
    };
  }

  return {
    decision: "supply",
    reason: `Yield opportunity: ${supplyAmount.toFixed(2)} ${config.asset} idle on ${config.chain}. Supplying to ${config.protocol} to earn yield.`,
    supply: {
      chain: config.chain,
      token: config.token_address,
      tokenSymbol: config.asset,
      amount: supplyAmount,
      protocol: config.protocol,
    },
  };
}
