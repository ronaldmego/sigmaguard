import Link from "next/link";

export const metadata = {
  title: "How It Works — SigmaGuard",
};

export default function HowItWorksPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "#FAFAF5",
        backgroundImage:
          "radial-gradient(circle at 1px 1px, #e5e5dc 1px, transparent 0)",
        backgroundSize: "28px 28px",
      }}
    >
      {/* ── TOP BAR ── */}
      <header className="flex items-center justify-between px-8 py-3 bg-white/70 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-20">
        {/* Left: back + brand */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xs text-gray-400 hover:text-[#0D9488] transition-colors flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Dashboard
          </Link>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0D9488] to-[#B45309] flex items-center justify-center text-white text-xs font-bold shadow-sm">
              S
            </div>
            <span className="text-sm font-semibold text-gray-700 tracking-tight">SigmaGuard</span>
          </div>
        </div>

        {/* Center: title */}
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#0D9488] via-[#0f766e] to-[#B45309] bg-clip-text text-transparent tracking-tight">
          How It Works
        </h1>

        {/* Right: testnet badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#0D9488]/8 border border-[#0D9488]/20 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] animate-pulse" />
            <span className="text-xs font-medium text-[#0D9488]">Testnet</span>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col justify-between px-8 py-5 gap-5 max-w-[1600px] mx-auto w-full">

        {/* Sub-headline */}
        <div className="text-center">
          <p className="text-[13px] text-gray-500 tracking-wide">
            A <span className="text-[#0D9488] font-semibold">four-layer governance pipeline</span> for autonomous DeFi
            &nbsp;·&nbsp; <span className="text-[#B45309] font-semibold">Six Sigma</span> statistical anomaly detection
            &nbsp;·&nbsp; Human-in-the-loop approval
          </p>
        </div>

        {/* ── PIPELINE ── */}
        <div className="flex flex-col gap-3">

          {/* Stage row */}
          <div className="flex items-stretch gap-0">

            {/* ── Stage 0: Autonomous Agent ── */}
            <div className="flex-1 min-w-0">
              <div className="h-full bg-gradient-to-br from-[#0D9488] to-[#0f766e] rounded-2xl p-5 text-white shadow-lg shadow-[#0D9488]/20 relative overflow-hidden">
                {/* bg decoration */}
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5" />
                <div className="absolute -right-2 -bottom-4 w-16 h-16 rounded-full bg-white/5" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="10" width="20" height="12" rx="2" />
                      <path d="M7 10V7a5 5 0 0 1 10 0v3" />
                      <circle cx="9" cy="16" r="1.5" fill="currentColor" stroke="none" />
                      <circle cx="15" cy="16" r="1.5" fill="currentColor" stroke="none" />
                      <path d="M9 20h6" />
                    </svg>
                    <span className="text-[10px] font-mono font-bold bg-white/15 rounded-md px-2 py-0.5 tracking-wider">AGENT</span>
                  </div>
                  <p className="text-sm font-bold leading-tight">Autonomous Agent</p>
                  <p className="text-xs opacity-75 mt-1.5 leading-relaxed">
                    3 active strategies:<br />
                    <span className="opacity-90">DCA · Rebalance · Yield</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {["DCA", "Rebalance", "Yield"].map(s => (
                      <span key={s} className="text-[10px] bg-white/15 rounded-md px-1.5 py-0.5 font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Arrow 0→1 */}
            <Arrow label="every tx" />

            {/* ── Stage 1: Hard Rules ── */}
            <div className="flex-1 min-w-0">
              <StageCard
                badge="01"
                badgeColor="#6B7280"
                borderColor="#D1D5DB"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                }
                title="Hard Rules"
                desc={["Max $50 / tx", "Daily cap $100 · Blacklist · Frequency"]}
                tag="Deterministic"
                tagColor="#6B7280"
              />
            </div>

            {/* Arrow 1→2 */}
            <Arrow />

            {/* ── Stage 2: Statistics (with branch) ── */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="flex-1">
                <StageCard
                  badge="02"
                  badgeColor="#0D9488"
                  borderColor="#0D9488"
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  }
                  title="Z-Score · IQR"
                  desc={["Six Sigma anomaly detection", "Bessel-corrected · Dynamic μ & σ"]}
                  tag="Statistical"
                  tagColor="#0D9488"
                />
              </div>
              {/* Auto-approve branch */}
              <div className="flex flex-col items-center">
                <div className="w-px h-2 bg-green-400" />
                <svg width="10" height="6" viewBox="0 0 10 6"><path d="M0 0 L5 5 L10 0" stroke="#4ADE80" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div className="w-full bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
                  <p className="text-[11px] font-semibold text-green-700">normal → auto-approve</p>
                  <p className="text-[10px] text-green-500 mt-0.5">WDK executes immediately</p>
                </div>
              </div>
            </div>

            {/* Arrow 2→3 (anomaly path) */}
            <Arrow label="anomaly" labelColor="#DC2626" arrowColor="#DC2626" />

            {/* ── Stage 3: Claude AI ── */}
            <div className="flex-1 min-w-0">
              <StageCard
                badge="03"
                badgeColor="#B45309"
                borderColor="#B45309"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 1 0 10 10" />
                    <path d="M12 6v6l4 2" />
                    <path d="M18 2l4 4-4 4" />
                    <path d="M22 2v4h-4" />
                  </svg>
                }
                title="Claude AI"
                desc={["Translates math to plain language", "Does NOT decide — only explains"]}
                tag="Interpreter"
                tagColor="#B45309"
                note="LLM explains · Statistics decide"
              />
            </div>

            {/* Arrow 3→4 */}
            <Arrow />

            {/* ── Stage 4: Human ── */}
            <div className="flex-1 min-w-0">
              <div className="h-full bg-white border-2 border-[#DC2626] rounded-2xl p-5 flex flex-col gap-3 shadow-sm shadow-[#DC2626]/10">
                <div className="flex items-center justify-between">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="text-xs font-mono font-bold text-[#DC2626]">04</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800">You Decide</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Approve or Reject<br />
                    Full audit trail logged
                  </p>
                  <span className="inline-block mt-2 text-[10px] bg-[#DC2626]/8 text-[#DC2626] border border-[#DC2626]/20 rounded-md px-1.5 py-0.5 font-medium">
                    Human-in-loop
                  </span>
                </div>
                {/* Visual approve/reject buttons */}
                <div className="flex gap-2">
                  <div className="flex-1 text-center text-[11px] py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 font-semibold cursor-default">
                    ✓ Approve
                  </div>
                  <div className="flex-1 text-center text-[11px] py-1.5 rounded-lg bg-red-50 text-[#DC2626] border border-red-200 font-semibold cursor-default">
                    ✗ Reject
                  </div>
                </div>
              </div>
            </div>

          </div>{/* end stage row */}

          {/* ── WDK Execution Layer ── */}
          <div className="flex items-center gap-4 bg-white/80 border border-gray-200 rounded-xl px-6 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#0D9488] to-[#B45309] flex items-center justify-center shadow-sm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700">WDK — Tether Wallet Development Kit</p>
                <p className="text-[10px] text-gray-400">Execution layer · Self-custodial · Multi-chain</p>
              </div>
            </div>
            <div className="w-px h-8 bg-gray-200 mx-2" />
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-[#0D9488]/8 text-[#0D9488] border border-[#0D9488]/20 rounded-full px-3 py-1 font-medium">
                DCA Transfer
              </span>
              <span className="text-xs bg-[#B45309]/8 text-[#B45309] border border-[#B45309]/20 rounded-full px-3 py-1 font-medium">
                Velora DEX Swap
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-3 py-1 font-medium">
                Aave V3 Lending
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-gray-400">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Ethereum Sepolia · Polygon Amoy
            </div>
          </div>

        </div>{/* end pipeline */}

        {/* ── BOTTOM ROW ── */}
        <div className="flex items-center justify-between gap-6">

          {/* Stats */}
          <div className="flex items-center gap-8">
            {[
              { value: "149", label: "tests passing" },
              { value: "4", label: "governance layers" },
              { value: "2σ", label: "anomaly threshold" },
              { value: "100%", label: "audit trail" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-gray-800 leading-none">{s.value}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div className="flex-1 max-w-xs text-center px-4 border-x border-gray-200">
            <p className="text-xs text-gray-500 italic leading-relaxed">
              &ldquo;The statistical model decides. The AI translates. The human approves.
              That&apos;s what makes it auditable.&rdquo;
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-end gap-2">
            <Link
              href="/?demo=true"
              className="group flex items-center gap-2 bg-[#0D9488] hover:bg-[#0f766e] text-white font-semibold text-sm px-7 py-3 rounded-xl transition-all duration-200 shadow-md shadow-[#0D9488]/30 hover:shadow-lg hover:shadow-[#0D9488]/40 hover:-translate-y-px"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Run Live Demo
            </Link>
            <p className="text-[11px] text-gray-400">
              Watch the agent operate in real time
            </p>
          </div>

        </div>

      </main>
    </div>
  );
}

/* ── Helper components ── */

function Arrow({
  label,
  labelColor = "#9CA3AF",
  arrowColor = "#D1D5DB",
}: {
  label?: string;
  labelColor?: string;
  arrowColor?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-start pt-10 px-1 flex-shrink-0 w-10">
      {label && (
        <span
          className="text-[9px] font-semibold whitespace-nowrap mb-0.5 tracking-wide"
          style={{ color: labelColor }}
        >
          {label}
        </span>
      )}
      <svg width="36" height="14" viewBox="0 0 36 14">
        <path
          d="M0 7 L30 7 M24 2 L34 7 L24 12"
          stroke={arrowColor}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function StageCard({
  badge,
  badgeColor,
  borderColor,
  icon,
  title,
  desc,
  tag,
  tagColor,
  note,
}: {
  badge: string;
  badgeColor: string;
  borderColor: string;
  icon: React.ReactNode;
  title: string;
  desc: [string, string];
  tag: string;
  tagColor: string;
  note?: string;
}) {
  return (
    <div
      className="h-full bg-white rounded-2xl p-5 flex flex-col gap-2 shadow-sm"
      style={{ border: `2px solid ${borderColor}20`, borderTopColor: borderColor, borderTopWidth: 3 }}
    >
      <div className="flex items-center justify-between">
        {icon}
        <span className="text-xs font-mono font-bold" style={{ color: badgeColor }}>
          {badge}
        </span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-800">{title}</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          {desc[0]}
          <br />
          {desc[1]}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <span
          className="inline-block text-[10px] rounded-md px-1.5 py-0.5 font-medium w-fit"
          style={{
            backgroundColor: `${tagColor}12`,
            color: tagColor,
            border: `1px solid ${tagColor}30`,
          }}
        >
          {tag}
        </span>
        {note && <p className="text-[9px] text-gray-400 italic">{note}</p>}
      </div>
    </div>
  );
}
