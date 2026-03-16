"use client";

import type { Transaction } from "@/types";

interface Props {
  transactions: Transaction[];
}

export default function AgentVolume({ transactions }: Props) {
  const totalVolume = transactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  // Last 6 transactions for delta feed
  const recentTxs = [...transactions]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 6);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 h-full flex flex-col">
      <p className="text-xs text-gray-400 mb-1">Agent Volume</p>
      <p className="text-3xl font-bold text-accent-600 mb-1">
        ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className="text-xs text-gray-400 mb-3">
        {transactions.length} transactions processed
      </p>

      {/* Recent deltas */}
      <div className="flex-1 space-y-1.5 overflow-hidden">
        {recentTxs.map((tx, i) => {
          const amount = Number(tx.amount);
          const isAnomaly = tx.governance_result?.anomaly_result?.is_anomaly;
          return (
            <div
              key={tx.id || i}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-gray-500 truncate max-w-[60%]">
                {tx.category || "transfer"}
              </span>
              <span
                className={`font-mono font-medium ${
                  isAnomaly
                    ? "text-copper-600"
                    : "text-brand-600"
                }`}
              >
                +${amount.toFixed(2)}
                {isAnomaly && (
                  <span className="ml-1 text-copper-500" title="Anomaly detected">
                    !
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
