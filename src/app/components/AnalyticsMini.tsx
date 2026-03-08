"use client";

import type { Transaction } from "@/types";

interface Props {
  transactions: Transaction[];
  pendingCount: number;
}

export default function AnalyticsMini({ transactions, pendingCount }: Props) {
  // Governed transactions = those that went through the pipeline (have governance_result)
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

  const stats = [
    {
      label: "Total Spend",
      value: `$${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      color: "text-cyan-400",
    },
    {
      label: "Transactions",
      value: String(transactions.length),
      color: "text-violet-400",
    },
    {
      label: "Anomaly Rate",
      value: `${anomalyRate}%`,
      color: anomalyCount > 0 ? "text-[#ea580c]" : "text-cyan-400",
    },
    {
      label: "Pending Approvals",
      value: String(pendingCount),
      color: pendingCount > 0 ? "text-[#ea580c]" : "text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-full">
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
