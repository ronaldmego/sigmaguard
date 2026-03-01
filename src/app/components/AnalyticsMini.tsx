"use client";

import type { Transaction } from "@/types";

interface Props {
  transactions: Transaction[];
  pendingCount: number;
}

export default function AnalyticsMini({ transactions, pendingCount }: Props) {
  const executedTxs = transactions.filter((t) => t.status === "executed");
  const totalSpend = executedTxs.reduce((sum, t) => sum + t.amount, 0);

  const anomalyCount = transactions.filter(
    (t) => t.governance_result?.anomaly_result?.is_anomaly
  ).length;
  const anomalyRate =
    transactions.length > 0
      ? ((anomalyCount / transactions.length) * 100).toFixed(1)
      : "0";

  const stats = [
    {
      label: "Total Spend",
      value: `$${totalSpend.toFixed(2)}`,
      color: "text-violet-400",
    },
    {
      label: "Anomaly Rate",
      value: `${anomalyRate}%`,
      color: "text-cyan-400",
    },
    {
      label: "Pending Approvals",
      value: String(pendingCount),
      color: pendingCount > 0 ? "text-copper-400" : "text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 h-full">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-[#12121e] border border-gray-800/50 rounded-xl p-4 flex flex-col justify-center"
        >
          <p className="text-xs text-gray-500 mb-1">{s.label}</p>
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
