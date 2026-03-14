"use client";

const STATUS_STYLES: Record<string, string> = {
  executed: "bg-brand-50 text-brand-700 border-brand-200",
  approved: "bg-brand-50 text-brand-700 border-brand-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-gray-100 text-gray-500 border-gray-200",
  auto_approve: "bg-brand-50 text-brand-700 border-brand-200",
  flag_for_review: "bg-amber-50 text-amber-700 border-amber-200",
  reject: "bg-red-50 text-red-700 border-red-200",
  rules: "bg-brand-50 text-brand-700 border-brand-200",
  anomaly: "bg-accent-50 text-accent-600 border-accent-200",
  agent: "bg-brand-50 text-brand-700 border-brand-200",
  manual: "bg-gray-100 text-gray-500 border-gray-200",
  // Agent statuses
  running: "bg-brand-50 text-brand-700 border-brand-200",
  hold: "bg-gray-100 text-gray-500 border-gray-200",
  transfer: "bg-accent-50 text-accent-600 border-accent-200",
  dca: "bg-brand-50 text-brand-700 border-brand-200",
  rebalance: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function StatusBadge({ status }: { status: string }) {
  const style =
    STATUS_STYLES[status] ??
    "bg-gray-100 text-gray-500 border-gray-200";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {label}
    </span>
  );
}
