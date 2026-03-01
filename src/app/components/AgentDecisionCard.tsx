"use client";

import type { GovernancePipelineResult } from "@/types";
import StatusBadge from "./StatusBadge";

interface Props {
  result: GovernancePipelineResult;
}

export default function AgentDecisionCard({ result }: Props) {
  const {
    rules_result,
    anomaly_result,
    agent_interpretation,
    final_outcome,
  } = result;

  const layers = [
    {
      label: "Layer 1 — Fixed Rules",
      ok: rules_result.passed,
      color: rules_result.passed ? "bg-emerald-500" : "bg-red-500",
      content: rules_result.passed ? (
        <p className="text-gray-500">
          All {rules_result.evaluations.length} rules passed
        </p>
      ) : (
        <div className="space-y-0.5">
          {rules_result.failed_rules.map((r) => (
            <p key={r.rule_id} className="text-red-400">
              {r.rule_name}: {r.reason}
            </p>
          ))}
        </div>
      ),
    },
    {
      label: "Layer 2 — Anomaly Detection",
      ok: !anomaly_result.is_anomaly,
      color: anomaly_result.is_anomaly ? "bg-copper-500" : "bg-emerald-500",
      content: (
        <>
          <p className="text-gray-500">
            {anomaly_result.is_anomaly ? "Flagged" : "Normal"} — Z-score:{" "}
            {anomaly_result.z_score?.toFixed(2) ?? "N/A"}, Method:{" "}
            {anomaly_result.method}
          </p>
          <p className="text-gray-600 text-xs mt-0.5">
            {anomaly_result.reason}
          </p>
        </>
      ),
    },
    {
      label: "Layer 3 — AI Agent",
      ok: agent_interpretation.recommendation === "auto_approve",
      color: "bg-violet-500",
      content: (
        <>
          <p className="text-gray-400">{agent_interpretation.explanation}</p>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={agent_interpretation.recommendation} />
            <span className="text-xs text-gray-600">
              Confidence:{" "}
              {(agent_interpretation.confidence * 100).toFixed(0)}% ·{" "}
              {agent_interpretation.model_used}
            </span>
          </div>
        </>
      ),
    },
    {
      label: "Layer 4 — Final Outcome",
      ok: final_outcome === "auto_approve",
      color:
        final_outcome === "auto_approve"
          ? "bg-emerald-500"
          : final_outcome === "reject"
            ? "bg-red-500"
            : "bg-amber-500",
      content: <StatusBadge status={final_outcome} />,
    },
  ];

  return (
    <div className="space-y-3 text-sm">
      {layers.map((layer) => (
        <div key={layer.label} className="flex items-start gap-3">
          <div
            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${layer.color}`}
          />
          <div className="min-w-0">
            <p className="font-medium text-gray-300">{layer.label}</p>
            {layer.content}
          </div>
        </div>
      ))}
    </div>
  );
}
