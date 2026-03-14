"use client";

import { useEffect, useState, useRef } from "react";
import { getBrowserClient } from "@/lib/db/supabase";
import ApprovalCard, { type ApprovalWithTx } from "./ApprovalCard";

interface Props {
  initialApprovals: ApprovalWithTx[];
  onApprovalChange?: () => void;
}

export default function ApprovalQueue({
  initialApprovals,
  onApprovalChange,
}: Props) {
  const [approvals, setApprovals] =
    useState<ApprovalWithTx[]>(initialApprovals);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const onChangeRef = useRef(onApprovalChange);
  onChangeRef.current = onApprovalChange;

  useEffect(() => {
    setApprovals(initialApprovals);
  }, [initialApprovals]);

  useEffect(() => {
    const client = getBrowserClient();
    const channel = client
      .channel("approvals-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "pepa", table: "approval_queue" },
        async (payload) => {
          const newApproval = payload.new as ApprovalWithTx;
          setNewIds((prev) => new Set([...prev, newApproval.id]));
          setTimeout(
            () =>
              setNewIds((prev) => {
                const next = new Set(prev);
                next.delete(newApproval.id);
                return next;
              }),
            3000
          );
          const res = await fetch("/api/approvals");
          if (res.ok) {
            const data = await res.json();
            setApprovals(data.approvals);
          }
          onChangeRef.current?.();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  async function handleDecision(
    approvalId: string,
    decision: "approved" | "rejected"
  ) {
    const res = await fetch(`/api/approvals/${approvalId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, decided_by: "dashboard-user" }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to submit decision");
    }

    setApprovals((prev) => prev.filter((a) => a.id !== approvalId));
    onChangeRef.current?.();
  }

  if (approvals.length === 0) return null;

  return (
    <div id="approvals">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-gray-500">
          Pending Approvals
        </h2>
        <span className="bg-copper-50 text-copper-600 border border-copper-200 rounded-full px-2.5 py-0.5 text-xs font-medium">
          {approvals.length}
        </span>
      </div>
      <div className="space-y-3">
        {approvals.map((a) => (
          <ApprovalCard
            key={a.id}
            approval={a}
            onDecision={handleDecision}
            isNew={newIds.has(a.id)}
          />
        ))}
      </div>
    </div>
  );
}
