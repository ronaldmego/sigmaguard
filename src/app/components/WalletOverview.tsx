"use client";

import { useState } from "react";

interface WalletInfo {
  chain: string;
  address: string;
  nativeBalance: string;
  nativeSymbol: string;
  error?: string;
}

interface PortfolioSnapshot {
  eth: number;
  matic: number;
  usdt: number;
  prices: { eth: number; matic: number } | null;
}

// Target allocation from rebalance strategy (60% ETH / 40% MATIC)
const TARGET = { eth: 60, matic: 40 };

const CHAIN_LABELS: Record<string, string> = {
  "ethereum-sepolia": "Sepolia",
  "polygon-amoy": "Amoy",
};

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function DriftIcon({ current, target }: { current: number; target: number }) {
  const diff = current - target;
  if (Math.abs(diff) <= 2) return <span className="text-brand-600 text-xs">✓</span>;
  if (diff > 0) return <span className="text-copper-600 text-xs">⚠</span>;
  return <span className="text-accent-600 text-xs">↑</span>;
}

export default function WalletOverview({
  wallets,
  portfolioSnapshot,
}: {
  wallets: WalletInfo[];
  portfolioSnapshot: PortfolioSnapshot | null;
}) {
  const [copiedChain, setCopiedChain] = useState<string | null>(null);

  function copyAddress(chain: string, addr: string) {
    navigator.clipboard.writeText(addr);
    setCopiedChain(chain);
    setTimeout(() => setCopiedChain(null), 2000);
  }

  // Compute USD values and allocation percentages
  const ethUsd = portfolioSnapshot && portfolioSnapshot.prices
    ? portfolioSnapshot.eth * portfolioSnapshot.prices.eth
    : null;
  const maticUsd = portfolioSnapshot && portfolioSnapshot.prices
    ? portfolioSnapshot.matic * portfolioSnapshot.prices.matic
    : null;
  const totalUsd = ethUsd !== null && maticUsd !== null && portfolioSnapshot
    ? ethUsd + maticUsd + portfolioSnapshot.usdt
    : null;

  const ethPct = totalUsd && ethUsd !== null ? (ethUsd / totalUsd) * 100 : null;
  const maticPct = totalUsd && maticUsd !== null ? (maticUsd / totalUsd) * 100 : null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 h-full">
      <h2 className="text-sm font-medium text-gray-500">Wallet</h2>

      {/* Portfolio section */}
      {portfolioSnapshot ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-xs text-gray-400">Portfolio</p>
            {totalUsd !== null && (
              <p className="text-sm font-bold text-gray-700">
                ${totalUsd.toFixed(2)}
                <span className="text-xs font-normal text-gray-400 ml-1">USD</span>
              </p>
            )}
          </div>

          {/* ETH bar */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-gray-600 font-medium">ETH</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">
                  {ethPct !== null ? `${ethPct.toFixed(1)}%` : `${portfolioSnapshot.eth.toFixed(4)}`}
                </span>
                {ethPct !== null && (
                  <>
                    <span className="text-xs text-gray-300">→ {TARGET.eth}%</span>
                    <DriftIcon current={ethPct} target={TARGET.eth} />
                  </>
                )}
              </div>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-brand-500 transition-all duration-500"
                style={{ width: `${Math.min(ethPct ?? (portfolioSnapshot.eth * 100 / (portfolioSnapshot.eth + portfolioSnapshot.matic)), 100)}%` }}
              />
              {ethPct !== null && (
                <div
                  className="absolute inset-y-0 w-0.5 bg-brand-300 opacity-60"
                  style={{ left: `${TARGET.eth}%` }}
                />
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {portfolioSnapshot.eth.toFixed(4)} ETH
              {ethUsd !== null && ` = $${ethUsd.toFixed(2)}`}
            </p>
          </div>

          {/* MATIC bar */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-gray-600 font-medium">MATIC</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">
                  {maticPct !== null ? `${maticPct.toFixed(1)}%` : `${portfolioSnapshot.matic.toFixed(1)}`}
                </span>
                {maticPct !== null && (
                  <>
                    <span className="text-xs text-gray-300">→ {TARGET.matic}%</span>
                    <DriftIcon current={maticPct} target={TARGET.matic} />
                  </>
                )}
              </div>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent-500 transition-all duration-500"
                style={{ width: `${Math.min(maticPct ?? (portfolioSnapshot.matic * 100 / (portfolioSnapshot.eth + portfolioSnapshot.matic)), 100)}%` }}
              />
              {maticPct !== null && (
                <div
                  className="absolute inset-y-0 w-0.5 bg-accent-300 opacity-60"
                  style={{ left: `${TARGET.matic}%` }}
                />
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {portfolioSnapshot.matic.toFixed(1)} MATIC
              {maticUsd !== null && ` = $${maticUsd.toFixed(2)}`}
            </p>
          </div>

          {/* USDT row (no bar, it's stable) */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-50">
            <span className="text-xs text-gray-600 font-medium">USDT</span>
            <span className="text-sm font-bold text-gray-700">${portfolioSnapshot.usdt.toFixed(2)}</span>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-400 mb-1">Portfolio</p>
          <p className="text-xs text-gray-300 italic">Run demo to see live balances</p>
        </div>
      )}

      {/* Gas balances — compact, real on-chain via WDK */}
      <div className="border-t border-gray-100 pt-2">
        <p className="text-xs text-gray-400 mb-1">Gas (testnet)</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {wallets.map((w) => (
            <div key={w.chain} className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">{CHAIN_LABELS[w.chain] || w.chain}</span>
              <span className="text-xs font-mono text-gray-600">
                {parseFloat(w.nativeBalance).toFixed(4)} {w.nativeSymbol}
              </span>
              <button
                onClick={() => copyAddress(w.chain, w.address)}
                className="text-[10px] font-mono text-gray-300 hover:text-gray-500 transition-colors"
              >
                {copiedChain === w.chain ? "✓" : truncateAddress(w.address)}
              </button>
            </div>
          ))}
          {wallets.length === 0 && (
            <p className="text-xs text-gray-400">No wallets configured</p>
          )}
        </div>
      </div>
    </div>
  );
}
