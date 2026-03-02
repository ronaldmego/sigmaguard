# ROADMAP — PEPA Wallet Intelligence

## Track: 🌊 Autonomous DeFi Agent + 🤖 Agent Wallets
## Timeline: Feb 27 → Mar 22, 2026

---

## Phase 1 — Foundation ✅ COMPLETE (Feb 27 – Mar 1)

**Delivered:**
- 4-layer governance pipeline (Rules → Anomaly → Agent → Human)
- WDK wallet integrated + testnet funded (0.05 Sepolia ETH)
- Supabase schema with RLS + realtime
- GPT-5.2 as LLM interpreter
- On-chain execution verified
- ESLint + TypeScript strict

---

## Phase 2 — Dashboard UI ✅ COMPLETE (Mar 1)

**Delivered:**
- 11 premium components: DashboardShell, WalletOverview, AnalyticsMini, TransactionFeed, ApprovalQueue, GovernanceRules, etc.
- Supabase Realtime subscriptions (live tx feed + approval notifications)
- Dark theme, violet/cyan palette, mobile responsive
- Animations (slideIn, livePulse)
- Build + lint + type-check clean

---

## Phase 3 — Autonomous Agent ✅ COMPLETE (Mar 1)

**Delivered:**
- In-memory agent loop (singleton, setInterval) with start/stop/status lifecycle
- CoinGecko market data fetcher (ETH + MATIC prices, 60s cache, stale fallback)
- DCA strategy: time-based periodic transfers to vault (configurable interval, default 120s)
- Rebalance strategy: drift-based allocation correction (overweight detection, send-only)
- Every transfer goes through full 4-layer governance pipeline
- 2 new Supabase tables (`agent_strategies`, `agent_runs`) with RLS + realtime
- 4 API endpoints: start, stop, status, history
- 3 dashboard components: AgentPanel, AgentActivityFeed, PortfolioAllocation
- 25 new tests (111 total), clean build
- Seed includes 2 demo strategies (DCA active, Rebalance inactive)
- PR #7 merged, Issue #6 closed

---

## Phase 4 — Polish & Demo Prep 🎯 CURRENT (Mar 11 – Mar 18)

### Tasks:
- [x] Simulation script: fast-forward agent activity to show 24h of autonomous operation in 5 min
- [x] Edge cases: market crash scenario (agent tries large sell → governance flags it)
- [x] README with screenshots, architecture diagram, quick start for judges
- [ ] Setup guide: judge runs locally in < 5 minutes
- [ ] Code cleanup, comments, dead code removal
- [ ] Test: clone fresh, `npm install && npm run seed && npm run dev` works first try

### Definition of Done:
Judge clones repo, sees autonomous agent making governed trades in realtime within 5 minutes.

---

## Phase 5 — Submission (Mar 19 – Mar 22)

- [ ] Demo video (Ronald handles this)
- [ ] DoraHacks submission
- [ ] Final repo check: no secrets, LICENSE, README polished

---

## Why We Win

| vs Others | Us |
|-----------|-----|
| Agent with wallet, no controls | Agent with wallet + 4-layer governance |
| LLM decides finances | Statistical model detects anomalies, LLM explains |
| Manual trigger | Fully autonomous loop with human escalation |
| Single chain | Multi-chain (Ethereum + Polygon) |
| Demo only | Working product with realtime dashboard |

**Key insight:** Tether is a stablecoin company. They care about financial rigor. An agent that operates autonomously BUT with auditable governance is exactly what their brand represents — stability, trust, control.

---

*Last updated: Mar 1, 2026 — Phase 3 complete: autonomous DeFi agent with governance*
