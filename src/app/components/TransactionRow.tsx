"use client";

import { useState } from "react";
import type { Transaction } from "@/types";
import StatusBadge from "./StatusBadge";
import AgentDecisionCard from "./AgentDecisionCard";

function formatTimeAgo(iso: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

interface Props {
  tx: Transaction;
  isNew?: boolean;
}

export default function TransactionRow({ tx, isNew }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border-b border-gray-100 last:border-b-0 ${isNew ? "animate-slide-in" : ""}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 py-3 px-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 truncate">
              {tx.merchant || truncateAddress(tx.recipient)}
            </span>
            {tx.category && (
              <span className="text-xs text-gray-400">{tx.category}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatTimeAgo(tx.created_at)}
            {tx.chain && (
              <span className="text-gray-300 ml-2">{tx.chain}</span>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-gray-800">${tx.amount.toFixed(2)}</p>
          <p className="text-xs text-gray-400">{tx.currency}</p>
        </div>
        <div className="shrink-0">
          <StatusBadge status={tx.status} />
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {expanded && tx.governance_result && (
        <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
          <AgentDecisionCard result={tx.governance_result} />
        </div>
      )}
    </div>
  );
}
