# ROADMAP — PEPA Wallet Intelligence

## Timeline: Feb 27 → Mar 22, 2026 (23 days)

---

## Phase 1 — Foundation (Feb 27 – Mar 5) 🏗️

**Goal:** Working backend with WDK wallet + database schema + governance engine.

### Tasks:
- [ ] Initialize Next.js project with TypeScript
- [ ] Setup Supabase schema (transactions, governance_rules, approval_queue, agent_decisions)
- [ ] Integrate WDK — create wallet, check balance, send transaction (testnet)
- [ ] Build Layer 1: Fixed rules engine (JSON policies, evaluate against transaction)
- [ ] Build Layer 2: Anomaly detection module (Z-score, IQR over transaction history)
- [ ] Build Layer 3: LLM agent — takes rules + stats output, generates explanation
- [ ] Build transaction pipeline: request → rules → stats → agent → execute/queue
- [ ] Seed script: generate test wallet + 50-100 sample transactions with realistic patterns
- [ ] Basic API routes: POST /transaction, GET /transactions, GET /rules, POST /approve

### Definition of Done:
A transaction request goes through all 4 layers and either auto-executes or lands in approval queue, with full audit trail in Supabase.

---

## Phase 2 — Dashboard UI (Mar 6 – Mar 14) 🎨

**Goal:** Premium, realtime dashboard that makes judges say "this is a product, not a hackathon project."

### Tasks:
- [ ] Dashboard layout: dark theme, cards-based, violet/cyan palette
- [ ] Wallet Overview card: balance, chain, address (truncated)
- [ ] Transaction Feed: live stream via Supabase Realtime, with status badges
- [ ] Approval Queue: pending items with 1-click approve/reject + agent explanation
- [ ] Governance Rules panel: view active rules, edit thresholds
- [ ] Agent Decision Card: shows reasoning for each transaction (why approved/flagged/rejected)
- [ ] Analytics mini-view: spending by category, anomaly rate, approval rate
- [ ] Mobile responsive
- [ ] Animations: transaction appearing in feed, approval notifications

### Definition of Done:
Full flow visible in UI: trigger transaction → see it flow through layers → see agent explanation → approve/reject → see audit trail update in realtime.

---

## Phase 3 — Polish & Demo Prep (Mar 15 – Mar 19) ✨

**Goal:** Battle-tested, demo-ready, documented.

### Tasks:
- [ ] Simulation script: auto-generates realistic transaction patterns + injects anomalies
- [ ] Test all edge cases: cold start (new merchant), budget exhaustion, rapid-fire txs
- [ ] Error handling: graceful failures, clear error messages
- [ ] README.md: compelling project description + screenshots + quick start
- [ ] Setup guide for judges: step-by-step to run locally
- [ ] Multi-chain demo: at least 2 chains (Ethereum + Polygon testnet)
- [ ] Performance: UI loads fast, realtime updates are smooth
- [ ] Code cleanup: remove dead code, add comments where non-obvious

### Definition of Done:
A judge can clone the repo, run `npm install && npm run seed && npm run dev`, and see a working product in under 5 minutes.

---

## Phase 4 — Video & Submission (Mar 20 – Mar 22) 🎬

**Goal:** Compelling 5-minute video + DoraHacks submission.

### Tasks:
- [ ] Script the video: 30s problem → 1min solution → 2min live demo → 1min architecture → 30s why it matters
- [ ] Record demo: screen capture of full flow (transaction → governance → approval → audit)
- [ ] Record architecture walkthrough: show the 4 layers, explain why LLM doesn't decide numbers
- [ ] Edit video: clean cuts, captions, professional
- [ ] Upload to YouTube (unlisted)
- [ ] DoraHacks submission: description, repo link, video link, team info
- [ ] Final repo check: no secrets, LICENSE correct, README polished

### Definition of Done:
Submission on DoraHacks before Mar 22 23:59 UTC.

---

## Success Criteria (from hackathon judging)

| Criterion | How we score |
|-----------|-------------|
| **Agent Intelligence** | 4-layer architecture: rules + stats + LLM + human. Agent reasons, doesn't guess |
| **WDK Integration** | Real transactions on testnet via WDK MCP Toolkit. Multi-chain |
| **Technical Execution** | Clean code, tests, realtime UI, anomaly detection with real statistics |
| **Agentic Payment Design** | Governance flow: auto-approve normal → flag anomalies → human decides edge cases |
| **Originality** | Nobody else will present statistical anomaly detection + governance for agent wallets |
| **Polish** | Premium dark UI, realtime updates, mobile responsive, clear documentation |
| **Demo** | 5-min video: problem → solution → live demo → architecture |

---

*Last updated: Feb 27, 2026*
