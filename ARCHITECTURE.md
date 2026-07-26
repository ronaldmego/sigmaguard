# Architecture — SigmaGuard

## Overview

SigmaGuard is a Next.js 15 application with an autonomous DeFi agent governed by a 4-layer pipeline. All wallet operations go through governance before execution.

```
User / Agent
     │
     ▼
┌─────────────────────────────────────────────────┐
│              Next.js 15 App Router               │
│  ┌──────────────┐  ┌────────────────────────┐   │
│  │  Dashboard   │  │      API Routes         │   │
│  │  (React UI)  │  │  /api/transactions      │   │
│  │              │  │  /api/approvals         │   │
│  │  Realtime    │  │  /api/rules             │   │
│  │  via         │  │  /api/agent/*           │   │
│  │  Supabase    │  │  /api/wallet            │   │
│  └──────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│           4-Layer Governance Pipeline            │
│                                                  │
│  Layer 1: Hard Rules (deterministic)             │
│    → max $50/tx, daily cap $100, blacklist       │
│                                                  │
│  Layer 2: Statistical Anomaly Detection          │
│    → Z-score (Bessel-corrected), IQR             │
│    → normal → auto-approve                       │
│    → anomaly (|z| > 2) → escalate               │
│                                                  │
│  Layer 3: Claude AI Interpretation               │
│    → Translates math to plain language           │
│    → Does NOT decide — only explains             │
│                                                  │
│  Layer 4: Human-in-the-loop                      │
│    → Approve / Reject in dashboard               │
│    → Full audit trail logged                     │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│           Tether WDK Execution Layer             │
│   DCA Transfer · Velora DEX Swap · Aave Lending  │
│   Ethereum Sepolia · Polygon Amoy (testnet)      │
└─────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────┐
│              Supabase (schema: pepa)             │
│  transactions · governance_rules · agent_runs   │
│  approval_queue · agent_decisions · strategies  │
└─────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── app/
│   ├── api/              # API routes (server-side, service_role)
│   │   ├── agent/        # Agent control + wallet snapshot
│   │   ├── approvals/    # Approval queue CRUD
│   │   ├── rules/        # Governance rules CRUD
│   │   ├── transactions/ # Transaction history
│   │   └── wallet/       # WDK wallet balances
│   ├── components/       # React UI components
│   └── how-it-works/     # Pipeline explainer page
├── lib/
│   ├── governance/       # 4-layer pipeline + agent singleton
│   ├── supabase/         # DB client (service_role + anon)
│   └── wdk/              # WDK modules (wallet, swap, lending, chains)
├── types/                # Shared TypeScript types
scripts/
├── seed.ts               # 84 transactions + 5 rules + 2 strategies
└── simulate.ts           # 24h agent simulation (~3 min, 12 ticks)
tests/
├── governance/           # 78 tests — 4-layer pipeline
├── agent/                # 49 tests — autonomous agent
└── math/                 # 22 tests — statistical functions
```

## Key Design Decisions

| Decision | Why |
|----------|-----|
| Supabase over SQLite | Realtime subscriptions needed for live dashboard updates |
| Next.js over plain React | SSR + API routes in one deployment |
| Statistical model for anomaly detection | Math is deterministic and auditable; LLM is not |
| LLM as interpreter, not decision-maker | Separates concerns — statistics decide, AI explains |
| WDK for wallet ops | Self-custodial, multi-chain, production-grade Tether SDK |
| Testnet by default | Never assume real funds in development or demo |

## Data Flow: Normal Transaction

```
Agent strategy fires
  → POST /api/transactions
  → Layer 1: check hard rules (pass/fail)
  → Layer 2: Z-score computed vs historical μ, σ
    → |z| ≤ 2: auto-approve → WDK executes → logged
    → |z| > 2: escalate to Layer 3
  → Layer 3: Claude AI generates plain-language explanation
  → Layer 4: entry added to approval_queue → human decides
```

## Realtime Architecture

- **Channels:** `transactions-feed`, `approvals-feed`, `agent-runs-feed`
- **Client:** anon key (browser)
- **Server:** service_role key (API routes)
- Agent is an in-memory singleton (`setInterval`), state persisted in Supabase so it survives API restarts
