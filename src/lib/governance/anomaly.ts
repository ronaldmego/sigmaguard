import type { AnomalyResult } from "@/types";
import { getTransactionHistory } from "@/lib/db/queries";
import { mean, stdDev, zScore, isIqrOutlier, zScoreToPercentile } from "@/lib/utils/math";

const COLD_START_THRESHOLD = 5;
const Z_SCORE_THRESHOLD = 2.0;

export interface AnomalyInput {
  walletAddress: string;
  amount: number;
  category?: string | null;
}

export async function detectAnomaly(input: AnomalyInput): Promise<AnomalyResult> {
  // Get historical transactions for this wallet + category
  const history = await getTransactionHistory(input.walletAddress, {
    category: input.category ?? undefined,
    status: "executed",
    limit: 200,
  });

  const amounts = history.map((tx) => Number(tx.amount));

  // Cold start: not enough data to determine anomaly
  if (amounts.length < COLD_START_THRESHOLD) {
    return {
      is_anomaly: false,
      z_score: null,
      iqr_outlier: null,
      method: "cold_start",
      percentile: null,
      historical_mean: amounts.length > 0 ? mean(amounts) : null,
      historical_std: amounts.length > 1 ? stdDev(amounts) : null,
      sample_size: amounts.length,
      threshold: Z_SCORE_THRESHOLD,
      reason: `Cold start: only ${amounts.length} historical transactions (need ${COLD_START_THRESHOLD}). No anomaly flag applied.`,
    };
  }

  // Z-score method (primary)
  const avg = mean(amounts);
  const sd = stdDev(amounts);
  const z = zScore(input.amount, avg, sd);
  const pct = zScoreToPercentile(z);
  const isZAnomaly = Math.abs(z) > Z_SCORE_THRESHOLD;

  // IQR method (secondary)
  const iqrOutlier = isIqrOutlier(input.amount, amounts);

  // An amount is anomalous if EITHER method flags it
  const isAnomaly = isZAnomaly || iqrOutlier;

  let reason: string;
  if (isAnomaly) {
    const parts: string[] = [];
    if (isZAnomaly) {
      parts.push(
        `Z-score ${z.toFixed(2)} exceeds threshold of ±${Z_SCORE_THRESHOLD} (${pct}th percentile)`
      );
    }
    if (iqrOutlier) {
      parts.push("IQR outlier detected");
    }
    reason = `Anomaly detected: ${parts.join("; ")}. Amount $${input.amount} vs historical mean $${avg.toFixed(2)} (σ=$${sd.toFixed(2)}, n=${amounts.length}).`;
  } else {
    reason = `Normal transaction. Z-score ${z.toFixed(2)} within ±${Z_SCORE_THRESHOLD} threshold (${pct}th percentile). Amount $${input.amount} vs mean $${avg.toFixed(2)}.`;
  }

  return {
    is_anomaly: isAnomaly,
    z_score: Math.round(z * 100) / 100,
    iqr_outlier: iqrOutlier,
    method: "z_score",
    percentile: pct,
    historical_mean: Math.round(avg * 100) / 100,
    historical_std: Math.round(sd * 100) / 100,
    sample_size: amounts.length,
    threshold: Z_SCORE_THRESHOLD,
    reason,
  };
}
