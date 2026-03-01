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

## Phase 3 — Autonomous Agent 🎯 CURRENT (Mar 2 – Mar 10)

**Goal:** Transform from reactive evaluator to autonomous DeFi agent with governance. This is the differentiator — an agent that OPERATES autonomously but under strict governance controls.

### Architecture: Autonomous Agent Loop

```
Agent Loop (runs every 30 min)
  │
  ├── 1. Fetch market data (CoinGecko API, free)
  │     └── Prices, 24h change, volume for tracked assets
  │
  ├── 2. Agent (GPT-5.2) evaluates strategy
  │     └── Input: market data + portfolio state + strategy config
  │     └── Output: { action: "buy"|"sell"|"hold", asset, amount, reasoning }
  │
  ├── 3. If action != "hold" → Transaction enters Governance Pipeline
  │     ├── Layer 1: Fixed Rules (max amount, daily cap, allowed assets)
  │     ├── Layer 2: Anomaly Detection (is this trade unusual vs history?)
  │     ├── Layer 3: LLM Interpreter (explain decision in plain language)
  │     └── Layer 4: Auto-execute if normal / Escalate if flagged
  │
  └── 4. Dashboard shows everything in realtime
        └── Agent decisions, governance flow, portfolio state
```

### Tasks:
- [ ] Create `src/lib/agent/autonomous.ts` — agent loop with strategy evaluation
- [ ] Create `src/lib/agent/market.ts` — CoinGecko price fetcher
- [ ] Create `src/lib/agent/strategies.ts` — DCA + rebalance strategies
- [ ] Strategy config in Supabase: target allocations, DCA amount, frequency
- [ ] Agent loop triggers governance pipeline for each trade decision
- [ ] Dashboard: new "Agent Activity" panel showing autonomous decisions
- [ ] Dashboard: portfolio allocation chart (current vs target)
- [ ] Agent status indicator: running/paused/awaiting-approval
- [ ] Pause/resume agent from UI (human override)
- [ ] Multi-chain: agent can operate on Ethereum + Polygon via WDK

### DeFi Strategies to Implement:
1. **DCA (Dollar Cost Averaging):** Buy X amount of ETH every N hours with USDt. Simplest, most defensible strategy.
2. **Portfolio Rebalance:** Maintain target allocation (e.g., 60% USDt / 40% ETH). When drift > threshold → trade to rebalance.

### Definition of Done:
Agent runs autonomously, makes DCA purchases on schedule, each trade passes through 4-layer governance, anomalous trades get escalated to human approval queue, everything visible in realtime dashboard.

---

## Phase 4 — Polish & Demo Prep (Mar 11 – Mar 18)

### Tasks:
- [ ] Simulation script: fast-forward agent activity to show 24h of autonomous operation in 5 min
- [ ] Edge cases: market crash scenario (agent tries large sell → governance flags it)
- [ ] README with screenshots, architecture diagram, quick start for judges
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

*Last updated: Mar 1, 2026 — Strategy pivot: reactive → autonomous agent*
