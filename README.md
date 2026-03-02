# PEPA Wallet Intelligence

**Autonomous DeFi agent with 4-layer governance — because AI agents that handle money need more than "hope for the best."**

> Hackathon Galactica 2026 | Track: Autonomous DeFi Agent + Agent Wallets | Built with [Tether WDK](https://docs.wdk.tether.io)

![Dashboard](docs/dashboard-overview.png)

---

## The Problem

AI agents are learning to spend money. But who watches the agent?

Most "agent + wallet" solutions give the agent a wallet and cross their fingers. There are no spending limits, no anomaly detection, no audit trail. That's not governance — that's a liability.

## Our Solution

PEPA is an autonomous DeFi agent that executes financial strategies (DCA, portfolio rebalancing) through a **4-layer governance pipeline** before any funds move:

| Layer | Role | How |
|-------|------|-----|
| **1. Fixed Rules** | Hard limits (max amount, daily caps, asset whitelist) | JSON policies in database |
| **2. Anomaly Detection** | Flags statistical outliers — math, not guessing | Z-score + IQR over transaction history |
| **3. AI Interpreter** | Explains decisions in plain language | GPT-5.2 (interprets, never decides) |
| **4. Human-in-the-Loop** | Final say on anything flagged | Realtime approval dashboard |

**The key insight:** The LLM does NOT decide if a transaction is risky. The statistical model decides. The LLM translates:

> *"This $450 rebalance is 3.2 standard deviations above your average of $4.85 for agent operations. The market crashed 18%, triggering an emergency portfolio rebalance. Do you want to approve?"*

## Quick Start (< 5 minutes)

```bash
git clone https://github.com/ronaldmego/pepa-wallet-intelligence.git
cd pepa-wallet-intelligence
npm install
cp .env.example .env   # Fill in Supabase + OpenAI + WDK keys
npm run db:setup        # Create schema + tables
npm run seed            # 84 transactions + 5 rules + 2 strategies
npm run dev             # Dashboard at http://localhost:4007
```

### See it in action

```bash
# In a second terminal — simulates 24h of autonomous agent activity in ~5 minutes
npm run simulate
```

Open the dashboard and watch:
- DCA transfers appearing in the transaction feed in realtime
- Agent activity showing hold/transfer decisions with market context
- A **market crash at tick 8** triggers a $450 emergency rebalance
- Governance flags it (z-score: 3.2) and sends it to the approval queue
- You approve or reject it from the dashboard

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Dashboard (Next.js)                 │
│  Wallet │ Agent Activity │ Tx Feed │ Approvals   │
└────────────────────┬────────────────────────────┘
                     │ Realtime (Supabase WebSocket)
┌────────────────────▼────────────────────────────┐
│              Autonomous Agent Loop               │
│  Market Data → Strategy → Decision → Governance  │
│                                                  │
│  Strategies:                                     │
│  • DCA — periodic buys at fixed intervals        │
│  • Rebalance — drift-based allocation correction │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│           4-Layer Governance Pipeline            │
│                                                  │
│  1. Rules Engine    → hard limits, caps          │
│  2. Anomaly Detector → z-score, IQR             │
│  3. LLM Interpreter → human-readable explain    │
│  4. Human Review    → approve/reject flagged     │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│              Tether WDK                          │
│  Self-custodial │ Multi-chain │ On-chain settle  │
│  Ethereum Sepolia + Polygon Amoy (testnet)       │
└─────────────────────────────────────────────────┘
```

## How the Agent Works

```
Every 120 seconds, the agent:
  1. Fetches live market data (ETH, MATIC prices via CoinGecko)
  2. Evaluates active strategies:
     • DCA: Is it time to buy? → Transfer fixed amount to vault
     • Rebalance: Has portfolio drifted >15%? → Correct allocation
  3. If action needed → enters 4-layer governance pipeline
     • Normal trade → auto-approved, executed via WDK, logged
     • Anomalous trade → flagged, queued for human approval
  4. All decisions recorded with full audit trail
```

The agent is **truly autonomous** — it starts, evaluates, decides, and executes without human intervention. Humans only get involved when governance flags something unusual.

## Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Frontend | Next.js 14 (App Router) | SSR + API routes in one runtime |
| Database | Supabase (PostgreSQL) | Realtime subscriptions + audit trail |
| Wallet | Tether WDK (MCP Toolkit) | Self-custodial, 13 chains, 35 tools |
| Anomaly Detection | Z-score + IQR | Proven statistics, not LLM guessing |
| AI Agent | GPT-5.2 | Interprets and explains, never decides |
| Chains | Ethereum Sepolia + Polygon Amoy | Testnet by default, always |

## What Makes This Different

| Typical Agent Wallet | PEPA |
|---------------------|------|
| Agent has wallet, no controls | Agent has wallet + 4-layer governance |
| LLM decides finances | Statistical model detects anomalies, LLM explains |
| Manual trigger required | Fully autonomous loop with human escalation |
| No audit trail | Every decision logged with full context |
| Single chain | Multi-chain (Ethereum + Polygon) |
| Demo only | Working product with realtime dashboard |

**Why this wins for Tether:** Tether is a stablecoin company. They care about financial rigor. An agent that operates autonomously with auditable governance is exactly what their brand represents — stability, trust, control.

## Project Structure

```
src/
├── app/                    # Next.js pages + 14 React components
│   ├── components/         # Dashboard, Agent Panel, Approval Queue...
│   └── api/                # REST endpoints (transactions, rules, agent)
├── lib/
│   ├── governance/         # 4-layer pipeline (rules, anomaly, agent, pipeline)
│   ├── agent/              # Autonomous loop (strategies, market data)
│   ├── wdk/                # Tether WDK integration
│   └── db/                 # Supabase client + queries
├── types/                  # TypeScript definitions
scripts/
├── seed.ts                 # Demo data (84 txs + 5 rules + 2 strategies)
├── simulate.ts             # 24h agent simulation in 5 minutes
tests/                      # 111 tests (governance, agent, math)
migrations/                 # SQL schema (6 tables + RLS)
```

## Testing

```bash
npm test                    # All 111 tests
npm run test:governance     # Governance pipeline (64 tests)
npm run test:agent          # Autonomous agent (25 tests)
npm run test:math           # Statistical functions (22 tests)
```

## Environment Variables

```bash
# Supabase (PostgreSQL + Realtime)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Tether WDK
WDK_SEED_PHRASE=            # Testnet only — never commit real seeds

# OpenAI (LLM interpreter layer)
OPENAI_API_KEY=sk-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:4007
```

## Team

Built by [Ronald Mego](https://ronaldmego.com) — Head of Data Analytics @ Millicom | Tigo. 15+ years in data, telecom, and AI.

## License

Apache 2.0
