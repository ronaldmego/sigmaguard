import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });

// ============================================================
// Constants
// ============================================================

const VAULT_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const TICK_DELAY_MS = 15_000; // 15s between ticks → 12 ticks ≈ 3 min
const TOTAL_TICKS = 12;

// Base prices for simulation (realistic ETH/MATIC)
const BASE_ETH_PRICE = 2450;
const BASE_MATIC_PRICE = 0.85;

// Simulated portfolio balances per tick (what the agent manages)
// ETH grows via DCA, then drops at tick 10 when $35 rebalance is approved
// MATIC decreases slightly at tick 5 (small rebalance), stable otherwise
// USDT jumps at tick 10 (received from ETH→USDT swap)
const SIM_WALLET: { eth: number; matic: number; usdt: number }[] = [
  { eth: 0.0263, matic: 55.0, usdt: 6.20  },  // Tick 1:  DCA accumulating
  { eth: 0.0274, matic: 55.0, usdt: 9.00  },  // Tick 2:  ETH growing
  { eth: 0.0293, matic: 55.0, usdt: 5.50  },  // Tick 3:  minor dip
  { eth: 0.0307, matic: 55.0, usdt: 9.10  },  // Tick 4:  recovery
  { eth: 0.0304, matic: 55.0, usdt: 8.40  },  // Tick 5:  small rebalance (ETH sold $5.80)
  { eth: 0.0315, matic: 55.0, usdt: 8.40  },  // Tick 6:  DCA normal
  { eth: 0.0335, matic: 55.0, usdt: 8.40  },  // Tick 7:  DCA normal
  { eth: 0.0335, matic: 55.0, usdt: 5.50  },  // Tick 8:  CRASH — rebalance pending approval
  { eth: 0.0335, matic: 55.0, usdt: 5.50  },  // Tick 9:  awaiting approval
  { eth: 0.0166, matic: 55.0, usdt: 40.50 },  // Tick 10: APPROVED — ETH sold $35, USDT received
  { eth: 0.0179, matic: 55.0, usdt: 40.50 },  // Tick 11: DCA resumes
  { eth: 0.0190, matic: 55.0, usdt: 40.50 },  // Tick 12: recovering
];

// Price multipliers per tick (simulates 24h of market movement)
// Tick 8 is the crash
const PRICE_MULTIPLIERS: { eth: number; matic: number }[] = [
  { eth: 1.012, matic: 1.024 },  // Tick 1:  slight up
  { eth: 1.025, matic: 1.012 },  // Tick 2:  ETH climbing
  { eth: 0.988, matic: 0.976 },  // Tick 3:  minor dip
  { eth: 1.035, matic: 1.018 },  // Tick 4:  recovery
  { eth: 0.960, matic: 0.940 },  // Tick 5:  dip → rebalance trigger
  { eth: 0.972, matic: 0.958 },  // Tick 6:  still low
  { eth: 0.990, matic: 0.982 },  // Tick 7:  stabilizing
  { eth: 0.820, matic: 0.835 },  // Tick 8:  CRASH → large rebalance + anomaly
  { eth: 0.845, matic: 0.860 },  // Tick 9:  post-crash hold
  { eth: 0.910, matic: 0.920 },  // Tick 10: recovery begins
  { eth: 0.955, matic: 0.960 },  // Tick 11: recovering
  { eth: 0.985, matic: 0.988 },  // Tick 12: near-recovery
];

// DCA amounts per tick in USDT (variable for visual interest on chart)
const DCA_AMOUNTS = [3.20, 2.80, 4.50, 3.60, 5.10, 2.40, 4.80, 3.90, 0, 3.10, 5.40, 2.70];

// Simulation scenario per tick
interface TickScenario {
  dca: "transfer" | "hold";
  rebalance: "transfer" | "hold";
  rebalanceAmount: number; // USD value if transfer
  flagged: boolean;        // governance flags this tick
  driftPct: number;        // portfolio drift %
}

