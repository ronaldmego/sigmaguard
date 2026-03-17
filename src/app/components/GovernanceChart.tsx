"use client";

import { useMemo, useState } from "react";
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
  zScore: number | null;
}

export default function GovernanceChart({ transactions }: Props) {
  const [showMethodology, setShowMethodology] = useState(false);

  const { approvedData, flaggedData, chartMean, chartStd, upperBand, sampleSize, totalDeployed } =
    useMemo(() => {
      const governed = transactions
        .filter((t) => t.governance_result != null)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

      const amounts = governed.map((t) => Number(t.amount));

      // Compute stats from ALL governed transactions (matches anomaly engine approach)
      const n = amounts.length;
      const avg = n > 0 ? amounts.reduce((s, v) => s + v, 0) / n : 0;
      const sd =
        n > 1
          ? Math.sqrt(
              amounts.reduce((s, v) => s + (v - avg) ** 2, 0) / (n - 1)
            )
          : 1;
      const threshold = 2;
      const upper = avg + threshold * sd;

      const approved: ChartPoint[] = [];
      const flagged: ChartPoint[] = [];
      let sum = 0;

      governed.forEach((t, i) => {
        const amount = Number(t.amount);
        const z = sd > 0 ? (amount - avg) / sd : 0;
        const outcome =
          t.governance_result?.final_outcome === "flag_for_review"
            ? "flag_for_review"
            : "auto_approve";

        const point: ChartPoint = {
          index: i + 1,
          amount,
          label: t.description || `Tx ${i + 1}`,
          outcome,
          zScore: Math.round(z * 100) / 100,
        };

        if (outcome === "flag_for_review") {
          flagged.push(point);
        } else {
          approved.push(point);
        }

        sum += amount;
      });

      return {
        approvedData: approved,
        flaggedData: flagged,
        chartMean: Math.round(avg * 100) / 100,
        chartStd: Math.round(sd * 100) / 100,
        upperBand: Math.round(upper * 100) / 100,
        sampleSize: n,
        totalDeployed: sum,
      };
    }, [transactions]);

  const totalPoints = approvedData.length + flaggedData.length;

  if (totalPoints === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-brand-600" />
          <h3 className="text-sm font-medium text-gray-600">
            Anomaly Detection
          </h3>
        </div>
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Run the simulation to see governance decisions plotted in realtime
        </div>
      </div>
    );
  }

  const allAmounts = [...approvedData, ...flaggedData].map((d) => d.amount);
  const maxAmount = Math.max(...allAmounts);
  const yMax = Math.ceil(maxAmount * 1.15);
  const yMin = -maxAmount * 0.05;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-600" />
          <h3 className="text-sm font-medium text-gray-700">
            Anomaly Detection
          </h3>
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="text-[10px] text-gray-400 hover:text-brand-600 border border-gray-200 hover:border-brand-300 rounded px-1.5 py-0.5 transition-colors"
            title="Statistical methodology"
          >
            {showMethodology ? "Hide method" : "Methodology"}
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            Auto-approved
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
            Flagged
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-brand-500/10 border border-brand-500/20 rounded-sm" />
            Normal zone
          </span>
        </div>
      </div>

      {/* Methodology panel (overlay — does not affect card height) */}
      {showMethodology && (
        <div className="absolute top-10 left-4 right-4 z-20 p-2.5 bg-white border border-gray-200 rounded-lg shadow-lg text-xs text-gray-600 space-y-1">
          <p className="font-medium text-gray-700">Statistical Methodology — Six Sigma Anomaly Detection</p>
          <p>
            <span className="font-mono text-brand-600">Z-score = (x - μ) / σ</span>
            {" "}— measures how many standard deviations a transaction deviates from the historical mean.
            Threshold: |z| &gt; 2.0 (95.4% confidence interval).
          </p>
          <p>
            <span className="font-mono text-brand-600">IQR method</span>
            {" "}— secondary detector using Q1/Q3 percentiles. Outlier if x &lt; Q1−1.5·IQR or x &gt; Q3+1.5·IQR.
            Robust against non-normal distributions.
          </p>
          <div className="border-t border-gray-200 pt-1 mt-1 space-y-0.5">
            <p>
              <span className="text-gray-500">μ</span> = <span className="font-mono">${chartMean.toFixed(2)}</span>
              {" · "}
              <span className="text-gray-500">σ</span> = <span className="font-mono">${chartStd.toFixed(2)}</span>
              {" · "}
              <span className="text-gray-500">n</span> = <span className="font-mono">{sampleSize}</span>
              {" · "}
              <span className="text-gray-500">2σ threshold</span> = <span className="font-mono text-copper-600">${upperBand.toFixed(2)}</span>
            </p>
            <p className="text-gray-400">
              Computed dynamically from last 200 executed transactions per wallet. Uses Bessel&apos;s correction (n−1) for sample standard deviation.
            </p>
          </div>
        </div>
      )}

      {/* Agent Performance Summary */}
      <div className="flex items-center gap-6 mb-2 text-xs">
        <span className="text-gray-400">
          Agent Deployed:{" "}
          <span className="text-accent-600 font-mono font-medium">
            ${totalDeployed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </span>
        <span className="text-gray-400">
          Transactions:{" "}
          <span className="text-gray-700 font-mono">{totalPoints}</span>
        </span>
        <span className="text-gray-400">
          Approved:{" "}
          <span className="text-brand-600 font-mono">
            {approvedData.length}
          </span>
        </span>
        {flaggedData.length > 0 && (
          <span className="text-gray-400">
            Flagged:{" "}
            <span className="text-[#DC2626] font-mono">
              {flaggedData.length}
            </span>
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            vertical={false}
          />
          <XAxis
            type="number"
            dataKey="index"
            name="Transaction"
            domain={[0, totalPoints + 1]}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={{ stroke: "#e5e7eb" }}
            tickLine={false}
            label={{
              value: "Agent Transaction #",
              position: "insideBottom",
              offset: -5,
              fill: "#9ca3af",
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="amount"
            name="Amount"
            domain={[yMin, yMax]}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={{ stroke: "#e5e7eb" }}
            tickLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          />
          <Tooltip
            cursor={false}
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const data = payload[0].payload as ChartPoint;
              return (
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-lg">
                  <p className="text-gray-700 font-medium">{data.label}</p>
                  <p className="text-gray-500 mt-1">
                    Amount:{" "}
                    <span className="text-gray-900 font-mono">
                      ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </p>
                  {data.zScore !== null && (
                    <p className="text-gray-500">
                      Z-score:{" "}
                      <span className={`font-mono ${Math.abs(data.zScore) > 2 ? "text-copper-600 font-medium" : "text-gray-700"}`}>
                        {data.zScore.toFixed(2)}
                      </span>
                    </p>
                  )}
                  <p className="mt-1">
                    <span
                      className={
                        data.outcome === "flag_for_review"
                          ? "text-[#DC2626]"
                          : "text-brand-600"
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

          {/* Normal zone band (mean + threshold*sigma) */}
          <ReferenceArea
            y1={0}
            y2={upperBand}
            fill="#0D9488"
            fillOpacity={0.06}
            stroke="#0D9488"
            strokeOpacity={0.15}
            strokeDasharray="4 4"
          />

          {/* Mean line */}
          <ReferenceLine
            y={chartMean}
            stroke="#0D9488"
            strokeDasharray="6 4"
            strokeOpacity={0.5}
            label={{
              value: `\u03BC = $${chartMean.toFixed(2)}`,
              position: "right",
              fill: "#0D9488",
              fontSize: 10,
            }}
          />

          {/* Upper threshold line */}
          <ReferenceLine
            y={upperBand}
            stroke="#DC2626"
            strokeDasharray="6 4"
            strokeOpacity={0.5}
            label={{
              value: `2\u03C3 = $${upperBand.toFixed(2)}`,
              position: "right",
              fill: "#DC2626",
              fontSize: 10,
            }}
          />

          {/* Approved points (teal) */}
          <Scatter
            data={approvedData}
            fill="#0D9488"
            fillOpacity={0.85}
            r={5}
          />

          {/* Flagged points (red) */}
          <Scatter
            data={flaggedData}
            fill="#DC2626"
            fillOpacity={0.95}
            r={8}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
