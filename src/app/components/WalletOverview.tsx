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
}

const CHAIN_LABELS: Record<string, string> = {
  "ethereum-sepolia": "Sepolia",
  "polygon-amoy": "Amoy",
};

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 h-full space-y-4">
      <h2 className="text-sm font-medium text-gray-500">Wallet</h2>

      {/* Portfolio snapshot — shown when simulation has run */}
      {portfolioSnapshot ? (
        <div>
          <p className="text-xs text-gray-400 mb-2">Portfolio</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-gray-400">ETH</p>
              <p className="text-base font-bold text-brand-700">
                {portfolioSnapshot.eth.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">MATIC</p>
              <p className="text-base font-bold text-accent-600">
                {portfolioSnapshot.matic.toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">USDT</p>
              <p className="text-base font-bold text-gray-700">
                ${portfolioSnapshot.usdt.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xs text-gray-400 mb-2">Portfolio</p>
          <p className="text-xs text-gray-300 italic">Run demo to see live balances</p>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Gas balances — real on-chain via WDK */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Gas (testnet)</p>
        <div className="grid grid-cols-2 gap-3">
          {wallets.map((w) => (
            <div key={w.chain}>
              <p className="text-xs text-gray-400 mb-0.5">
                {CHAIN_LABELS[w.chain] || w.chain}
              </p>
              <p className="text-sm font-semibold text-gray-600">
                {parseFloat(w.nativeBalance).toFixed(4)}{" "}
                <span className="text-xs font-normal text-gray-400">
                  {w.nativeSymbol}
                </span>
              </p>
              <button
                onClick={() => copyAddress(w.chain, w.address)}
                className="text-xs text-gray-400 hover:text-gray-600 font-mono mt-0.5 transition-colors"
              >
                {copiedChain === w.chain ? "Copied!" : truncateAddress(w.address)}
              </button>
              {w.error && (
                <p className="text-xs text-red-500 mt-1">{w.error}</p>
              )}
            </div>
          ))}
          {wallets.length === 0 && (
            <p className="text-sm text-gray-400">No wallets configured</p>
          )}
        </div>
      </div>
    </div>
  );
}
