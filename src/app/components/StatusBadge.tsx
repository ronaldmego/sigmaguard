"use client";

const STATUS_STYLES: Record<string, string> = {
  executed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  expired: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  auto_approve: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  flag_for_review: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  reject: "bg-red-500/15 text-red-400 border-red-500/30",
  rules: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  anomaly: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  agent: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  manual: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

export default function StatusBadge({ status }: { status: string }) {
  const style =
    STATUS_STYLES[status] ??
    "bg-gray-500/15 text-gray-400 border-gray-500/30";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {label}
    </span>
  );
}
