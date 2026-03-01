import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectAnomaly } from "@/lib/governance/anomaly";
import {
  WALLET_ADDRESS,
  SAMPLE_HISTORY,
  makeDbTransaction,
} from "../fixtures/governance.fixtures";

// Mock the DB queries module
vi.mock("@/lib/db/queries", () => ({
  getTransactionHistory: vi.fn(),
}));

import { getTransactionHistory } from "@/lib/db/queries";

const mockGetTransactionHistory = vi.mocked(getTransactionHistory);

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// Cold start
// ============================================================

describe("cold start (insufficient history)", () => {
  it("returns cold_start with 0 history", async () => {
    mockGetTransactionHistory.mockResolvedValue([]);

    const result = await detectAnomaly({
      walletAddress: WALLET_ADDRESS,
      amount: 50,
    });

    expect(result.method).toBe("cold_start");
    expect(result.is_anomaly).toBe(false);
    expect(result.z_score).toBeNull();
    expect(result.sample_size).toBe(0);
  });

  it("returns cold_start with 4 transactions (below threshold)", async () => {
    const history = SAMPLE_HISTORY.slice(0, 4);
    mockGetTransactionHistory.mockResolvedValue(history);

    const result = await detectAnomaly({
      walletAddress: WALLET_ADDRESS,
      amount: 50,
    });

    expect(result.method).toBe("cold_start");
    expect(result.is_anomaly).toBe(false);
    expect(result.sample_size).toBe(4);
    expect(result.historical_mean).not.toBeNull();
  });

  it("exits cold start at exactly 5 transactions (threshold boundary)", async () => {
    const history = SAMPLE_HISTORY.slice(0, 5);
    mockGetTransactionHistory.mockResolvedValue(history);

    const result = await detectAnomaly({
      walletAddress: WALLET_ADDRESS,
      amount: 50,
    });

    expect(result.method).toBe("z_score");
    expect(result.z_score).not.toBeNull();
  });
});

// ============================================================
// Z-score detection
// ============================================================

describe("z-score anomaly detection", () => {
  it("marks normal transaction as not anomalous", async () => {
    mockGetTransactionHistory.mockResolvedValue(SAMPLE_HISTORY);

    // mean ≈ 51.5, sd ≈ 2.99 → z for 52 ≈ 0.17
    const result = await detectAnomaly({
      walletAddress: WALLET_ADDRESS,
      amount: 52,
    });

    expect(result.is_anomaly).toBe(false);
    expect(result.z_score).not.toBeNull();
    expect(Math.abs(result.z_score!)).toBeLessThan(2.0);
  });

  it("flags high anomaly (z > 2)", async () => {
    mockGetTransactionHistory.mockResolvedValue(SAMPLE_HISTORY);

    // mean ≈ 51.5, sd ≈ 2.99 → z for 60 ≈ 2.84
    const result = await detectAnomaly({
      walletAddress: WALLET_ADDRESS,
      amount: 60,
    });

    expect(result.is_anomaly).toBe(true);
    expect(result.z_score!).toBeGreaterThan(2.0);
  });

  it("flags low anomaly (z < -2)", async () => {
    mockGetTransactionHistory.mockResolvedValue(SAMPLE_HISTORY);

    // z for 44 ≈ -2.51
    const result = await detectAnomaly({
      walletAddress: WALLET_ADDRESS,
      amount: 44,
    });

    expect(result.is_anomaly).toBe(true);
    expect(result.z_score!).toBeLessThan(-2.0);
  });

  it("rounds z_score to 2 decimal places", async () => {
    mockGetTransactionHistory.mockResolvedValue(SAMPLE_HISTORY);

    const result = await detectAnomaly({
      walletAddress: WALLET_ADDRESS,
      amount: 53,
    });

    const zStr = result.z_score!.toString();
    const decimals = zStr.includes(".") ? zStr.split(".")[1].length : 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

// ============================================================
// IQR detection
// ============================================================

describe("IQR outlier detection", () => {
  it("detects IQR outlier even when z-score is borderline", async () => {
    // Create history with tight IQR but enough for outlier
    const tightHistory = [48, 49, 50, 50, 51, 51, 52, 50, 49, 51].map(
      (amount, i) =>
        makeDbTransaction({ id: `tx-tight-${i}`, amount, status: "executed" })
    );
    mockGetTransactionHistory.mockResolvedValue(tightHistory);

    const result = await detectAnomaly({
      walletAddress: WALLET_ADDRESS,
      amount: 70, // way outside IQR bounds
    });

    expect(result.is_anomaly).toBe(true);
    expect(result.iqr_outlier).toBe(true);
  });
});

// ============================================================
// Edge cases
// ============================================================

describe("edge cases", () => {
  it("handles identical amounts (sd=0)", async () => {
    const identicalHistory = Array.from({ length: 10 }, (_, i) =>
      makeDbTransaction({ id: `tx-id-${i}`, amount: 50, status: "executed" })
    );
    mockGetTransactionHistory.mockResolvedValue(identicalHistory);

    // Same value as history — z=0, not anomaly
    const result = await detectAnomaly({
      walletAddress: WALLET_ADDRESS,
      amount: 50,
    });

    expect(result.z_score).toBe(0);
    expect(result.is_anomaly).toBe(false);
  });

  it("handles identical history with different value (sd=0, IQR catches it)", async () => {
    const identicalHistory = Array.from({ length: 10 }, (_, i) =>
      makeDbTransaction({ id: `tx-id-${i}`, amount: 50, status: "executed" })
    );
    mockGetTransactionHistory.mockResolvedValue(identicalHistory);

    // Different value — z=0 (sd=0 guard), but IQR bounds are [50, 50]
    // isIqrOutlier: q1=50, q3=50, iqr=0, bounds=[50,50] → 100 > 50 → outlier
    const result = await detectAnomaly({
      walletAddress: WALLET_ADDRESS,
      amount: 100,
    });

    expect(result.z_score).toBe(0); // sd=0 guard
    expect(result.iqr_outlier).toBe(true);
    expect(result.is_anomaly).toBe(true);
  });

  it("passes category filter to getTransactionHistory", async () => {
    mockGetTransactionHistory.mockResolvedValue([]);

    await detectAnomaly({
      walletAddress: WALLET_ADDRESS,
      amount: 50,
      category: "gaming",
    });

    expect(mockGetTransactionHistory).toHaveBeenCalledWith(
      WALLET_ADDRESS,
      expect.objectContaining({ category: "gaming" })
    );
  });
});
