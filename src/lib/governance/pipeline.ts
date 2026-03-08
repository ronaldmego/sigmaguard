import type {
  TransactionInput,
  GovernancePipelineResult,
  FinalOutcome,
  Transaction,
} from "@/types";
import {
  insertTransaction,
  updateTransactionStatus,
  insertApprovalItem,
  insertAgentDecision,
} from "@/lib/db/queries";
import { evaluateRules } from "./rules";
import { detectAnomaly } from "./anomaly";
import { interpretTransaction } from "./agent";
import { sendTransaction as wdkSend } from "@/lib/wdk";

/**
 * processTransaction — the heart of the PEPA governance system.
 *
 * Flow:
 * 1. Register transaction in DB (status: pending)
 * 2. Layer 1: Evaluate fixed rules
 * 3. Layer 2: Statistical anomaly detection
 * 4. Layer 3: LLM agent interpretation
 * 5. Determine final outcome
 * 6. Execute or queue for approval
 * 7. Record full audit trail
 */
export async function processTransaction(
  walletAddress: string,
  input: TransactionInput
): Promise<{ transaction: Transaction; result: GovernancePipelineResult }> {
  // Step 0: Register transaction in DB
  let transaction = await insertTransaction(walletAddress, input);

  try {
    // Layer 1: Fixed Rules Check
    const rulesResult = await evaluateRules(walletAddress, input);

    // Layer 2: Statistical Anomaly Detection
    const anomalyResult = await detectAnomaly({
      walletAddress,
      amount: input.amount,
      category: input.category,
    });

    // Layer 3: AI Agent Interpretation
    const agentResult = await interpretTransaction(input, rulesResult, anomalyResult);

    // Layer 4: Determine Final Outcome
    const finalOutcome = determineFinalOutcome(
      rulesResult.passed,
      anomalyResult.is_anomaly,
      agentResult.recommendation
    );

    const pipelineResult: GovernancePipelineResult = {
      rules_result: rulesResult,
      anomaly_result: anomalyResult,
      agent_interpretation: agentResult,
      final_outcome: finalOutcome,
      timestamp: new Date().toISOString(),
    };

    // Record agent decision (audit trail)
    await insertAgentDecision({
      transaction_id: transaction.id,
      rules_result: rulesResult,
      anomaly_result: anomalyResult,
      explanation: agentResult.explanation,
      recommendation: agentResult.recommendation,
      confidence: agentResult.confidence,
      model_used: agentResult.model_used,
      tokens_used: agentResult.tokens_used,
      latency_ms: agentResult.latency_ms,
      raw_prompt: agentResult.raw_prompt,
      raw_response: agentResult.raw_response,
    });

    // Execute based on outcome
    switch (finalOutcome) {
      case "auto_approve": {
        // Execute transaction via WDK
        let txHash: string | undefined;
        try {
          const amountWei = parseAmountToWei(input.amount);
          const result = await wdkSend(
            input.chain ?? "ethereum-sepolia",
            input.recipient,
            amountWei
          );
          txHash = result.hash;
          transaction = await updateTransactionStatus(
            transaction.id,
            "executed",
            txHash,
            pipelineResult
          );
        } catch (err) {
          // Governance approved, but on-chain execution failed
          // Keep final_outcome as auto_approve (the decision was correct)
          const errorMsg = err instanceof Error ? err.message : String(err);
          transaction = await updateTransactionStatus(
            transaction.id,
            "approved",
            undefined,
            pipelineResult
          );
          console.warn(`[PEPA] WDK execution failed for tx ${transaction.id}: ${errorMsg}`);
          console.warn(`[PEPA] Transaction approved by governance but not yet executed on-chain.`);
        }
        break;
      }

      case "flag_for_review": {
        // Push to approval queue
        transaction = await updateTransactionStatus(
          transaction.id,
          "pending",
          undefined,
          pipelineResult
        );
        await insertApprovalItem({
          transaction_id: transaction.id,
          reason: buildFlagReason(pipelineResult),
          flag_source: anomalyResult.is_anomaly ? "anomaly" : "agent",
          agent_explanation: agentResult.explanation,
          anomaly_details: anomalyResult,
        });
        break;
      }

      case "reject": {
        transaction = await updateTransactionStatus(
          transaction.id,
          "rejected",
          undefined,
          pipelineResult
        );
        break;
      }
    }

    return { transaction, result: pipelineResult };
  } catch (err) {
    // Pipeline error: mark transaction as failed
    const errorMsg = err instanceof Error ? err.message : String(err);
    transaction = await updateTransactionStatus(transaction.id, "failed");
    throw new Error(`Governance pipeline failed for tx ${transaction.id}: ${errorMsg}`);
  }
}

/**
 * Execute a previously flagged transaction after human approval.
 */
export async function executeApprovedTransaction(
  transaction: Transaction
): Promise<Transaction> {
  // Simulated transactions skip WDK execution — just mark as executed
  const isSimulated =
    transaction.governance_result?.agent_interpretation?.model_used === "simulation";

  if (isSimulated) {
    const simulatedHash = `0xsim_${transaction.id.replace(/-/g, "").slice(0, 40)}`;
    return await updateTransactionStatus(transaction.id, "executed", simulatedHash);
  }

  try {
    const amountWei = parseAmountToWei(transaction.amount);
    const result = await wdkSend(
      transaction.chain,
      transaction.recipient,
      amountWei
    );
    return await updateTransactionStatus(transaction.id, "executed", result.hash);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await updateTransactionStatus(transaction.id, "failed");
    throw new Error(`Failed to execute approved tx ${transaction.id}: ${errorMsg}`);
  }
}

export function determineFinalOutcome(
  rulesPassed: boolean,
  isAnomaly: boolean,
  agentRecommendation: string
): FinalOutcome {
  // Rules failed → always reject
  if (!rulesPassed) return "reject";

  // Anomaly detected → flag for human review
  if (isAnomaly) return "flag_for_review";

  // Agent says flag → respect it (agent can escalate)
  if (agentRecommendation === "flag_for_review") return "flag_for_review";
  if (agentRecommendation === "reject") return "reject";

  // All clear → auto approve
  return "auto_approve";
}

function buildFlagReason(result: GovernancePipelineResult): string {
  const parts: string[] = [];

  if (result.anomaly_result.is_anomaly) {
    parts.push(
      `Statistical anomaly detected (z-score: ${result.anomaly_result.z_score})`
    );
  }

  if (result.rules_result.failed_rules.length > 0) {
    parts.push(
      `Failed rules: ${result.rules_result.failed_rules.map((r) => r.rule_name).join(", ")}`
    );
  }

  if (parts.length === 0) {
    parts.push("Flagged by AI agent for human review");
  }

  return parts.join(". ");
}

function parseAmountToWei(amount: number): bigint {
  // Assumes amount is in whole units (e.g., dollars/tokens)
  // Convert to wei (18 decimals) for native token transfers
  return BigInt(Math.round(amount * 1e18));
}
