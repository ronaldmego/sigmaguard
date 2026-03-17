"use client";

import type { Transaction } from "@/types";

interface Props {
  transactions: Transaction[];
  pendingCount: number;
}

export default function AnalyticsMini({ transactions, pendingCount }: Props) {
  const governedTxs = transactions.filter((t) => t.governance_result != null);

  const anomalyCount = governedTxs.filter(
    (t) => t.governance_result?.anomaly_result?.is_anomaly
  ).length;
  const anomalyRate =
    governedTxs.length > 0
      ? ((anomalyCount / governedTxs.length) * 100).toFixed(1)
      : "0";

  const totalSpend = transactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );
  const avgTx = transactions.length > 0 ? totalSpend / transactions.length : 0;

  const stats = [
    {
      label: "Avg Transaction",
      value: `$${avgTx.toFixed(2)}`,
      color: "text-accent-600",
    },
    {
      label: "Transactions",
      value: String(transactions.length),
      color: "text-gray-800",
    },
    {
      label: "Anomaly Rate",
      value: `${anomalyRate}%`,
      color: anomalyCount > 0 ? "text-copper-600" : "text-brand-600",
    },
    {
      label: "Pending Approvals",
      value: String(pendingCount),
      color: pendingCount > 0 ? "text-copper-600" : "text-brand-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col justify-center"
        >
          <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
          <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
