import OpenAI from "openai";
import type {
  TransactionInput,
  RulesResult,
  AnomalyResult,
  AgentInterpretation,
  AgentRecommendation,
} from "@/types";

const MODEL = "gpt-5.2";

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set in environment");
  }
  return new OpenAI({ apiKey });
}

const SYSTEM_PROMPT = `You are PEPA, an AI financial governance assistant. Your role is to INTERPRET statistical and rules-based analysis results — you do NOT make financial decisions yourself.

You receive:
1. The transaction details
2. The result of fixed governance rules evaluation
3. The result of statistical anomaly detection (Z-score, IQR)

Your job:
- Explain the analysis results in clear, concise language (2-4 sentences)
- Provide a recommendation based STRICTLY on the analysis results
- Never override the statistical model — if the model says it's anomalous, you MUST flag it
- If rules failed, you MUST recommend rejection
- You may only ESCALATE (make stricter), never DE-ESCALATE (make more lenient)

Recommendation options:
- "auto_approve": Rules passed AND no anomaly detected
- "flag_for_review": Anomaly detected but rules passed — needs human review
- "reject": Rules failed — hard block

Respond in JSON format:
{
  "explanation": "2-4 sentence explanation in English",
  "recommendation": "auto_approve" | "flag_for_review" | "reject",
  "confidence": 0.0 to 1.0
}`;

export async function interpretTransaction(
  transaction: TransactionInput,
  rulesResult: RulesResult,
  anomalyResult: AnomalyResult
): Promise<AgentInterpretation> {
  const client = getOpenAIClient();

  const userPrompt = buildUserPrompt(transaction, rulesResult, anomalyResult);
  const startTime = Date.now();

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 500,
  });

  const latencyMs = Date.now() - startTime;
  const rawResponse = completion.choices[0]?.message?.content ?? "{}";
  const tokensUsed =
    (completion.usage?.prompt_tokens ?? 0) + (completion.usage?.completion_tokens ?? 0);

  let parsed: { explanation: string; recommendation: string; confidence: number };
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    parsed = {
      explanation: "Failed to parse LLM response. Defaulting to flag for review.",
      recommendation: "flag_for_review",
      confidence: 0,
    };
  }

  // CRITICAL: Validate recommendation — LLM can only escalate, never de-escalate
  const validatedRecommendation = validateRecommendation(
    parsed.recommendation as AgentRecommendation,
    rulesResult,
    anomalyResult
  );

  return {
    explanation: parsed.explanation,
    recommendation: validatedRecommendation,
    confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
    model_used: MODEL,
    tokens_used: tokensUsed,
    latency_ms: latencyMs,
    raw_prompt: userPrompt,
    raw_response: rawResponse,
  };
}

function buildUserPrompt(
  transaction: TransactionInput,
  rulesResult: RulesResult,
  anomalyResult: AnomalyResult
): string {
  return `## Transaction
- Recipient: ${transaction.recipient}
- Amount: $${transaction.amount}
- Currency: ${transaction.currency ?? "USDT"}
- Chain: ${transaction.chain ?? "ethereum-sepolia"}
- Category: ${transaction.category ?? "uncategorized"}
- Merchant: ${transaction.merchant ?? "unknown"}

## Rules Evaluation
- Passed: ${rulesResult.passed}
- Rules evaluated: ${rulesResult.evaluations.length}
- Failed rules: ${rulesResult.failed_rules.length}
${rulesResult.failed_rules.map((r) => `  - ${r.rule_name}: ${r.reason}`).join("\n")}

## Anomaly Detection
- Is anomaly: ${anomalyResult.is_anomaly}
- Method: ${anomalyResult.method}
- Z-score: ${anomalyResult.z_score ?? "N/A"}
- Percentile: ${anomalyResult.percentile ?? "N/A"}
- Historical mean: $${anomalyResult.historical_mean ?? "N/A"}
- Historical std dev: $${anomalyResult.historical_std ?? "N/A"}
- Sample size: ${anomalyResult.sample_size}
- IQR outlier: ${anomalyResult.iqr_outlier ?? "N/A"}
- Reason: ${anomalyResult.reason}

Based on the above analysis, provide your interpretation and recommendation.`;
}

/**
 * CRITICAL SAFETY: The LLM can only ESCALATE, never DE-ESCALATE.
 * - If rules failed → MUST be "reject" (regardless of what LLM says)
 * - If anomaly detected → MUST be at least "flag_for_review"
 * - LLM cannot downgrade from flag_for_review to auto_approve
 */
function validateRecommendation(
  llmRecommendation: AgentRecommendation,
  rulesResult: RulesResult,
  anomalyResult: AnomalyResult
): AgentRecommendation {
  // Rules failed → always reject
  if (!rulesResult.passed) {
    return "reject";
  }

  // Anomaly detected → at minimum flag_for_review
  if (anomalyResult.is_anomaly) {
    if (llmRecommendation === "auto_approve") {
      return "flag_for_review"; // LLM tried to de-escalate — override
    }
    return llmRecommendation === "reject" ? "reject" : "flag_for_review";
  }

  // No anomaly, rules passed → LLM can recommend anything (but likely auto_approve)
  return llmRecommendation;
}
