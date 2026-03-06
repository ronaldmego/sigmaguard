# PEPA Wallet Intelligence

## Port

| Port | Bind | URL | Process |
|------|------|-----|---------|
| `4007` | `127.0.0.1` | `http://localhost:4007` | Next.js dev server |
<!-- Registered in ~/.claude/port-registry.md -->

---

## Project Context

Autonomous DeFi agent with 4-layer governance pipeline (fixed rules, statistical anomaly detection, LLM interpretation, human-in-the-loop). Built with Next.js 14 (App Router), Supabase (schema `pepa`, 6 tables), Tether WDK, and OpenAI GPT-5.2.

**Hackathon submission** for Galactica 2026 (DoraHacks). Judging criteria: technical correctness, agent autonomy, economic soundness, real-world applicability.

> For full architecture, diagrams, stack details, and project structure see **README.md**.

---

## Quick Start

```bash
npm install
cp .env.example .env   # Fill in Supabase + OpenAI + WDK keys
npm run db:setup
npm run seed            # 84 txs + 5 rules + 2 strategies
npm run dev             # http://localhost:4007
```

---

## Commands

```bash
# Development
npm run dev              # Next.js dev server
npm run build            # Production build
npm run start            # Production server

# Database
npm run db:setup         # Run schema migrations
npm run db:reset         # Reset and reseed

# Demo
npm run seed             # Seed sample data
npm run simulate         # 24h agent simulation in ~5 min (12 ticks, market crash at tick 8)

# Testing
npm test                 # All 111 tests
npm run test:governance  # Governance pipeline (64 tests)
npm run test:agent       # Autonomous agent (25 tests)
npm run test:math        # Statistical functions (22 tests)

# Linting
npm run lint             # ESLint
npm run type-check       # TypeScript check
```

---

## Development Philosophy

### Core Principles

1. **Simplicity first.** If a SQL function solves anomaly detection, don't build a microservice.
2. **Math > Vibes.** Anomaly detection uses Z-score/IQR, not LLM guessing. Numbers are a math problem.
3. **The LLM interprets, it doesn't decide.** Statistical model flags; LLM explains. Separation of concerns.
4. **Every decision is auditable.** No transaction without full context recorded.
5. **Testnet by default.** All development and demos use testnet. Mainnet is never assumed.

### Code Conventions

- TypeScript strict mode
- Functional components (React), named exports
- Descriptive variable names (no abbreviations)
- Comments explain WHY, not WHAT
- Error handling: fail loudly, log clearly

### UI Standards

- Dark theme, premium feel
- Colors: violet (#7c3aed), cyan (#06b6d4), copper (#ea580c)
- Cards-based layout, mobile-responsive (sidebar -> bottom tabs)
- Realtime updates via Supabase subscriptions
- Animations: subtle, purposeful

### Stack Patterns

- `max_completion_tokens` (not `max_tokens`) for GPT-5.2 compatibility
- `simulate.ts` is standalone (no `src/lib/` imports) — `@/` aliases don't resolve in tsx outside Next.js
- `tsc --noEmit` on scripts/ shows `import.meta` error — expected, tsx handles it at runtime
- All API routes use `service_role` (server-side); Realtime uses `anon` key (client-side)
- Agent is in-memory singleton (setInterval), state persisted in Supabase, starts paused
- Market data: CoinGecko free API, 60s cache, stale fallback

---

## Boris Dev Principles

> **Mandatory.** These questions apply to every project. Criteria, not checklist.

### Workflow

> **Do I need a plan?** More than 2 steps? -> Plan first in `tasks/todo.md`. Something went wrong? -> Stop. Re-plan.

> **Am I using my resources well?** Delegate to subagent? One task at a time? Is there a skill for this?

> **Am I learning from my mistakes?** User corrected me -> update `tasks/lessons.md`. Did I review lessons at session start?

> **Is this actually done?** Can I DEMONSTRATE it works? Tests, logs, screenshots. Happy path AND error path tested?

> **Best solution or first that worked?** Would I write it this way if 1000 people read it? Surgical or duct tape?

> **Can I resolve this without hand-holding?** Bug -> read logs, find root cause, fix. CI fails -> go fix it.

### Task Management

1. Plan in `tasks/todo.md` with checkable items
2. Verify plan before implementing
3. Track progress, mark items complete
4. High-level summary at each step
5. Document results, capture lessons in `tasks/lessons.md`

### Project-Specific

- Read this file first. Always.
- Check `ROADMAP.md` for current phase.
- One concern per commit.
- If requirements are ambiguous, stop and ask.

**Key decisions already made:**
- Supabase over SQLite (realtime subscriptions needed)
- Next.js over plain React (SSR + API routes in one)
- WDK MCP Toolkit for wallet ops (don't reinvent)
- Statistical model for anomaly detection (not LLM)
- 4-layer governance architecture (rules -> stats -> agent -> human)

---

## Security

- **NEVER** commit seed phrases, private keys, or API keys
- **NEVER** use mainnet for development or demos
- `.env` is gitignored — only `.env.example` is committed
- WDK wallets are self-custodial — keys stay local
- All wallet operations go through governance pipeline (no bypass)
- Audit trail is append-only (no deletion of transaction records)

---

## Opensource Readiness

Repo is **public** (hackathon submission). Before public-facing changes:
- No secrets in code, commits, or issues
- `.env.example` has only placeholders
- `CLAUDE.md` in `.gitignore` (never committed)
- LICENSE present (Apache 2.0)

> Full checklist: `~/.claude/opensource-readiness.md`

---

## Hackathon Mantras

> **Does this WIN the contest?** Not "does it work" — that's the minimum.

> **What would the judge say?** Technical correctness, agent autonomy, economic soundness, real-world applicability. Am I strong on all 4?

> **Is the agent truly autonomous?** Operates solo, makes decisions, only escalates to human when needed.

> **Does it make economic sense?** Real, defensible DeFi strategy. A CFO would approve the logic.

> **Can a judge run it in 5 minutes?** Clone -> install -> seed -> dev -> working dashboard.

> **Product or college assignment?** Premium UI, clean code, clear docs.

> **What differentiates us?** Autonomous agent + auditable 4-layer governance. Everything reinforces that.

---

## Skills

| Skill | When to use |
|-------|-------------|
| `supabase-selfhosted-expert` | Database schemas, tables, RLS policies, Supabase connections |
| `frontend-design` | UI components, dashboard layout, premium dark theme |
| `claude-developer-platform` | If using Anthropic API for the LLM agent layer |
| `github-actions` | CI/CD pipelines, automated testing, deployment |

---

## Resources

- **ROADMAP.md** — Development phases and milestones
- **WDK Docs:** https://docs.wdk.tether.io
- **WDK MCP Toolkit:** https://docs.wdk.tether.io/ai/mcp-toolkit
- **x402 Protocol:** https://docs.wdk.tether.io/ai/x402
- **Supabase Docs:** https://supabase.com/docs
- **Hackathon:** https://dorahacks.io/hackathon/hackathon-galactica-wdk-2026-01/detail
