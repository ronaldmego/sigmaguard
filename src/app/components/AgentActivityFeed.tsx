"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/db/supabase";
import type { AgentRun } from "@/types";
import StatusBadge from "./StatusBadge";

export default function AgentActivityFeed() {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  // Fetch initial history
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agent/history?limit=20");
        if (res.ok) {
          const data = await res.json();
          setRuns(data.runs ?? []);
        }
      } catch {
        // silent
      }
    }
    load();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const client = getBrowserClient();
    const channel = client
      .channel("agent-runs-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "pepa", table: "agent_runs" },
        (payload) => {
          const newRun = payload.new as AgentRun;
          setRuns((prev) => [newRun, ...prev].slice(0, 50));
          setNewIds((prev) => new Set([...prev, newRun.id]));
          setTimeout(
            () =>
              setNewIds((prev) => {
                const next = new Set(prev);
                next.delete(newRun.id);
                return next;
              }),
            3000
          );
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  if (runs.length === 0) {
    return (
      <div className="bg-[#12121e] border border-gray-800/50 rounded-xl p-5">
        <h2 className="text-sm font-medium text-gray-400 mb-3">
          Agent Activity
        </h2>
        <p className="text-xs text-gray-600">
          No agent runs yet. Start the agent to see activity.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#12121e] border border-gray-800/50 rounded-xl p-5">
      <h2 className="text-sm font-medium text-gray-400 mb-3">
        Agent Activity
      </h2>
      <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {runs.map((run) => (
          <div
            key={run.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
              newIds.has(run.id)
                ? "bg-violet-500/10 border-violet-500/30 animate-slide-in"
                : "bg-[#0a0a14] border-gray-800/30"
            }`}
          >
            {/* Decision icon */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                run.decision === "transfer"
                  ? "bg-cyan-500/15 text-cyan-400"
                  : "bg-gray-500/15 text-gray-500"
              }`}
            >
              {run.decision === "transfer" ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12l7-7 7 7" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <StatusBadge status={run.strategy_type} />
                <StatusBadge status={run.decision} />
                {run.governance_outcome && (
                  <StatusBadge status={run.governance_outcome} />
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {run.decision_reason}
              </p>
            </div>

            {/* Timestamp */}
            <span className="text-[10px] text-gray-600 flex-shrink-0">
              {new Date(run.created_at).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