const SCENARIOS: TickScenario[] = [
  { dca: "transfer", rebalance: "hold",     rebalanceAmount: 0,    flagged: false, driftPct: 8.2  },
  { dca: "transfer", rebalance: "hold",     rebalanceAmount: 0,    flagged: false, driftPct: 10.1 },
  { dca: "transfer", rebalance: "hold",     rebalanceAmount: 0,    flagged: false, driftPct: 7.5  },
  { dca: "transfer", rebalance: "hold",     rebalanceAmount: 0,    flagged: false, driftPct: 12.3 },
  { dca: "transfer", rebalance: "transfer", rebalanceAmount: 5.80, flagged: false, driftPct: 16.8 },
  { dca: "transfer", rebalance: "hold",     rebalanceAmount: 0,    flagged: false, driftPct: 11.4 },
  { dca: "transfer", rebalance: "hold",     rebalanceAmount: 0,    flagged: false, driftPct: 9.7  },
  { dca: "transfer", rebalance: "transfer", rebalanceAmount: 35,   flagged: true,  driftPct: 28.5 },
  { dca: "hold",     rebalance: "hold",     rebalanceAmount: 0,    flagged: false, driftPct: 14.2 },
  { dca: "transfer", rebalance: "hold",     rebalanceAmount: 0,    flagged: false, driftPct: 11.8 },
  { dca: "transfer", rebalance: "hold",     rebalanceAmount: 0,    flagged: false, driftPct: 8.9  },
  { dca: "transfer", rebalance: "hold",     rebalanceAmount: 0,    flagged: false, driftPct: 6.3  },
];

// ============================================================
// Helpers
// ============================================================

