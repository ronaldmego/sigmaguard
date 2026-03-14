"use client";

import { useState } from "react";
import type { GovernanceRule } from "@/types";

const RULE_ICONS: Record<string, string> = {
  max_amount: "\u2B06",
  daily_cap: "\uD83D\uDCCA",
  merchant_blacklist: "\uD83D\uDEAB",
  merchant_whitelist: "\u2705",
  category_limit: "\uD83D\uDCC1",
  frequency_limit: "\u23F1",
};

function getEditableField(
  rule: GovernanceRule
): { key: string; value: string; isAmount: boolean } | null {
  const cfg = rule.config as Record<string, unknown>;
  const amountKeys = [
    "max_amount",
    "daily_limit",
    "limit",
  ];
  const countKeys = ["max_transactions"];

  for (const k of amountKeys) {
    if (k in cfg) return { key: k, value: String(cfg[k]), isAmount: true };
  }
  for (const k of countKeys) {
    if (k in cfg)
      return { key: k, value: String(cfg[k]), isAmount: false };
  }
  return null;
}

interface Props {
  rule: GovernanceRule;
  onUpdate: (
    id: string,
    config: Record<string, unknown>
  ) => Promise<void>;
}

export default function RuleCard({ rule, onUpdate }: Props) {
  const field = getEditableField(rule);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(field?.value || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!field) return;
    setSaving(true);
    try {
      const newConfig = {
        ...rule.config,
        [field.key]: Number(value),
      };
      await onUpdate(rule.id, newConfig);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditing(false);
    setValue(field?.value || "");
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="text-lg leading-none mt-0.5">
          {RULE_ICONS[rule.rule_type] || "\uD83D\uDCCB"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-800 text-sm truncate">
              {rule.name}
            </p>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${rule.is_active ? "bg-brand-500" : "bg-gray-300"}`}
              title={rule.is_active ? "Active" : "Inactive"}
            />
          </div>
          {rule.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
              {rule.description}
            </p>
          )}

          {field && (
            <div className="mt-2">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                      if (e.key === "Escape") handleCancel();
                    }}
                    className="w-24 bg-gray-50 border border-gray-300 rounded px-2 py-1 text-sm text-gray-800 focus:border-brand-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50"
                  >
                    {saving ? "..." : "Save"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-accent-600 hover:text-accent-700 transition-colors"
                >
                  Threshold: {field.isAmount ? "$" : ""}
                  {field.value}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
