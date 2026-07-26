import type {
  TransactionInput,
  GovernancePipelineResult,
  FinalOutcome,
  Transaction,
  ExecutionIntent,
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
import { sendTransaction as wdkSend, executeSwap, supply as wdkSupply } from "@/lib/wdk";

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
      intent: buildIntent(input),
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
          const result = await executeIntent(
            input.chain ?? "ethereum-sepolia",
            input.recipient,
            input.amount,
            pipelineResult.intent
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
    // The intent was recorded when governance ran, so a swap a human approves
    // an hour later still executes as a swap.
    const result = await executeIntent(
      transaction.chain,
      transaction.recipient,
      transaction.amount,
      transaction.governance_result?.intent
    );
    return await updateTransactionStatus(transaction.id, "executed", result.hash);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await updateTransactionStatus(transaction.id, "failed");
    throw new Error(`Failed to execute approved tx ${transaction.id}: ${errorMsg}`);
  }
}

/**
 * The single place where "Rules decide · AI explains · Human approves" is
 * either true or a slogan.
 *
 * The AI's recommendation is allowed to move a transaction **towards** a human
 * and never away from one. That is the whole distinction between explaining and
 * deciding: escalating is declining to decide and handing the call up; ending
 * the transaction is deciding, because nobody else ever sees it.
 *
 * So an agent recommendation of `reject` is honoured as its *severity*, not as
 * its *verdict* — it becomes the strongest action the agent has, which is to
 * summon a human. Only deterministic rules can terminate a transaction on their
 * own, and they are the layer that can be read, tested and argued with.
 */
export function determineFinalOutcome(
  rulesPassed: boolean,
  isAnomaly: boolean,
  agentRecommendation: string
): FinalOutcome {
  // Layer 1 — deterministic rules are the only thing that can reject outright.
  if (!rulesPassed) return "reject";

  // Layer 2 — statistical anomaly: a human looks at it.
  if (isAnomaly) return "flag_for_review";

  // Layer 3 — the model may escalate, and escalation tops out at "flag".
  // A model asking to reject is a model asking for attention; it gets a human,
  // not the last word.
  if (agentRecommendation === "flag_for_review" || agentRecommendation === "reject") {
    return "flag_for_review";
  }

  // Nothing objected → auto approve.
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

export function buildIntent(input: TransactionInput): ExecutionIntent {
  return { action: input.action ?? "transfer", swap: input.swap, supply: input.supply };
}

/**
 * Execute an approved transaction as **the action it actually is**.
 *
 * Before this dispatch existed, every approved transaction became a native
 * transfer to `recipient`. For an agent-initiated swap that `recipient` was the
 * *output token's contract address*, so the "swap" was a native transfer into an
 * ERC-20 contract — funds stranded, and a governance report saying the swap
 * executed. On a testnet that is invisible; the README claim was the dangerous
 * part.
 *
 * The missing parameters case **throws**. Falling back to a transfer is what
 * produced the original defect, and a loud failure beats a quiet wrong action
 * when the subject is moving money.
 */
export async function executeIntent(
  chain: string,
  recipient: string,
  amount: number,
  intent: ExecutionIntent | undefined
): Promise<{ hash: string }> {
  const action = intent?.action ?? "transfer";

  if (action === "swap") {
    if (!intent?.swap) {
      throw new Error("swap transaction has no swap parameters — refusing to fall back to a transfer");
    }
    const result = await executeSwap({
      chain,
      tokenIn: intent.swap.tokenIn,
      tokenOut: intent.swap.tokenOut,
      tokenInAmount: BigInt(intent.swap.tokenInAmountWei),
      ...(intent.swap.maxFeeWei ? { maxFee: BigInt(intent.swap.maxFeeWei) } : {}),
    });
    return { hash: result.hash };
  }

  if (action === "supply") {
    if (!intent?.supply) {
      throw new Error("supply transaction has no supply parameters — refusing to fall back to a transfer");
    }
    const result = await wdkSupply({
      chain,
      token: intent.supply.token,
      amount: BigInt(intent.supply.amountWei),
    });
    return { hash: result.hash };
  }

  const result = await wdkSend(chain, recipient, parseAmountToWei(amount));
  return { hash: result.hash };
}
