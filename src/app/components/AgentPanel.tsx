"use client";

import { useState, useEffect, useCallback } from "react";
import type { AgentStatusInfo, AgentStrategy } from "@/types";

interface AgentStatusResponse extends AgentStatusInfo {
  strategies_list: AgentStrategy[];
}

export default function AgentPanel() {
  const [data, setData] = useState<AgentStatusResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsDemo(params.get("demo") === "true");
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/status");
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function handleToggle() {
    if (!data) return;
    setActionLoading(true);
    try {
      const endpoint =
        data.status === "running" ? "/api/agent/stop" : "/api/agent/start";
      const res = await fetch(endpoint, { method: "POST" });
      if (res.ok) {
        await fetchStatus();
      }
    } catch {
      // silent
    } finally {
      setActionLoading(false);
    }
  }

  const isRunning = data?.status === "running";
  const isSimulationActive = !isRunning && data?.has_recent_activity === true;
  const isOperating = isRunning || isSimulationActive;

  // Countdown to next run
  const [countdown, setCountdown] = useState<string | null>(null);
  const nextRunAt = data?.next_run_at;
  const agentStatusValue = data?.status;
  useEffect(() => {
    if (!nextRunAt || agentStatusValue !== "running") {
      setCountdown(null);
      return;
    }
    const targetTime = new Date(nextRunAt).getTime();
    function tick() {
      const diff = Math.max(0, Math.floor((targetTime - Date.now()) / 1000));
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setCountdown(`${m}:${s.toString().padStart(2, "0")}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextRunAt, agentStatusValue]);

  return (
    <div className="bg-[#12121e] border border-gray-800/50 rounded-xl p-5">
      {/* Header with status */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-400">Autonomous Agent</h2>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isOperating
                ? "bg-emerald-500 animate-live-pulse"
                : data?.status === "error"
                  ? "bg-red-500"
                  : "bg-gray-500"
            }`}
          />
          <span className="text-xs text-gray-500 capitalize">
            {isSimulationActive ? "simulation running" : (data?.status ?? "loading")}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-xs text-gray-500">Total Runs</p>
          <p className="text-lg font-bold text-gray-200">
            {data?.runs.total ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Transfers</p>
          <p className="text-lg font-bold text-cyan-400">
            {data?.runs.transfers ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Strategies</p>
          <p className="text-lg font-bold text-violet-400">
            {data?.strategies.active ?? 0}
            <span className="text-xs font-normal text-gray-500">
              /{data?.strategies.total ?? 0}
            </span>
          </p>
        </div>
      </div>

      {/* Next run countdown */}
      {isRunning && countdown && (
        <div className="mb-4 px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
          <p className="text-xs text-gray-500">Next cycle in</p>
          <p className="text-sm font-mono text-emerald-400">{countdown}</p>
        </div>
      )}

      {/* Last run info */}
      {data?.last_run && (
        <p className="text-xs text-gray-600 mb-4">
          Last run:{" "}
          {new Date(data.last_run).toLocaleTimeString()}
        </p>
      )}

      {/* Simulation active indicator */}
      {isSimulationActive && (
        <div className="mb-4 px-3 py-2 bg-violet-500/5 border border-violet-500/20 rounded-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-live-pulse" />
          <p className="text-xs text-violet-400">Agent operating via simulation</p>
        </div>
      )}

      {/* Start / Stop button */}
      <button
        onClick={handleToggle}
        disabled={actionLoading || !data || isSimulationActive || isDemo}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
          isRunning
            ? "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
            : "bg-gradient-to-r from-copper-600 to-copper-700 text-white hover:from-copper-500 hover:to-copper-600"
        }`}
      >
        {actionLoading
          ? "..."
          : isSimulationActive
            ? "Agent Operating"
            : isRunning
              ? "Stop Agent"
              : isDemo
                ? "Use Run Demo above"
                : "Start Agent"}
      </button>
    </div>
  );
}
