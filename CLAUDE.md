# PEPA Wallet Intelligence

## Table of Contents
- [Port](#port)
- [Vision & Philosophy](#vision--philosophy)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Development Philosophy](#development-philosophy)
- [Boris Dev Principles](#boris-dev-principles)
- [Security](#security)
- [Opensource Readiness](#opensource-readiness)
- [Skills](#skills)
- [Resources](#resources)

---

## Port

| Port | Bind | URL | Process |
|------|------|-----|---------|
| `4007` | `127.0.0.1` | `http://localhost:4007` | Next.js dev server |
<!-- Registered in ~/.claude/port-registry.md -->

---

## Vision & Philosophy

### What is this?

**In simple terms:** Imagine you have a robot assistant that can make payments for you. But you don't want it spending without control — so you set rules: "if it's less than $50, pay automatically; if it's more, ask me first; and over $500, don't even try." Plus, everything gets recorded in a ledger nobody can erase. That's PEPA Wallet Intelligence: an AI assistant with a digital wallet that operates under clear rules, approvals, and full audit of every cent.

### The Problem

AI agents are learning to think, but they still struggle to spend responsibly. When an AI needs to execute a financial transaction, who decides if it should? What are the limits? What happens when something looks wrong? Today, most "agent + wallet" solutions give the agent a wallet and hope for the best. That's not governance — that's a liability.

### Our Solution — 4-Layer Architecture

We don't just give an agent a wallet. We give it **rules, a statistical brain, an explainer, and a human supervisor**:

| Layer | What it does | Technology |
|-------|-------------|------------|
| **1. Fixed Rules** | Hard limits (max amount, merchant whitelist, daily caps) | JSON policies in database |
| **2. Statistical Model** | Anomaly detection on transactions — flags outliers using math, not guessing | Z-score / IQR over transaction history |
| **3. AI Agent (LLM)** | Interprets model output, explains decisions in plain language to the user | LLM with structured context |
| **4. Human-in-the-Loop** | Final decision on flagged transactions — approve/reject from the UI | Real-time dashboard |

**Key principle:** The LLM does NOT decide if a transaction is anomalous. The statistical model decides. The LLM translates: *"This $450 transaction is 2.3 standard deviations above your $85 average for this category. The model flags it as atypical. Do you want to approve?"*

### Why This Wins

- **Rigor:** Statistical anomaly detection, not vibes. Real math on real data.
- **Explainability:** Every decision has a clear, auditable reason.
- **Scalability:** Z-score works with 10 or 10M transactions.
- **Human control:** The human always has the final say on anything flagged.
- **Real AI:** The agent reasons about context, learns patterns, explains clearly.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                         │
│                                                              │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Wallet   │  │ Governance│  │  Tx Feed │  │ Approval  │  │
│  │ Overview │  │  Rules UI │  │ (live)   │  │  Queue    │  │
│  └──────────┘  └───────────┘  └──────────┘  └───────────┘  │
└──────────┬──────────────────────────────────────────────────┘
           │ WebSocket / SSE (realtime)
┌──────────▼──────────────────────────────────────────────────┐
│                   Backend (Next.js API Routes)               │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │  Governance   │  │  Anomaly      │  │   LLM Agent      │  │
│  │  Engine       │  │  Detector     │  │   (Interpreter)  │  │
│  │  (Rules)      │  │  (Stats)      │  │                  │  │
│  └──────────────┘  └───────────────┘  └──────────────────┘  │
│          │                  │                    │            │
│  ┌───────▼──────────────────▼────────────────────▼────────┐  │
│  │              WDK MCP Toolkit                           │  │
│  │  (wallet ops: balance, send, swap, bridge)             │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────┬──────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                      │
│                                                              │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐  │
│  │transactions│ │governance │  │ approval │  │  agent    │  │
│  │(audit log)│  │_rules     │  │ _queue   │  │ _decisions│  │
│  └──────────┘  └───────────┘  └──────────┘  └───────────┘  │
│  ┌──────────┐  ┌───────────┐                                │
│  │  agent   │  │  agent    │  Realtime subscriptions for    │
│  │_strategies│ │  _runs    │  live UI updates               │
│  └──────────┘  └───────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

### Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **Frontend** | Next.js 14+ (App Router) | React ecosystem, SSR, modern |
| **Backend** | Next.js API routes | Same runtime as WDK (TypeScript), no separate server |
| **Database** | Supabase (PostgreSQL) | Realtime subscriptions, audit trail, free tier |
| **Wallet** | Tether WDK + MCP Toolkit | 35 built-in tools, 13 chains, self-custodial |
| **Anomaly Detection** | SQL functions + lightweight Python/TS | Z-score, IQR, moving averages |
| **AI Agent** | LLM (OpenAI/Anthropic API) | Interprets stats, explains decisions |
| **Realtime** | Supabase Realtime (WebSocket) | Live transaction feed, approval notifications |

### Transaction Flow

```
User/Agent requests transaction
  │
  ▼
Layer 1: Fixed Rules Check
  ├── Amount > hard limit? → ❌ REJECT
  ├── Merchant blacklisted? → ❌ REJECT
  ├── Daily cap exceeded? → ❌ REJECT
  └── Pass → continue
  │
  ▼
Layer 2: Statistical Anomaly Detection
  ├── Calculate Z-score vs historical transactions
  ├── Check frequency patterns
  ├── New merchant? → FLAG (cold start)
  ├── Z > 2σ? → FLAG as outlier
  └── Normal → continue
  │
  ▼
Layer 3: AI Agent Interpretation
  ├── Summarize: rules result + stats result + context
  ├── Generate human-readable explanation
  └── Recommendation: approve / request human review
  │
  ▼
Layer 4: Execution
  ├── If auto-approved → Execute via WDK → Log to audit trail
  ├── If flagged → Push to approval queue → Notify user
  │     └── User approves → Execute via WDK → Log
  │     └── User rejects → Log rejection reason
  └── All outcomes recorded with full context
```

---

## Project Structure

```
pepa-wallet-intelligence/
├── CLAUDE.md              # This file — project guide
├── ROADMAP.md             # Development phases
├── README.md              # Public-facing description
├── LICENSE                # Apache 2.0
├── .env.example           # Template for environment variables
├── package.json
├── tsconfig.json
│
├── src/
│   ├── app/               # Next.js app router (frontend)
│   │   ├── page.tsx       # Dashboard home
│   │   ├── layout.tsx     # Root layout
│   │   └── components/    # React components (14 total)
│   │       ├── DashboardShell.tsx     # Layout with sidebar/tabs
│   │       ├── WalletOverview.tsx     # Balances display
│   │       ├── AnalyticsMini.tsx      # Summary stats
│   │       ├── TransactionFeed.tsx    # Live tx feed
│   │       ├── TransactionRow.tsx     # Single tx display
│   │       ├── ApprovalQueue.tsx      # Pending approvals
│   │       ├── ApprovalCard.tsx       # Single approval
│   │       ├── GovernanceRules.tsx    # Rules management
│   │       ├── RuleCard.tsx           # Single rule + inline edit
│   │       ├── AgentDecisionCard.tsx  # LLM decision display
│   │       ├── AgentPanel.tsx         # Start/stop autonomous agent
│   │       ├── AgentActivityFeed.tsx  # Agent run history
│   │       ├── PortfolioAllocation.tsx # Portfolio chart
│   │       └── StatusBadge.tsx        # Status indicators
│   │
│   ├── app/api/           # Next.js API routes (backend)
│   │   ├── transactions/  # CRUD + trigger governance flow
│   │   ├── rules/         # Governance rules management (+ [id])
│   │   ├── approvals/     # Approval queue (+ [id])
│   │   ├── wallet/        # WDK wallet balances
│   │   └── agent/         # Autonomous agent control
│   │       ├── start/     # Start agent loop
│   │       ├── stop/      # Stop agent loop
│   │       ├── status/    # Agent state + strategies
│   │       └── history/   # Agent run history
│   │
│   ├── lib/
│   │   ├── wdk/           # WDK integration layer
│   │   │   ├── index.ts   # WDK init + send
│   │   │   ├── wallet.ts  # Wallet balance
│   │   │   └── chains.ts  # Chain configuration
│   │   │
│   │   ├── governance/    # 4-layer governance engine
│   │   │   ├── rules.ts   # Layer 1: Fixed rules evaluator
│   │   │   ├── anomaly.ts # Layer 2: Statistical anomaly detector
│   │   │   ├── agent.ts   # Layer 3: LLM interpretation (GPT-5.2)
│   │   │   └── pipeline.ts # Full pipeline orchestrator
│   │   │
│   │   ├── agent/         # Autonomous DeFi agent
│   │   │   ├── autonomous.ts # Agent loop (singleton, setInterval)
│   │   │   ├── strategies.ts # DCA + rebalance evaluators
│   │   │   └── market.ts    # CoinGecko price fetcher (60s cache)
│   │   │
│   │   ├── db/            # Database layer
│   │   │   ├── supabase.ts # Client setup (service_role + anon)
│   │   │   └── queries.ts  # Common queries
│   │   │
│   │   └── utils/
│   │       └── math.ts    # Z-score, IQR, moving average
│   │
│   └── types/             # TypeScript type definitions
│       ├── index.ts       # Governance, transaction types
│       └── database.ts    # Supabase table types
│
├── migrations/            # SQL schema migrations
│   ├── 001_initial_schema.sql   # Core tables (4)
│   ├── 002_rls_policies.sql     # RLS + permissions
│   └── 003_agent_tables.sql     # Agent tables (2)
│
├── docs/
│   ├── testnet-setup.md          # Testnet wallet setup
│   └── internal/                 # Internal strategy docs
│
├── scripts/
│   ├── seed.ts            # Seed demo data (84 txs + 5 rules + 2 strategies)
│   ├── db-setup.ts        # Run migrations
│   └── db-reset.ts        # Reset and reseed
│
└── tests/
    ├── math.test.ts              # Z-score, IQR tests (22)
    ├── fixtures/
    │   └── governance.fixtures.ts
    ├── governance/               # Governance pipeline tests (64)
    │   ├── rules.test.ts
    │   ├── anomaly.test.ts
    │   ├── agent.test.ts
    │   └── pipeline.test.ts
    └── agent/                    # Autonomous agent tests (25)
        ├── strategies.test.ts
        └── market.test.ts
```

---

## Quick Start

```bash
# Clone
git clone https://github.com/ronaldmego/pepa-wallet-intelligence.git
cd pepa-wallet-intelligence

# Install dependencies
npm install

# Copy env template and fill in your values
cp .env.example .env

# Setup database (Supabase)
npm run db:setup

# Seed demo data (creates test wallet + sample transactions)
npm run seed

# Run development server
npm run dev

# Open http://localhost:4007
```

### Environment Variables (.env.example)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# WDK
WDK_SEED_PHRASE=        # ⚠️ TESTNET ONLY — never commit real seeds
WDK_NETWORK=testnet
WDK_CHAINS=ethereum,polygon

# LLM (for agent interpretation layer)
OPENAI_API_KEY=your_key  # or ANTHROPIC_API_KEY

# App
NEXT_PUBLIC_APP_URL=http://localhost:4007
```

---

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run start        # Start production server

# Database
npm run db:setup     # Run schema migrations
npm run db:reset     # Reset and reseed

# Demo
npm run seed         # Seed sample data
npm run simulate     # Run transaction simulation

# Testing
npm test             # Run all tests (111 tests)
npm run test:governance  # Test governance engine (64 tests)
npm run test:agent       # Test autonomous agent (25 tests)
npm run test:math        # Test statistical functions (22 tests)

# Linting
npm run lint         # ESLint
npm run type-check   # TypeScript check
```

---

## Development Philosophy

### Core Principles

1. **Simplicity first.** The simplest solution that works is the correct one. If a SQL function solves anomaly detection, don't build a microservice.

2. **Math > Vibes.** Anomaly detection uses statistics (Z-score, IQR, moving averages), not LLM guessing. Numbers are a math problem, not a language problem.

3. **The LLM interprets, it doesn't decide.** The statistical model flags anomalies. The LLM explains them in human language. Separation of concerns.

4. **Every decision is auditable.** No transaction happens without a record of: what was requested, which rules were evaluated, what the model said, what the agent recommended, and what the human decided.

5. **Testnet by default.** All development and demos use testnet. Mainnet is never assumed.

6. **Secrets never in code.** `.env` + `.gitignore`. Always. No exceptions.

### Code Conventions

- TypeScript strict mode
- Functional components (React)
- Named exports
- Descriptive variable names (no abbreviations)
- Comments explain WHY, not WHAT
- Error handling: fail loudly, log clearly

### UI Standards

- Dark theme, premium feel
- Colors: violet (#7c3aed), cyan (#06b6d4), copper accents (#ea580c)
- Cards-based layout
- All data updates in realtime (Supabase subscriptions)
- Mobile-responsive (judges may review on phone)
- Animations: subtle, purposeful (not distracting)

---

## Boris Dev Principles

> **Mandatory.** These questions apply to every project. They are criteria, not a checklist.

### Workflow

> **Do I need a plan?**
> More than 2 steps or architectural decisions? → Plan first, always. `tasks/todo.md`.
> Something went wrong? → Stop. Re-plan. Don't keep pushing.
> Am I assuming something I haven't verified?

> **Am I using my resources well?**
> Can I delegate to a subagent to keep context clean?
> Am I solving too many things at once? → One task per subagent.

> **Am I learning from my mistakes?**
> User corrected me → did I update `tasks/lessons.md`?
> Did I review lessons at session start?

> **Is this actually done?**
> Can I DEMONSTRATE it works? → Tests, logs, screenshots.
> Would a staff engineer approve this PR without comments?
> Did I test happy path AND error path?

> **Is this the best solution or the first that worked?**
> Would I write it this way if 1000 people would read it?
> Surgical fix or duct tape?
> For simple changes, don't over-engineer — simplicity is also elegance.

> **Can I resolve this without hand-holding?**
> Bug? → Read logs, find root cause, fix it. Don't ask how.
> CI fails? → Go fix it without waiting for instructions.

### Task Management

1. **Plan First:** `tasks/todo.md` with checkable items
2. **Verify Plan:** Check in before implementing
3. **Track Progress:** Mark items complete as you go
4. **Explain Changes:** High-level summary at each step
5. **Document Results:** Review section in todo.md
6. **Capture Lessons:** Update `tasks/lessons.md` after corrections

### Core Principles

> **Is there a simpler way?** If yes, why am I not using it?

> **Symptom or cause?** If I had to bet money this won't come back, would I?

> **How many files did I touch?** If more than necessary, what's extra?

### Project-Specific Adaptations

**For AI coding agents working on this repo:**
1. Read this file first. Always.
2. Check `ROADMAP.md` for current phase and priorities.
3. One concern per commit. Don't mix UI changes with backend logic.
4. If requirements are ambiguous, stop and ask rather than guess.

**Key decisions already made:**
- Supabase over SQLite (realtime subscriptions needed)
- Next.js over plain React (SSR + API routes in one)
- WDK MCP Toolkit for wallet ops (don't reinvent)
- Statistical model for anomaly detection (not LLM)
- 4-layer governance architecture (rules → stats → agent → human)

---

## Security

### Non-negotiable rules:
- **NEVER** commit seed phrases, private keys, or API keys
- **NEVER** use mainnet for development or demos
- `.env` is gitignored — only `.env.example` is committed
- WDK wallets are self-custodial — keys stay local
- All wallet operations go through governance pipeline (no bypass)
- Audit trail is append-only (no deletion of transaction records)

### For judges running this locally:
- The seed script generates a NEW testnet wallet — no real funds involved
- All demo transactions use testnet tokens
- No external services are required beyond Supabase (can use local or cloud)

---

## Opensource Readiness

This repo is **public** (hackathon submission for judges). Before any significant public-facing change, verify:
- No secrets in code, commits, or issues (check with `git log --all -p | grep -i "key\|secret\|password"`)
- `.env.example` has only placeholders, never real values
- LICENSE file present (Apache 2.0)
- README is clear for external readers (English)

> Full checklist: `~/.claude/opensource-readiness.md`

---

## Skills

| Skill | When to use |
|-------|-------------|
| `supabase-selfhosted-expert` | Database schemas, tables, RLS policies, Supabase connections |
| `frontend-design` | UI components, dashboard layout, premium dark theme design |
| `claude-developer-platform` | If using Anthropic API for the LLM agent interpretation layer |
| `github-actions` | CI/CD pipelines, automated testing, deployment workflows |

---


---

## Hackathon Mantras — Preguntas que te haces SIEMPRE

Antes de declarar algo listo, antes de un PR, antes de cada decisión de diseño:

> **¿Esto gana el concurso?** No "¿esto funciona?" — eso es el mínimo. ¿Esto GANA? ¿Un juez vería esto y diría "este es el mejor proyecto"?

> **¿Qué diría el juez?** Los criterios son: technical correctness, agent autonomy, economic soundness, real-world applicability. ¿Estoy fuerte en los 4? ¿Cuál es mi punto débil?

> **¿El agente es autónomo de verdad?** No reactivo, no manual, no script. ¿Opera solo? ¿Toma decisiones? ¿Solo escala a humano cuando es necesario? Si necesita que alguien lo dispare, no es autónomo.

> **¿Esto tiene sentido económico?** No es un demo vacío. ¿La estrategia DeFi es real y defendible? ¿Un CFO diría "esto tiene lógica financiera"?

> **¿Un juez puede correrlo en 5 minutos?** Clone → install → seed → dev → ver algo funcionando. Si tarda más, perdemos. Si falla, perdemos.

> **¿Esto se ve como producto o como tarea de universidad?** Premium UI, documentación clara, código limpio. McKinsey-level, no hackathon-level.

> **¿Qué nos diferencia del resto?** Si la respuesta es "nada especial", no ganamos. Nuestro diferenciador: agente autónomo + governance auditada de 4 capas. Si algo que estoy haciendo no refuerza eso, estoy perdiendo el foco.

Estas preguntas no son checklist — son criterio. La diferencia entre un proyecto que compite y uno que gana es que el ganador se cuestionó a sí mismo todo el tiempo.

## Resources

- **ROADMAP.md** — Development phases and milestones
- **WDK Docs:** https://docs.wdk.tether.io
- **WDK MCP Toolkit:** https://docs.wdk.tether.io/ai/mcp-toolkit
- **x402 Protocol:** https://docs.wdk.tether.io/ai/x402
- **Supabase Docs:** https://supabase.com/docs
- **Hackathon Page:** https://dorahacks.io/hackathon/hackathon-galactica-wdk-2026-01/detail
- **Tether GitHub:** https://github.com/tetherto
