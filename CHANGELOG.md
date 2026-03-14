# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Migrate LLM from OpenAI GPT-5.2 to Anthropic Claude SDK ([#13](https://github.com/ronaldmego/pepa-wallet-intelligence/issues/13))
- Switch dashboard from dark to light theme — teal/gold/copper palette ([#12](https://github.com/ronaldmego/pepa-wallet-intelligence/issues/12))

## [0.1.0] — 2026-03-08

### Added
- Demo Mode with Stripe-style banner, Run Demo and Reset DB controls (zero-terminal judge workflow)
- Anomaly detection scatter chart (recharts) with normal zone band and agent performance summary
- Simulation script: 24h agent activity in ~5 min (12 ticks, market crash at tick 8)
- Autonomous DeFi agent with DCA and rebalance strategies ([#6](https://github.com/ronaldmego/pepa-wallet-intelligence/issues/6))
- Agent loop, market data fetcher (CoinGecko), 4 API endpoints, 3 dashboard components
- 2 new DB tables: `agent_strategies`, `agent_runs`
- Dashboard UI with 11 components, realtime subscriptions, approval flow ([#4](https://github.com/ronaldmego/pepa-wallet-intelligence/issues/4))
- Unit tests for governance pipeline — 111 tests ([#5](https://github.com/ronaldmego/pepa-wallet-intelligence/issues/5))
- Governance pipeline: fixed rules, Z-score/IQR anomaly detection, LLM interpreter, human approval
- RLS policies and permission hardening ([#2](https://github.com/ronaldmego/pepa-wallet-intelligence/issues/2))
- Supabase schema `pepa` with 6 tables
- WDK wallet integration (Ethereum Sepolia + Polygon Amoy)
- Seed data: 84 transactions, 5 governance rules, 2 strategies

### Fixed
- Dashboard Total Spent not updating in realtime during simulation ([#8](https://github.com/ronaldmego/pepa-wallet-intelligence/issues/8))
- Approve fails on simulated transactions — WDK tried real blockchain execution ([#9](https://github.com/ronaldmego/pepa-wallet-intelligence/issues/9))
- Agent status: no visual feedback when simulation is running ([#10](https://github.com/ronaldmego/pepa-wallet-intelligence/issues/10))
- Flaky Sepolia RPC replaced with reliable publicnode endpoint
- Governance rules adjusted to match normalized seed amounts

### Changed
- Seed amounts normalized (~$100 total) with variable DCA $2.40–$5.40 USDT
- LLM model upgraded from gpt-4o to gpt-5.2 (pre-Claude migration)
