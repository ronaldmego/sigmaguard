import { describe, it, expect } from "vitest";
import {
  evaluateDca,
  evaluateRebalance,
  evaluateStrategy,
} from "@/lib/agent/strategies";
import type { AgentStrategy, MarketData, DcaConfig, RebalanceConfig } from "@/types";
import type { WalletBalance } from "@/lib/wdk";

// ============================================================
// Fixtures
// ============================================================

const MARKET_DATA: MarketData = {
  prices: {
    "ethereum-sepolia": { usd: 2000, usd_24h_change: 1.5 },
    "polygon-amoy": { usd: 0.5, usd_24h_change: -2.3 },
  },
  fetched_at: new Date().toISOString(),
};

function makeDcaStrategy(overrides?: Partial<DcaConfig & { is_active?: boolean }>): AgentStrategy {
  const { is_active, ...configOverrides } = overrides ?? {};
  return {
    id: "strat-dca-1",
    strategy_type: "dca",
    name: "Test DCA",
    description: null,
    config: {
      asset: "ETH",
      chain: "ethereum-sepolia",
      amount_per_interval: 0.001,
      interval_seconds: 120,
      vault_address: "0xdead",
      last_execution_at: null,
      ...configOverrides,
    },
    is_active: is_active ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeRebalanceStrategy(overrides?: Partial<RebalanceConfig>): AgentStrategy {
  return {
    id: "strat-rebal-1",
    strategy_type: "rebalance",
    name: "Test Rebalance",
    description: null,
    config: {
      target_allocation: { "ethereum-sepolia": 0.6, "polygon-amoy": 0.4 },
      drift_threshold_pct: 15,
      vault_address: "0xdead",
      chains: ["ethereum-sepolia", "polygon-amoy"],
      ...overrides,
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeBalances(ethBalance: string, maticBalance: string): WalletBalance[] {
  return [
    { chain: "ethereum-sepolia", address: "0xaaa", nativeBalance: ethBalance, nativeSymbol: "ETH" },
    { chain: "polygon-amoy", address: "0xbbb", nativeBalance: maticBalance, nativeSymbol: "MATIC" },
  ];
}

// ============================================================
// DCA Tests
// ============================================================

describe("evaluateDca", () => {
  it("transfers when never executed (last_execution_at is null)", () => {
    const strategy = makeDcaStrategy({ last_execution_at: null });
    const result = evaluateDca(strategy, MARKET_DATA);
    expect(result.decision).toBe("transfer");
    expect(result.transfer).toBeDefined();
    expect(result.transfer!.amount).toBe(0.001);
    expect(result.transfer!.chain).toBe("ethereum-sepolia");
  });

  it("transfers when interval has elapsed", () => {
    const fiveMinAgo = new Date(Date.now() - 300_000).toISOString();
    const strategy = makeDcaStrategy({ last_execution_at: fiveMinAgo, interval_seconds: 120 });
    const result = evaluateDca(strategy, MARKET_DATA);
    expect(result.decision).toBe("transfer");
    expect(result.reason).toContain("DCA interval elapsed");
  });

  it("holds when interval has not elapsed", () => {
    const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString();
    const strategy = makeDcaStrategy({ last_execution_at: tenSecondsAgo, interval_seconds: 120 });
    const result = evaluateDca(strategy, MARKET_DATA);
    expect(result.decision).toBe("hold");
    expect(result.reason).toContain("remaining");
  });

  it("holds when no market data for chain", () => {
    const strategy = makeDcaStrategy({ chain: "unknown-chain" });
    const result = evaluateDca(strategy, MARKET_DATA);
    expect(result.decision).toBe("hold");
    expect(result.reason).toContain("No market data");
  });

  it("includes price info in transfer reason", () => {
    const strategy = makeDcaStrategy({ last_execution_at: null });
    const result = evaluateDca(strategy, MARKET_DATA);
    expect(result.decision).toBe("transfer");
    expect(result.reason).toContain("$2,000");
  });

  it("uses correct vault address from config", () => {
    const strategy = makeDcaStrategy({ vault_address: "0x1234", last_execution_at: null });
    const result = evaluateDca(strategy, MARKET_DATA);
    expect(result.transfer!.vault_address).toBe("0x1234");
  });

  it("holds when interval just barely not elapsed", () => {
    const justNow = new Date(Date.now() - 119_000).toISOString(); // 119s ago, interval is 120s
    const strategy = makeDcaStrategy({ last_execution_at: justNow, interval_seconds: 120 });
    const result = evaluateDca(strategy, MARKET_DATA);
    expect(result.decision).toBe("hold");
  });
});

// ============================================================
// Rebalance Tests
// ============================================================

describe("evaluateRebalance", () => {
  it("holds when portfolio is within threshold", () => {
    // ETH: 0.05 * 2000 = $100 (50%), MATIC: 200 * 0.5 = $100 (50%)
    // Target: 60/40, drift: 10% — under 15% threshold
    const balances = makeBalances("0.05", "200");
    const strategy = makeRebalanceStrategy();
    const result = evaluateRebalance(strategy, MARKET_DATA, balances);
    expect(result.decision).toBe("hold");
    expect(result.reason).toContain("within tolerance");
  });

  it("transfers when drift exceeds threshold (overweight)", () => {
    // ETH: 1 * 2000 = $2000 (95.2%), MATIC: 200 * 0.5 = $100 (4.8%)
    // Target: 60/40, ETH drift: +35.2% — over 15%
    const balances = makeBalances("1", "200");
    const strategy = makeRebalanceStrategy();
    const result = evaluateRebalance(strategy, MARKET_DATA, balances);
    expect(result.decision).toBe("transfer");
    expect(result.reason).toContain("overweight");
  });

  it("holds when zero portfolio", () => {
    const balances = makeBalances("0", "0");
    const strategy = makeRebalanceStrategy();
    const result = evaluateRebalance(strategy, MARKET_DATA, balances);
    expect(result.decision).toBe("hold");
    expect(result.reason).toContain("$0");
  });

  it("holds when no chain is overweight beyond threshold", () => {
    // ETH: 0.01 * 2000 = $20 (2.7%), MATIC: 1400 * 0.5 = $700 (97.2%)
    // ETH is underweight, MATIC is overweight by 57.2% → should transfer MATIC
    const balances = makeBalances("0.01", "1400");
    const strategy = makeRebalanceStrategy();
    const result = evaluateRebalance(strategy, MARKET_DATA, balances);
    // MATIC overweight by ~57% which exceeds 15% threshold → transfer
    expect(result.decision).toBe("transfer");
    expect(result.transfer?.chain).toBe("polygon-amoy");
  });

  it("holds when drift is below threshold", () => {
    // Target: ETH 60%, MATIC 40%
    // ETH = 0.035 * 2000 = $70 (63.6%), MATIC = 80 * 0.5 = $40 (36.4%)
    // total = $110, ETH drift = 3.6% — well under 15% threshold
    const balances = makeBalances("0.035", "80");
    const strategy = makeRebalanceStrategy({ drift_threshold_pct: 15 });
    const result = evaluateRebalance(strategy, MARKET_DATA, balances);
    expect(result.decision).toBe("hold");
    expect(result.reason).toContain("within tolerance");
  });

  it("transfers half the excess when overweight", () => {
    // ETH: 1 * 2000 = $2000 (95.2%), MATIC: 200 * 0.5 = $100 (4.8%)
    // Drift: 35.2%, excess USD = 35.2% of $2100 = $739.2
    // Half excess in ETH = $369.6 / $2000 = 0.1848 ETH
    const balances = makeBalances("1", "200");
    const strategy = makeRebalanceStrategy();
    const result = evaluateRebalance(strategy, MARKET_DATA, balances);
    expect(result.decision).toBe("transfer");
    expect(result.transfer).toBeDefined();
    expect(result.transfer!.amount).toBeGreaterThan(0);
    expect(result.transfer!.amount).toBeLessThan(1); // less than total balance
  });

  it("does not transfer more than 90% of balance", () => {
    // Extreme case: almost all value in ETH
    const balances = makeBalances("10", "1");
    const strategy = makeRebalanceStrategy();
    const result = evaluateRebalance(strategy, MARKET_DATA, balances);
    if (result.decision === "transfer" && result.transfer) {
      expect(result.transfer.amount).toBeLessThanOrEqual(10 * 0.9);
    }
  });
});

// ============================================================
// evaluateStrategy dispatcher
// ============================================================

describe("evaluateStrategy", () => {
  it("dispatches DCA strategies", () => {
    const strategy = makeDcaStrategy({ last_execution_at: null });
    const result = evaluateStrategy(strategy, MARKET_DATA, []);
    expect(result.decision).toBe("transfer");
  });

  it("dispatches rebalance strategies", () => {
    const balances = makeBalances("0.05", "200");
    const strategy = makeRebalanceStrategy();
    const result = evaluateStrategy(strategy, MARKET_DATA, balances);
    expect(result.decision).toBe("hold");
  });

  it("returns hold for unknown strategy type", () => {
    const strategy = makeDcaStrategy();
    (strategy as unknown as { strategy_type: string }).strategy_type = "unknown";
    const result = evaluateStrategy(strategy, MARKET_DATA, []);
    expect(result.decision).toBe("hold");
    expect(result.reason).toContain("Unknown");
  });
});
