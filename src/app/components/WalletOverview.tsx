"use client";

import { useState } from "react";

interface WalletInfo {
  chain: string;
  address: string;
  nativeBalance: string;
  nativeSymbol: string;
  error?: string;
}

const CHAIN_LABELS: Record<string, string> = {
  "ethereum-sepolia": "Ethereum Sepolia",
  "polygon-amoy": "Polygon Amoy",
};

const CHAIN_COLORS: Record<string, string> = {
  "ethereum-sepolia": "text-brand-700",
  "polygon-amoy": "text-accent-600",
};

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletOverview({
  wallets,
}: {
  wallets: WalletInfo[];
}) {
  const [copiedChain, setCopiedChain] = useState<string | null>(null);

  function copyAddress(chain: string, addr: string) {
    navigator.clipboard.writeText(addr);
    setCopiedChain(chain);
    setTimeout(() => setCopiedChain(null), 2000);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 h-full">
      <h2 className="text-sm font-medium text-gray-500 mb-4">Wallet</h2>
      <div className="grid grid-cols-2 gap-4">
        {wallets.map((w) => (
          <div key={w.chain}>
            <p className="text-xs text-gray-400 mb-1">
              {CHAIN_LABELS[w.chain] || w.chain}
            </p>
            <p
              className={`text-xl font-bold ${CHAIN_COLORS[w.chain] || "text-gray-800"}`}
            >
              {parseFloat(w.nativeBalance).toFixed(4)}{" "}
              <span className="text-sm font-normal text-gray-400">
                {w.nativeSymbol}
              </span>
            </p>
            <button
              onClick={() => copyAddress(w.chain, w.address)}
              className="text-xs text-gray-400 hover:text-gray-600 font-mono mt-1 transition-colors"
            >
              {copiedChain === w.chain
                ? "Copied!"
                : truncateAddress(w.address)}
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
  );
}
