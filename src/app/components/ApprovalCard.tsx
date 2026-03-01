"use client";

import { useState } from "react";
import type { ApprovalItem, Transaction } from "@/types";
import StatusBadge from "./StatusBadge";

export interface ApprovalWithTx extends ApprovalItem {
  transaction?: Transaction;
}

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
  approval: ApprovalWithTx;
  onDecision: (
    id: string,
    decision: "approved" | "rejected"
  ) => Promise<void>;
  isNew?: boolean;
}

export default function ApprovalCard({
  approval,
  onDecision,
  isNew,
}: Props) {
  const [loading, setLoading] = useState<"approved" | "rejected" | null>(
    null
  );
  const tx = approval.transaction;

  async function handleDecision(decision: "approved" | "rejected") {
    setLoading(decision);
    try {
      await onDecision(approval.id, decision);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className={`bg-[#12121e] border border-amber-500/20 rounded-xl p-5 ${isNew ? "animate-slide-in" : ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-200">
              {tx?.merchant || truncateAddress(tx?.recipient || "")}
            </p>
            <StatusBadge status={approval.flag_source} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatTimeAgo(approval.created_at)}
            {tx?.category && (
              <span className="text-gray-600 ml-2">{tx.category}</span>
            )}
          </p>
        </div>
        <p className="text-lg font-bold text-copper-400">
          ${tx?.amount.toFixed(2) ?? "—"}
        </p>
      </div>

      {/* Agent explanation */}
      {approval.agent_explanation && (
        <div className="bg-[#0a0a14] border border-gray-800/30 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            <span className="text-xs font-medium text-violet-400">
              AI Analysis
            </span>
          </div>
          <p className="text-sm text-gray-400">
            {approval.agent_explanation}
          </p>
        </div>
      )}

      {/* Anomaly details */}
      {approval.anomaly_details && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
          <span>
            Z-score:{" "}
            <span className="text-gray-300">
              {approval.anomaly_details.z_score?.toFixed(2) ?? "N/A"}
            </span>
          </span>
          <span>
            Method:{" "}
            <span className="text-gray-300">
              {approval.anomaly_details.method}
            </span>
          </span>
          <span>
            Mean:{" "}
            <span className="text-gray-300">
              $
              {approval.anomaly_details.historical_mean?.toFixed(2) ??
                "N/A"}
            </span>
          </span>
          <span>
            Std:{" "}
            <span className="text-gray-300">
              $
              {approval.anomaly_details.historical_std?.toFixed(2) ??
                "N/A"}
            </span>
          </span>
        </div>
      )}

      {/* Reason */}
      <p className="text-xs text-gray-500 mb-4">{approval.reason}</p>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleDecision("approved")}
          disabled={loading !== null}
          className="flex-1 py-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "approved" ? "Approving..." : "Approve"}
        </button>
        <button
          onClick={() => handleDecision("rejected")}
          disabled={loading !== null}
          className="flex-1 py-2 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "rejected" ? "Rejecting..." : "Reject"}
        </button>
      </div>
    </div>
  );
}
