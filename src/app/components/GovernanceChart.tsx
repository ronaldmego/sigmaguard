"use client";

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { Transaction } from "@/types";

interface Props {
  transactions: Transaction[];
}

interface ChartPoint {
  index: number;
  amount: number;
  label: string;
  outcome: "auto_approve" | "flag_for_review";
}

export default function GovernanceChart({ transactions }: Props) {
  const { approvedData, flaggedData, mean, upperBand, totalDeployed } =
    useMemo(() => {
      // Only transactions with governance_result (agent/simulation txs)
      const governed = transactions
        .filter((t) => t.governance_result != null)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

      const approved: ChartPoint[] = [];
      const flagged: ChartPoint[] = [];

      let sum = 0;
      let count = 0;

      governed.forEach((t, i) => {
        const amount = Number(t.amount);
        const outcome =
          t.governance_result?.final_outcome === "flag_for_review"
            ? "flag_for_review"
            : "auto_approve";

        const point: ChartPoint = {
          index: i + 1,
          amount,
          label: t.description || `Tx ${i + 1}`,
          outcome,
        };

        if (outcome === "flag_for_review") {
          flagged.push(point);
        } else {
          approved.push(point);
        }

        sum += amount;
        count++;
      });

      const computedMean = count > 0 ? sum / count : 0;
      // Use anomaly_result stats if available, otherwise compute from data
      const firstGoverned = governed[0];
      const statsFromResult =
        firstGoverned?.governance_result?.anomaly_result;
      const historicalMean = statsFromResult?.historical_mean ?? computedMean;
      const historicalStd = statsFromResult?.historical_std ?? 1;
      const threshold = statsFromResult?.threshold ?? 2;
      const upper = historicalMean + threshold * historicalStd;

      return {
        approvedData: approved,
        flaggedData: flagged,
        mean: historicalMean,
        upperBand: upper,
        totalDeployed: sum,
      };
    }, [transactions]);

  const totalPoints = approvedData.length + flaggedData.length;

  if (totalPoints === 0) {
    return (
      <div className="bg-[#0a0a14] border border-gray-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <h3 className="text-sm font-medium text-gray-300">
            Anomaly Detection
          </h3>
        </div>
        <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
          Run the simulation to see governance decisions plotted in realtime
        </div>
      </div>
    );
  }

  // Y-axis domain: small negative padding so points don't sit on the floor
  const allAmounts = [...approvedData, ...flaggedData].map((d) => d.amount);
  const maxAmount = Math.max(...allAmounts);
  const yMax = Math.ceil(maxAmount * 1.15);
  const yMin = -maxAmount * 0.05;

  return (
    <div className="bg-[#0a0a14] border border-gray-800/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <h3 className="text-sm font-medium text-gray-300">
            Anomaly Detection
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Auto-approved
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ea580c]" />
            Flagged
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-violet-500/20 border border-violet-500/30 rounded-sm" />
            Normal zone
          </span>
        </div>
      </div>

      {/* Agent Performance Summary */}
      <div className="flex items-center gap-6 mb-4 text-xs">
        <span className="text-gray-500">
          Agent Deployed:{" "}
          <span className="text-cyan-400 font-mono font-medium">
            ${totalDeployed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </span>
        <span className="text-gray-500">
          Transactions:{" "}
          <span className="text-gray-300 font-mono">{totalPoints}</span>
        </span>
        <span className="text-gray-500">
          Approved:{" "}
          <span className="text-cyan-400 font-mono">
            {approvedData.length}
          </span>
        </span>
        {flaggedData.length > 0 && (
          <span className="text-gray-500">
            Flagged:{" "}
            <span className="text-[#ea580c] font-mono">
              {flaggedData.length}
            </span>
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1e1e2e"
            vertical={false}
          />
          <XAxis
            type="number"
            dataKey="index"
            name="Transaction"
            domain={[0, totalPoints + 1]}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={{ stroke: "#1e1e2e" }}
            tickLine={false}
            label={{
              value: "Agent Transaction #",
              position: "insideBottom",
              offset: -5,
              fill: "#4b5563",
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="amount"
            name="Amount"
            domain={[yMin, yMax]}
            tick={{ fill: "#6b7280", fontSize: 11 }}
            axisLine={{ stroke: "#1e1e2e" }}
            tickLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          />
          <Tooltip
            cursor={false}
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const data = payload[0].payload as ChartPoint;
              return (
                <div className="bg-[#12121e] border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
                  <p className="text-gray-300 font-medium">{data.label}</p>
                  <p className="text-gray-400 mt-1">
                    Amount:{" "}
                    <span className="text-white font-mono">
                      ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </p>
                  <p className="mt-1">
                    <span
                      className={
                        data.outcome === "flag_for_review"
                          ? "text-[#ea580c]"
                          : "text-cyan-400"
                      }
                    >
                      {data.outcome === "flag_for_review"
                        ? "Flagged for review"
                        : "Auto-approved"}
                    </span>
                  </p>
                </div>
              );
            }}
          />

          {/* Normal zone band (mean ± threshold×σ) */}
          <ReferenceArea
            y1={0}
            y2={upperBand}
            fill="#7c3aed"
            fillOpacity={0.08}
            stroke="#7c3aed"
            strokeOpacity={0.2}
            strokeDasharray="4 4"
          />

          {/* Mean line */}
          <ReferenceLine
            y={mean}
            stroke="#7c3aed"
            strokeDasharray="6 4"
            strokeOpacity={0.6}
            label={{
              value: `μ = $${mean.toFixed(2)}`,
              position: "right",
              fill: "#7c3aed",
              fontSize: 10,
            }}
          />

          {/* Upper threshold line */}
          <ReferenceLine
            y={upperBand}
            stroke="#ea580c"
            strokeDasharray="6 4"
            strokeOpacity={0.6}
            label={{
              value: `2σ = $${upperBand.toFixed(2)}`,
              position: "right",
              fill: "#ea580c",
              fontSize: 10,
            }}
          />

          {/* Approved points (cyan) */}
          <Scatter
            data={approvedData}
            fill="#06b6d4"
            fillOpacity={0.85}
            r={5}
          />

          {/* Flagged points (copper) */}
          <Scatter
            data={flaggedData}
            fill="#ea580c"
            fillOpacity={0.95}
            r={8}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
