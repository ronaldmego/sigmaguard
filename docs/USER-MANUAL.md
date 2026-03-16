# PEPA — User Manual

**Statistical DeFi Intelligence Agent**
Z-score anomaly detection · 4-layer governance · autonomous execution

---

## What is PEPA?

PEPA is an autonomous DeFi agent that manages cryptocurrency wallets with a 4-layer governance pipeline inspired by Six Sigma statistical quality control. Unlike other DeFi agents that rely on LLM "vibes" to detect suspicious activity, PEPA uses **Z-score and IQR statistical methods** to mathematically identify anomalous transactions — the same methodology used in industrial quality control and financial risk management.

**The 4 layers:**
1. **Fixed Rules** — Hard limits (max amount, daily cap, blacklisted categories)
2. **Statistical Anomaly Detection** — Z-score measures standard deviations from the mean; IQR identifies outliers via percentiles
3. **LLM Interpretation** — Claude explains WHY the statistics flagged a transaction (in human language)
4. **Human-in-the-Loop** — Flagged transactions go to an Approval Queue for manual approve/reject

---

## First-Time Setup

```bash
git clone https://github.com/ronaldmego/pepa-wallet-intelligence.git
cd pepa-wallet-intelligence
npm install
cp .env.example .env    # Fill in your keys (see .env.example for details)
npm run db:setup        # Create Supabase schema
npm run seed            # Load 84 sample transactions + 5 rules + 2 strategies
npm run dev             # Open http://localhost:4007
```

---

## Running the Demo (Zero Terminal — For Judges)

This is the fastest way to see PEPA in action. No terminal commands needed after initial setup.

### Step 1: Open the Dashboard
Navigate to the dashboard URL in your browser.

### Step 2: Enter Demo Mode
Click the **toggle switch** in the top-right corner to switch to **Demo Mode**.
An amber banner will appear at the top with controls.

### Step 3: Reset the Database
Click **"Reset DB"** in the banner. This seeds fresh data:
- 84 transactions (~$100 total, $2–$5 range)
- 5 governance rules
- 2 agent strategies (DCA + Rebalance)

### Step 4: Run the Demo
Click **"Run Demo"**. This launches a 12-tick simulation (~5 minutes) that compresses 24 hours of agent activity:

| Tick | Time | What happens |
|------|------|-------------|
| 1–4 | 00:00–06:00 | Normal DCA purchases ($2.40–$5.40 USDT) — all auto-approved |
| 5 | 08:00 | Small market dip → $9.50 rebalance — auto-approved |
| 6–7 | 10:00–12:00 | Normal DCA continues |
| **8** | **14:00** | **Market crash (ETH -18%)** → **$35 rebalance** → z-score 3.2 → **FLAGGED as anomaly** |
| 9–12 | 16:00–22:00 | Market recovers, normal DCA resumes |

### Step 5: Watch the Dashboard
As the demo runs, observe in real-time:
- **Agent Volume** card (right side) — total USD moved increases with each tick
- **Anomaly Detection chart** — scatter plot with normal zone band (μ ± 2σ), new points appear
- **Activity Feed** — agent decisions stream in
- **Metrics** — Avg Transaction, Transactions count, Anomaly Rate update live

### Step 6: Handle the Anomaly
At tick 8, the $35 rebalance triggers anomaly detection (z-score 3.2 > threshold 2.0). It appears in the **Approval Queue** section. You can:
- **Approve** — Execute the transaction via WDK
- **Reject** — Block the transaction

This is the human-in-the-loop layer in action.

---

## Dashboard Sections

### Header
- **Title:** "Statistical DeFi Intelligence Agent"
- **Testnet indicator:** Green dot confirming testnet-only operation
- **Demo/Production toggle**

### Top Row (2 cards)
| Card | What it shows |
|------|--------------|
| **Wallet Overview** | ETH (Sepolia) and MATIC (Amoy) wallet addresses and native balances |
| **Metrics Grid** (4 mini cards) | Avg Transaction · Transactions count · Anomaly Rate · Pending Approvals |

### Agent Section (3 cards)
| Card | What it shows |
|------|--------------|
| **Agent Panel** | Agent status (running/paused/idle), current strategy, start/stop controls |
| **Agent Volume** | Total USD moved by the agent + last 6 transactions with amounts. Anomalies marked with `!` in red |
| **Anomaly Detection Chart** | Scatter plot: each transaction as a dot. Cyan = auto-approved, Red = flagged. Gray band = normal zone (μ ± 2σ). Summary stats below |

### Activity Feed
Live stream of agent decisions — what the agent did, why, and the governance result.

### Approval Queue
Transactions flagged by the governance pipeline awaiting human decision. Only appears when there are pending items.

### Transaction Feed
Full history of all transactions with status, amount, category, and governance result.

### Governance Rules
The 5 active rules with inline editing:
- **Max Transaction:** $50
- **Daily Spending Cap:** $100
- **Gambling Limit:** $10
- **Frequency Limit:** 20 transactions/hour
- **Blacklist:** Blocked categories

---

## Demo Mode vs Production Mode

| | Demo Mode | Production Mode |
|---|---|---|
| **How to enter** | Click toggle → "Demo Mode" | Default (no URL param) |
| **Banner** | Amber bar with Run Demo + Reset DB | Small toggle top-right |
| **Agent** | Simulated (hardcoded prices, crash at tick 8) | Real (live CoinGecko prices, real WDK transactions) |
| **LLM** | Mocked (no API call needed) | Full 4-layer pipeline (requires Anthropic API key) |
| **Market data** | Hardcoded price progression | Live CoinGecko API |
| **Start Agent button** | Disabled (use "Run Demo") | Active |

---

## Key Concepts

### Z-score Anomaly Detection
Z-score = (value - mean) / standard_deviation

A transaction with z-score > 2.0 means it's more than 2 standard deviations from the average — statistically unusual. In Six Sigma methodology, this corresponds to the 95.4% confidence interval.

**Example from the demo:**
- Average transaction: $3.80
- Standard deviation: $1.10
- Crash rebalance: $35.00
- Z-score: (35 - 3.80) / 1.10 = **28.4** → clearly anomalous

### IQR (Interquartile Range)
Complementary method using percentiles (Q1, Q3) to identify outliers without assuming normal distribution. More robust against skewed data.

### Why Math > LLM for Detection
- **Deterministic:** Same data = same result, every time
- **Auditable:** "z-score = 3.2" is verifiable; "the AI thinks it's suspicious" is not
- **Fast:** No API call needed, instant calculation
- **Separation of concerns:** Statistics detect, LLM explains, human decides

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Dashboard shows "Loading..." forever | Check if dev server is running: `pm2 status pepa-dev` |
| Demo doesn't start | Click "Reset DB" first, then "Run Demo" |
| Approval Queue is empty | Run the demo — anomaly appears at tick 8 (~3 min in) |
| "Start Agent" is disabled | You're in Demo Mode. Switch to Production or use "Run Demo" |
| Wallet shows 0 balance | Expected on testnet without faucet funds. Doesn't affect demo |
| Server died | `pm2 restart pepa-dev` or `pm2 start "npx next dev -p 4007 -H 100.64.216.28" --name pepa-dev` |