function generateTxHash(): string {
  const hex = () => Math.random().toString(16).slice(2);
  return `0x${hex()}${hex()}${hex()}${hex()}`.slice(0, 66);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function simulatedTime(tick: number): string {
  const hours = tick * 2;
  return `${String(hours).padStart(2, "0")}:00`;
}

function buildMarketData(tick: number) {
  const m = PRICE_MULTIPLIERS[tick];
  const ethPrice = Math.round(BASE_ETH_PRICE * m.eth * 100) / 100;
  const maticPrice = Math.round(BASE_MATIC_PRICE * m.matic * 1000) / 1000;
  const wallet = SIM_WALLET[tick];
  return {
    prices: {
      ethereum: { usd: ethPrice, usd_24h_change: Math.round((m.eth - 1) * 100 * 100) / 100 },
      "matic-network": { usd: maticPrice, usd_24h_change: Math.round((m.matic - 1) * 100 * 100) / 100 },
    },
    wallet_snapshot: {
      eth: wallet.eth,
      matic: wallet.matic,
      usdt: wallet.usdt,
    },
    fetched_at: new Date().toISOString(),
  };
}

function buildRulesResult(passed: boolean) {
  return {
    passed,
    evaluations: [
      { rule_id: "sim-max-amount", rule_type: "max_amount", rule_name: "Maximum Transaction Amount", passed, reason: passed ? "Amount within limit" : "Amount exceeds $500 limit", details: {} },
      { rule_id: "sim-daily-cap", rule_type: "daily_cap", rule_name: "Daily Spending Cap", passed: true, reason: "Within daily cap", details: {} },
    ],
    failed_rules: passed ? [] : [
      { rule_id: "sim-max-amount", rule_type: "max_amount", rule_name: "Maximum Transaction Amount", passed: false, reason: "Amount exceeds $500 limit", details: {} },
    ],
  };
}

function buildAnomalyResult(isAnomaly: boolean, amount: number) {
  if (isAnomaly) {
    return {
      is_anomaly: true,
      z_score: 3.2,
      iqr_outlier: true,
      method: "z_score" as const,
      percentile: 99.4,
      historical_mean: 3.80,
      historical_std: 1.10,
      sample_size: 84,
      threshold: 2.0,
      reason: `Amount $${amount} is 3.2 standard deviations above the mean of $3.80 for agent_autonomous transactions`,
    };
  }
  const zScore = Math.round((Math.random() * 0.8 + 0.1) * 100) / 100;
  return {
    is_anomaly: false,
    z_score: zScore,
    iqr_outlier: false,
    method: "z_score" as const,
    percentile: Math.round((50 + zScore * 15) * 10) / 10,
    historical_mean: 4.85,
    historical_std: 2.10,
    sample_size: 84,
    threshold: 2.0,
    reason: "Transaction amount is within normal range",
  };
}

function buildGovernanceResult(isAnomaly: boolean, amount: number) {
  const rulesResult = buildRulesResult(true); // rules always pass (amounts under $500 except crash)
  const anomalyResult = buildAnomalyResult(isAnomaly, amount);
  const finalOutcome = isAnomaly ? "flag_for_review" : "auto_approve";

  return {
    rules_result: rulesResult,
    anomaly_result: anomalyResult,
    agent_interpretation: {
      explanation: isAnomaly
        ? `This $${amount} rebalance transaction is 3.2 standard deviations above your average of $3.80 for autonomous agent operations. The market crash triggered a large portfolio rebalance. I recommend human review before execution.`
        : `Routine DCA transfer of $${amount.toFixed(2)} USDT to vault. Amount is within normal operating range (z-score: ${anomalyResult.z_score}). Auto-approved.`,
      recommendation: finalOutcome,
      confidence: isAnomaly ? 0.92 : 0.98,
      model_used: "simulation",
      tokens_used: 0,
      latency_ms: 0,
      raw_prompt: "[simulated]",
      raw_response: "[simulated]",
    },
    final_outcome: finalOutcome,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// Main simulation
// ============================================================

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient<any, "pepa">(url, key, {
    db: { schema: "pepa" },
    auth: { persistSession: false },
  });

  // Look up strategy IDs (seeded by npm run seed)
  const { data: strategies, error: stratErr } = await supabase
    .from("agent_strategies")
    .select("id, strategy_type");

  if (stratErr || !strategies || strategies.length === 0) {
    console.error("No agent_strategies found. Run `npm run seed` first.");
    process.exit(1);
  }

  const dcaStrategy = strategies.find((s: { strategy_type: string }) => s.strategy_type === "dca");
  const rebalanceStrategy = strategies.find((s: { strategy_type: string }) => s.strategy_type === "rebalance");

  if (!dcaStrategy || !rebalanceStrategy) {
    console.error("Missing dca or rebalance strategy. Run `npm run seed` first.");
    process.exit(1);
  }

  // Resolve wallet address (same as seed.ts)
  const walletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18";

  // Counters
  let totalRuns = 0;
  let dcaTransfers = 0;
  let rebalanceTransfers = 0;
  let autoApproved = 0;
  let flagged = 0;

  const startTime = Date.now();

  console.log("");
  console.log("PEPA Agent Simulation — 24h in 5 minutes");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Wallet:     ${walletAddress}`);
  console.log(`  DCA ID:     ${dcaStrategy.id}`);
  console.log(`  Rebal ID:   ${rebalanceStrategy.id}`);
  console.log(`  Tick delay: ${TICK_DELAY_MS / 1000}s (total ~${Math.round(TOTAL_TICKS * TICK_DELAY_MS / 60000)}min)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Open the dashboard to see data flow in realtime:");
  console.log("  http://localhost:4007");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  for (let tick = 0; tick < TOTAL_TICKS; tick++) {
    const scenario = SCENARIOS[tick];
    const marketData = buildMarketData(tick);
    const ethPrice = marketData.prices.ethereum.usd;
    const maticPrice = marketData.prices["matic-network"].usd;
    const time = simulatedTime(tick + 1);

    console.log(`[Tick ${String(tick + 1).padStart(2, " ")}/${TOTAL_TICKS}]  ${time}  ETH $${ethPrice.toLocaleString()} | MATIC $${maticPrice}`);

    // --- DCA agent run ---
    const dcaAmount = DCA_AMOUNTS[tick];
    const dcaGovernance = buildGovernanceResult(false, dcaAmount);
    let dcaTxId: string | null = null;

    if (scenario.dca === "transfer") {
      // Insert transaction
      const { data: txData, error: txErr } = await supabase
        .from("transactions")
        .insert({
          wallet_address: walletAddress,
          recipient: VAULT_ADDRESS,
          amount: dcaAmount,
          currency: "USDT",
          chain: "ethereum-sepolia",
          category: "agent_autonomous",
          description: `DCA: Buy $${dcaAmount.toFixed(2)} USDT worth of ETH to vault`,
          status: "executed",
          tx_hash: generateTxHash(),
          governance_result: dcaGovernance,
        })
        .select("id")
        .single();

      if (txErr) {
        console.error(`  DCA tx insert failed: ${txErr.message}`);
      } else {
        dcaTxId = txData.id;
        dcaTransfers++;
        autoApproved++;

        // Insert agent_decision audit
        await supabase.from("agent_decisions").insert({
          transaction_id: dcaTxId,
          rules_result: dcaGovernance.rules_result,
          anomaly_result: dcaGovernance.anomaly_result,
          explanation: dcaGovernance.agent_interpretation.explanation,
          recommendation: "auto_approve",
          confidence: 0.98,
          model_used: "simulation",
        });
      }

      console.log(`  DCA:       TRANSFER $${dcaAmount.toFixed(2)} USDT → vault | auto_approve`);
    } else {
      console.log("  DCA:       HOLD (cooldown after market crash)");
    }

    // Insert DCA agent_run
    const { error: dcaRunErr } = await supabase.from("agent_runs").insert({
      strategy_id: dcaStrategy.id,
      strategy_type: "dca",
      market_data: marketData,
      decision: scenario.dca,
      decision_reason: scenario.dca === "transfer"
        ? `DCA interval elapsed. Buying $${dcaAmount.toFixed(2)} USDT worth of ETH at $${ethPrice}/ETH.`
        : "Market crash cooldown. Skipping DCA transfer to avoid buying into a falling market.",
      transaction_id: dcaTxId,
      governance_outcome: scenario.dca === "transfer" ? "auto_approve" : null,
    });
    if (dcaRunErr) console.error(`  DCA run insert failed: ${dcaRunErr.message}`);
    totalRuns++;

    // --- Rebalance agent run ---
    let rebalanceTxId: string | null = null;

    if (scenario.rebalance === "transfer") {
      const rebalanceAmount = scenario.rebalanceAmount;
      const isAnomaly = scenario.flagged;
      const rebalanceGovernance = buildGovernanceResult(isAnomaly, rebalanceAmount);
      const txStatus = isAnomaly ? "pending" : "executed";

      // Insert transaction
      const { data: txData, error: txErr } = await supabase
        .from("transactions")
        .insert({
          wallet_address: walletAddress,
          recipient: VAULT_ADDRESS,
          amount: rebalanceAmount,
          currency: "USDT",
          chain: "ethereum-sepolia",
          category: "agent_autonomous",
          description: isAnomaly
            ? `Rebalance: $${rebalanceAmount} emergency rebalance (market crash, drift ${scenario.driftPct}%)`
            : `Rebalance: $${rebalanceAmount} portfolio rebalance (drift ${scenario.driftPct}%)`,
          status: txStatus,
          tx_hash: isAnomaly ? null : generateTxHash(),
          governance_result: rebalanceGovernance,
        })
        .select("id")
        .single();

      if (txErr) {
        console.error(`  Rebalance tx insert failed: ${txErr.message}`);
      } else {
        rebalanceTxId = txData.id;
        rebalanceTransfers++;

        // Insert agent_decision audit
        await supabase.from("agent_decisions").insert({
          transaction_id: rebalanceTxId,
          rules_result: rebalanceGovernance.rules_result,
          anomaly_result: rebalanceGovernance.anomaly_result,
          explanation: rebalanceGovernance.agent_interpretation.explanation,
          recommendation: isAnomaly ? "flag_for_review" : "auto_approve",
          confidence: isAnomaly ? 0.92 : 0.97,
          model_used: "simulation",
        });

        if (isAnomaly) {
          // Insert into approval queue
          const { error: approvalErr } = await supabase.from("approval_queue").insert({
            transaction_id: rebalanceTxId,
            reason: `Statistical anomaly detected (z-score: 3.2). Amount $${rebalanceAmount} is 3.2σ above average.`,
            flag_source: "anomaly",
            agent_explanation: `This $${rebalanceAmount} rebalance is 3.2 standard deviations above your average of $3.80 for autonomous agent operations. The market crashed ~18%, triggering an emergency portfolio rebalance. The amount is significantly larger than typical agent transfers ($2-6 range). I recommend human review before execution to confirm this large rebalance aligns with your risk tolerance.`,
            anomaly_details: rebalanceGovernance.anomaly_result,
            status: "pending",
          });
          if (approvalErr) console.error(`  Approval insert failed: ${approvalErr.message}`);
          flagged++;
          console.log(`  Rebalance: TRANSFER $${rebalanceAmount} rebalance → vault | FLAG_FOR_REVIEW`);
          console.log("  ⚠️  Anomaly detected! Sent to approval queue.");
        } else {
          autoApproved++;
          console.log(`  Rebalance: TRANSFER $${rebalanceAmount} rebalance → vault | auto_approve`);
        }
      }
    } else {
      console.log(`  Rebalance: HOLD (drift ${scenario.driftPct}% < 15%)`);
    }

    // Insert rebalance agent_run
    const { error: rebalRunErr } = await supabase.from("agent_runs").insert({
      strategy_id: rebalanceStrategy.id,
      strategy_type: "rebalance",
      market_data: marketData,
      decision: scenario.rebalance,
      decision_reason: scenario.rebalance === "transfer"
        ? `Portfolio drift ${scenario.driftPct}% exceeds 15% threshold. Rebalancing $${scenario.rebalanceAmount} to restore 60/40 ETH/MATIC target.`
        : `Portfolio drift ${scenario.driftPct}% is within 15% threshold. No action needed.`,
      transaction_id: rebalanceTxId,
      governance_outcome: scenario.flagged ? "flag_for_review" : (scenario.rebalance === "transfer" ? "auto_approve" : null),
    });
    if (rebalRunErr) console.error(`  Rebalance run insert failed: ${rebalRunErr.message}`);
    totalRuns++;

    console.log("");

    // Wait between ticks (except after last tick)
    if (tick < TOTAL_TICKS - 1) {
      const remaining = TOTAL_TICKS - tick - 1;
      process.stdout.write(`  ⏳ Next tick in ${TICK_DELAY_MS / 1000}s (${remaining} remaining)...\r`);
      await sleep(TICK_DELAY_MS);
      process.stdout.write("                                                        \r");
    }
  }

  // Summary
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const totalTransfers = dcaTransfers + rebalanceTransfers;
  console.log("Simulation complete!");
  console.log(`  Agent runs:    ${totalRuns} (${TOTAL_TICKS} DCA + ${TOTAL_TICKS} Rebalance)`);
  console.log(`  Transfers:     ${totalTransfers} (${dcaTransfers} DCA + ${rebalanceTransfers} Rebalance)`);
  console.log(`  Auto-approved: ${autoApproved}`);
  console.log(`  Flagged:       ${flagged} (waiting in approval queue)`);
  console.log(`  Duration:      ${minutes}m ${String(seconds).padStart(2, "0")}s`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (flagged > 0) {
    console.log("👀 Check the Approval Queue in the dashboard to approve or reject");
    console.log("   the flagged market-crash rebalance transaction.\n");
  }
}

main().catch((err) => {
  console.error("Simulation failed:", err);
  process.exit(1);
});
