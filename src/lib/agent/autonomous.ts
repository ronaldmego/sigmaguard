import type { AgentStatus, AgentStatusInfo, FinalOutcome } from "@/types";
import { fetchMarketData } from "./market";
import { evaluateStrategy } from "./strategies";
import { getWalletBalance } from "@/lib/wdk";
import { CHAINS } from "@/lib/wdk/chains";
import { processTransaction } from "@/lib/governance/pipeline";
import { getWalletAddress } from "@/lib/wdk";
import {
  getActiveStrategies,
  getAllStrategies,
  insertAgentRun,
  updateStrategyLastExecution,
  getAgentRunStats,
  hasRecentAgentActivity,
} from "@/lib/db/queries";

// ============================================================
// Singleton state
// ============================================================

let agentStatus: AgentStatus = "paused";
let intervalId: ReturnType<typeof setInterval> | null = null;
let intervalSeconds = 120;
let lastRunAt: string | null = null;
let cycleRunning = false;

// ============================================================
// Public API
// ============================================================

export function startAgent(interval?: number): { status: AgentStatus; interval_seconds: number } {
  if (agentStatus === "running") {
    return { status: agentStatus, interval_seconds: intervalSeconds };
  }

  if (interval && interval >= 30 && interval <= 3600) {
    intervalSeconds = interval;
  }

  agentStatus = "running";

  // Run first cycle immediately
  runAgentCycle().catch((err) => {
    console.error("[PEPA Agent] First cycle error:", err);
  });

  // Then set interval
  intervalId = setInterval(() => {
    runAgentCycle().catch((err) => {
      console.error("[PEPA Agent] Cycle error:", err);
    });
  }, intervalSeconds * 1000);

  console.log(`[PEPA Agent] Started with ${intervalSeconds}s interval`);
  return { status: agentStatus, interval_seconds: intervalSeconds };
}

export function stopAgent(): { status: AgentStatus } {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  agentStatus = "paused";
  console.log("[PEPA Agent] Stopped");
  return { status: agentStatus };
}

export async function getAgentStatus(): Promise<AgentStatusInfo> {
  const [strategies, runStats, recentActivity] = await Promise.all([
    getAllStrategies(),
    getAgentRunStats(),
    hasRecentAgentActivity(2),
  ]);

  const activeCount = strategies.filter((s) => s.is_active).length;

  let nextRunAt: string | null = null;
  if (agentStatus === "running" && lastRunAt) {
    const next = new Date(new Date(lastRunAt).getTime() + intervalSeconds * 1000);
    nextRunAt = next.toISOString();
  }

  return {
    status: agentStatus,
    last_run: lastRunAt,
    next_run_at: nextRunAt,
    interval_seconds: intervalSeconds,
    strategies: { total: strategies.length, active: activeCount },
    runs: runStats,
    has_recent_activity: recentActivity,
  };
}

// ============================================================
// Core agent cycle
// ============================================================

async function runAgentCycle(): Promise<void> {
  // Prevent overlapping cycles
  if (cycleRunning) {
    console.log("[PEPA Agent] Cycle already running, skipping");
    return;
  }

  cycleRunning = true;
  const cycleStart = Date.now();

  try {
    console.log("[PEPA Agent] Starting cycle...");

    // 1. Fetch market data
    const marketData = await fetchMarketData();
    console.log(
      `[PEPA Agent] Market data: ETH=$${marketData.prices["ethereum-sepolia"]?.usd ?? "N/A"}, MATIC=$${marketData.prices["polygon-amoy"]?.usd ?? "N/A"}`
    );

    // 2. Get wallet balances for all chains
    const balancePromises = Object.keys(CHAINS).map(async (chain) => {
      try {
        return await getWalletBalance(chain);
      } catch (err) {
        console.warn(`[PEPA Agent] Failed to get balance for ${chain}:`, err);
        return { chain, address: "", nativeBalance: "0", nativeSymbol: "" };
      }
    });
    const walletBalances = await Promise.all(balancePromises);

    // 3. Get active strategies
    const strategies = await getActiveStrategies();
    if (strategies.length === 0) {
      console.log("[PEPA Agent] No active strategies, cycle complete");
      lastRunAt = new Date().toISOString();
      return;
    }

    console.log(`[PEPA Agent] Evaluating ${strategies.length} active strategies`);

    // 4. Evaluate each strategy
    for (const strategy of strategies) {
      try {
        const result = evaluateStrategy(strategy, marketData, walletBalances);

        let transactionId: string | null = null;
        let governanceOutcome: FinalOutcome | null = null;

        if (result.decision === "transfer" && result.transfer) {
          // 5. Submit through governance pipeline
          console.log(
            `[PEPA Agent] Strategy "${strategy.name}": TRANSFER ${result.transfer.amount} ${result.transfer.currency} on ${result.transfer.chain}`
          );

          try {
            const walletAddress = await getWalletAddress(result.transfer.chain);
            const { transaction, result: govResult } = await processTransaction(
              walletAddress,
              {
                recipient: result.transfer.vault_address,
                amount: result.transfer.amount,
                currency: result.transfer.currency,
                chain: result.transfer.chain,
                category: "agent_autonomous",
                merchant: `pepa_agent_${strategy.strategy_type}`,
                description: result.reason,
              }
            );

            transactionId = transaction.id;
            governanceOutcome = govResult.final_outcome;

            console.log(
              `[PEPA Agent] Governance outcome: ${governanceOutcome} (tx: ${transactionId})`
            );

            // Update last_execution_at on successful transfer submission
            await updateStrategyLastExecution(strategy.id);
          } catch (err) {
            console.error(
              `[PEPA Agent] Governance pipeline error for strategy "${strategy.name}":`,
              err
            );
          }
        } else {
          console.log(
            `[PEPA Agent] Strategy "${strategy.name}": HOLD — ${result.reason}`
          );
        }

        // 6. Record agent run
        await insertAgentRun({
          strategy_id: strategy.id,
          strategy_type: strategy.strategy_type,
          market_data: marketData,
          decision: result.decision,
          decision_reason: result.reason,
          transaction_id: transactionId,
          governance_outcome: governanceOutcome,
        });
      } catch (err) {
        console.error(
          `[PEPA Agent] Error evaluating strategy "${strategy.name}":`,
          err
        );
      }
    }

    lastRunAt = new Date().toISOString();
    const elapsed = Date.now() - cycleStart;
    console.log(`[PEPA Agent] Cycle complete in ${elapsed}ms`);
  } catch (err) {
    console.error("[PEPA Agent] Cycle failed:", err);
    agentStatus = "error";
  } finally {
    cycleRunning = false;
  }
}
