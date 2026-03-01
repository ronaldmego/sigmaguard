"use client";

import { useState, useEffect, useCallback } from "react";

interface WalletInfo {
  chain: string;
  address: string;
  nativeBalance: string;
  nativeSymbol: string;
}

interface MarketPrices {
  [chain: string]: { usd: number; usd_24h_change: number };
}

const CHAIN_COLORS: Record<string, string> = {
  "ethereum-sepolia": "bg-violet-500",
  "polygon-amoy": "bg-cyan-500",
};

const CHAIN_LABELS: Record<string, string> = {
  "ethereum-sepolia": "ETH",
  "polygon-amoy": "MATIC",
};

export default function PortfolioAllocation({
  wallets,
}: {
  wallets: WalletInfo[];
}) {
  const [prices, setPrices] = useState<MarketPrices>({});
  const [targetAllocation, setTargetAllocation] = useState<Record<string, number> | null>(null);

  // Fetch prices from agent status (which includes market data implicitly via strategies)
  const fetchPrices = useCallback(async () => {
    try {
      // Use CoinGecko directly for display — same endpoint as market.ts
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,matic-network&vs_currencies=usd&include_24hr_change=true",
        { signal: AbortSignal.timeout(10000) }
      );
      if (res.ok) {
        const data = await res.json();
        const mapped: MarketPrices = {};
        if (data.ethereum) {
          mapped["ethereum-sepolia"] = {
            usd: data.ethereum.usd,
            usd_24h_change: data.ethereum.usd_24h_change ?? 0,
          };
        }
        if (data["matic-network"]) {
          mapped["polygon-amoy"] = {
            usd: data["matic-network"].usd,
            usd_24h_change: data["matic-network"].usd_24h_change ?? 0,
          };
        }
        setPrices(mapped);
      }
    } catch {
      // silent
    }
  }, []);

  // Fetch target allocation from rebalance strategy
  useEffect(() => {
    async function fetchTarget() {
      try {
        const res = await fetch("/api/agent/status");
        if (res.ok) {
          const data = await res.json();
          const rebalance = data.strategies_list?.find(
            (s: { strategy_type: string }) => s.strategy_type === "rebalance"
          );
          if (rebalance?.config?.target_allocation) {
            setTargetAllocation(rebalance.config.target_allocation);
          }
        }
      } catch {
        // silent
      }
    }
    fetchTarget();
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Calculate USD values
  const allocations = wallets
    .map((w) => {
      const price = prices[w.chain];
      const balance = parseFloat(w.nativeBalance) || 0;
      const usdValue = price ? balance * price.usd : 0;
      return { chain: w.chain, balance, usdValue, symbol: w.nativeSymbol };
    })
    .filter((a) => a.usdValue > 0 || a.balance > 0);

  const totalUsd = allocations.reduce((s, a) => s + a.usdValue, 0);

  return (
    <div className="bg-[#12121e] border border-gray-800/50 rounded-xl p-5 h-full">
      <h2 className="text-sm font-medium text-gray-400 mb-4">
        Portfolio Allocation
      </h2>

      {/* Total value */}
      <p className="text-2xl font-bold text-gray-200 mb-4">
        ${totalUsd.toFixed(2)}
        <span className="text-xs font-normal text-gray-500 ml-1">USD</span>
      </p>

      {/* Allocation bars */}
      <div className="space-y-3">
        {allocations.map((alloc) => {
          const pct = totalUsd > 0 ? (alloc.usdValue / totalUsd) * 100 : 0;
          const targetPct = targetAllocation
            ? (targetAllocation[alloc.chain] ?? 0) * 100
            : null;
          const color =
            CHAIN_COLORS[alloc.chain] ?? "bg-gray-500";
          const label = CHAIN_LABELS[alloc.chain] ?? alloc.symbol;

          return (
            <div key={alloc.chain}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs text-gray-500">
                  {pct.toFixed(1)}%
                  {targetPct !== null && (
                    <span className="text-gray-600 ml-1">
                      (target: {targetPct}%)
                    </span>
                  )}
                </span>
              </div>
              <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                {/* Actual allocation */}
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${color} transition-all duration-500`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
                {/* Target marker */}
                {targetPct !== null && targetPct > 0 && (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-white/30"
                    style={{ left: `${Math.min(targetPct, 100)}%` }}
                  />
                )}
              </div>
              <p className="text-[10px] text-gray-600 mt-0.5">
                {alloc.balance.toFixed(4)} {alloc.symbol} = $
                {alloc.usdValue.toFixed(2)}
              </p>
            </div>
          );
        })}

        {allocations.length === 0 && (
          <p className="text-xs text-gray-600">No balances to display</p>
        )}
      </div>
    </div>
  );
}
