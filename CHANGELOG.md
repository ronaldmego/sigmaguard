# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- **The AI can no longer end a transaction.** `determineFinalOutcome()` let the model's
  recommendation *reject* an operation that rules and statistics had approved — and a
  rejection is terminal, so nobody else ever sees it. The model may now move a transaction
  **towards** a human and never away from one: a `reject` recommendation is honoured as its
  severity, not its verdict, and becomes `flag_for_review`. Only deterministic rules can
  reject outright. This is what makes the project's own "AI explains, never decides" claim
  true rather than decorative ([#23](https://github.com/ronaldmego/sigmaguard/pull/23))
- Internal strategy notes were removed from the repository and purged from history; the
  path had been git-ignored since March but was already tracked, so the rule never applied
  ([#24](https://github.com/ronaldmego/sigmaguard/issues/24))

### Fixed
- **An agent swap sent native currency to an ERC-20 contract address.** The agent quoted on
  Velora and then passed the output token's contract as the transfer `recipient`; on
  auto-approval the pipeline executed a *native transfer* to it — funds stranded, with a
  governance report claiming the swap had executed. `executeSwap()` and `supply()` had been
  implemented for months and were never called. Transactions now dispatch by action, and a
  missing parameter **throws** rather than silently falling back to a transfer
  ([#23](https://github.com/ronaldmego/sigmaguard/pull/23))
- Transactions predating execution intents are refused rather than executed as transfers,
  since their `recipient` still carries the old semantics
- `npm run type-check` — three `SendTransactionResult` mocks were missing `fee` and `chain`

### Changed
- The execution intent is recorded in the audit trail, so a swap a human approves hours
  later still executes as a swap
- Package identity completed: `pepa-wallet-intelligence` → `sigmaguard`

### Documentation
- README carries an explicit **exhibition project, not a product** disclaimer: testnet,
  unaudited, unmaintained for production use
- `KNOWN_ISSUES.md` rewritten against measured reality — real `npm audit` counts with the
  direct/upstream split, the agent loop's in-memory state, and four limitations found by an
  adversarial review and deliberately frozen rather than tracked as open issues
- Published numbers reconciled with what the code actually does: test counts, Next.js
  version, component count, and the demo duration (derived from the simulation constants,
  which the banner had been contradicting five lines later)

### Added
- Simulated portfolio balances in Wallet Overview card during demo ([#21](https://github.com/ronaldmego/sigmaguard/issues/21)): ETH/MATIC/MATIC evolve per tick, USDT jumps +$35 at tick 10 when rebalance is approved — narrative matches the crash scenario
- New API endpoint `/api/agent/wallet-snapshot` — reads latest `agent_run.market_data.wallet_snapshot`
- Clear labels: "Portfolio" (simulated, live during demo) vs "Gas (testnet)" (real WDK on-chain)
- WDK Lending: Aave V3 integration for idle funds yield strategy — `quoteSupply` + `supply` + `getAccountData` via `@tetherto/wdk-protocol-lending-aave-evm` ([#18](https://github.com/ronaldmego/sigmaguard/issues/18))
- New "yield" strategy type: agent parks idle stablecoins in Aave V3 when balance exceeds threshold
- Supply decisions go through full 4-layer governance pipeline
- WDK Swap: Velora DEX integration for rebalance strategy — `quoteSwap` + `executeSwap` via `@tetherto/wdk-protocol-swap-velora-evm` ([#17](https://github.com/ronaldmego/sigmaguard/issues/17))
- Rebalance strategy now proposes DEX swaps (ETH/MATIC → USDT) instead of vault transfers, with real quote data
- Swap decisions go through full 4-layer governance pipeline (rules → anomaly → LLM → human)
- 24 new tests (135 total): swap wrapper, lending wrapper, yield strategy, token validation

### Changed
- Migrate LLM from OpenAI GPT-5.2 to Anthropic Claude SDK ([#13](https://github.com/ronaldmego/sigmaguard/issues/13))
- Switch dashboard from dark to light theme — teal/gold/copper palette ([#12](https://github.com/ronaldmego/sigmaguard/issues/12))

## [0.1.0] — 2026-03-08

### Added
- Demo Mode with Stripe-style banner, Run Demo and Reset DB controls (zero-terminal judge workflow)
- Anomaly detection scatter chart (recharts) with normal zone band and agent performance summary
- Simulation script: 24h agent activity in ~5 min (12 ticks, market crash at tick 8)
- Autonomous DeFi agent with DCA and rebalance strategies ([#6](https://github.com/ronaldmego/sigmaguard/issues/6))
- Agent loop, market data fetcher (CoinGecko), 4 API endpoints, 3 dashboard components
- 2 new DB tables: `agent_strategies`, `agent_runs`
- Dashboard UI with 11 components, realtime subscriptions, approval flow ([#4](https://github.com/ronaldmego/sigmaguard/issues/4))
- Unit tests for governance pipeline — 111 tests ([#5](https://github.com/ronaldmego/sigmaguard/issues/5))
- Governance pipeline: fixed rules, Z-score/IQR anomaly detection, LLM interpreter, human approval
- RLS policies and permission hardening ([#2](https://github.com/ronaldmego/sigmaguard/issues/2))
- Supabase schema `pepa` with 6 tables
- WDK wallet integration (Ethereum Sepolia + Polygon Amoy)
- Seed data: 84 transactions, 5 governance rules, 2 strategies

### Fixed
- Dashboard Total Spent not updating in realtime during simulation ([#8](https://github.com/ronaldmego/sigmaguard/issues/8))
- Approve fails on simulated transactions — WDK tried real blockchain execution ([#9](https://github.com/ronaldmego/sigmaguard/issues/9))
- Agent status: no visual feedback when simulation is running ([#10](https://github.com/ronaldmego/sigmaguard/issues/10))
- Flaky Sepolia RPC replaced with reliable publicnode endpoint
- Governance rules adjusted to match normalized seed amounts

### Changed
- Seed amounts normalized (~$100 total) with variable DCA $2.40–$5.40 USDT
- LLM model upgraded from gpt-4o to gpt-5.2 (pre-Claude migration)
