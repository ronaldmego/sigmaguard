# 🧠 PEPA Wallet Intelligence

**Autonomous DeFi agent with 4-layer governance — because AI agents that handle money need more than "hope for the best."**

> Track: 🌊 Autonomous DeFi Agent | 🏆 Hackathon Galáctica (Tether WDK)

---

## The Problem

AI agents are learning to spend money. But who watches the agent? Most "agent + wallet" solutions give the agent a wallet and cross their fingers. That's not governance — that's a liability.

## Our Solution

An autonomous DeFi agent that executes financial strategies (DCA, portfolio rebalancing) **under strict, auditable governance**:

| Layer | What it does | Technology |
|-------|-------------|------------|
| **1. Fixed Rules** | Hard limits: max amount, daily caps, allowed assets | JSON policies in Supabase |
| **2. Anomaly Detection** | Statistical outlier detection — flags unusual trades using math | Z-score + IQR |
| **3. AI Interpreter** | Explains decisions in plain language. Interprets, never decides. | GPT-5.2 |
| **4. Human-in-the-Loop** | Final say on flagged transactions. Approve/reject from dashboard. | Realtime UI |

**The key:** The LLM does NOT decide if a transaction is risky. The statistical model decides. The LLM translates: *"This trade is 2.3σ above your average. The model flags it as unusual. Approve?"*

## How It Works

```
Autonomous Agent Loop (every 30 min)
  → Fetches market data (prices, trends)
  → Evaluates strategy (DCA / rebalance)
  → Decides: buy, sell, or hold
  → If trade needed → enters 4-layer governance pipeline
  → Normal trade → auto-executes via WDK
  → Anomalous trade → escalates to human approval
  → Everything logged, everything auditable, everything in realtime
```

## Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL + Realtime) |
| Wallet | Tether WDK (self-custodial, multi-chain) |
| Anomaly Detection | Z-score, IQR |
| AI Agent | GPT-5.2 (interpreter, not decision-maker) |
| Chains | Ethereum + Polygon (testnet) |

## Quick Start

```bash
git clone https://github.com/ronaldmego/pepa-wallet-intelligence.git
cd pepa-wallet-intelligence
npm install
cp .env.example .env  # Fill in your keys
npm run db:setup
npm run seed
npm run dev
# Open http://localhost:3000
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Dashboard (Next.js)                 │
│  Wallet │ Agent Activity │ Tx Feed │ Approvals   │
└────────────────────┬────────────────────────────┘
                     │ Realtime (WebSocket)
┌────────────────────▼────────────────────────────┐
│              Autonomous Agent Loop               │
│  Market Data → Strategy → Decision → Governance  │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│           4-Layer Governance Pipeline            │
│  Rules → Anomaly Detection → LLM → Human        │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│              WDK (Tether)                        │
│  Self-custodial │ Multi-chain │ On-chain settle  │
└─────────────────────────────────────────────────┘
```

## Why This Approach

- **Math > Vibes.** Anomaly detection uses statistics, not LLM guessing.
- **Autonomous but governed.** The agent operates independently — until something looks wrong.
- **Every decision is auditable.** Full trail: what was requested, what each layer said, what happened.
- **Testnet by default.** All operations use testnet. Safety first.

## Team

Built by [Ronald Mego](https://ronaldmego.com) — Head of Data Analytics @ Millicom | Tigo. 15+ years in data, telecom, and AI.

## License

Apache 2.0
