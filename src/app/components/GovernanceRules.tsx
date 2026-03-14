"use client";

import type { GovernanceRule } from "@/types";
import RuleCard from "./RuleCard";

interface Props {
  rules: GovernanceRule[];
  onRuleUpdate: (
    id: string,
    config: Record<string, unknown>
  ) => Promise<void>;
}

export default function GovernanceRules({ rules, onRuleUpdate }: Props) {
  return (
    <div id="rules">
      <h2 className="text-sm font-medium text-gray-500 mb-3">
        Governance Rules
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rules.map((rule) => (
          <RuleCard key={rule.id} rule={rule} onUpdate={onRuleUpdate} />
        ))}
      </div>
      {rules.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-400 text-sm">No governance rules configured</p>
        </div>
      )}
    </div>
  );
}
