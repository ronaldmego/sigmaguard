import { describe, it, expect } from "vitest";
import {
  mean,
  stdDev,
  zScore,
  percentile,
  iqr,
  isIqrOutlier,
  zScoreToPercentile,
} from "@/lib/utils/math";

describe("mean", () => {
  it("returns 0 for empty array", () => {
    expect(mean([])).toBe(0);
  });

  it("returns the single value for one-element array", () => {
    expect(mean([42])).toBe(42);
  });

  it("computes known average", () => {
    expect(mean([10, 20, 30])).toBe(20);
  });
});

describe("stdDev", () => {
  it("returns 0 for empty array", () => {
    expect(stdDev([])).toBe(0);
  });

  it("returns 0 for single value", () => {
    expect(stdDev([5])).toBe(0);
  });

  it("computes sample standard deviation for known values", () => {
    // values: [2, 4, 4, 4, 5, 5, 7, 9] → sample std ≈ 2.138
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    const result = stdDev(values);
    expect(result).toBeCloseTo(2.138, 2);
  });
});

describe("zScore", () => {
  it("returns 0 when standard deviation is 0", () => {
    expect(zScore(100, 50, 0)).toBe(0);
  });

  it("computes positive z-score", () => {
    // (70 - 50) / 10 = 2.0
    expect(zScore(70, 50, 10)).toBe(2.0);
  });

  it("computes negative z-score", () => {
    // (30 - 50) / 10 = -2.0
    expect(zScore(30, 50, 10)).toBe(-2.0);
  });
});

describe("percentile", () => {
  it("returns 0 for empty array", () => {
    expect(percentile([], 50)).toBe(0);
  });

  it("computes median (50th percentile)", () => {
    // sorted: [1, 2, 3, 4, 5] → median = 3
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
  });

  it("interpolates between values", () => {
    // sorted: [10, 20, 30, 40] → p50 → index = 1.5 → 25
    expect(percentile([10, 20, 30, 40], 50)).toBe(25);
  });

  it("returns first element at p0", () => {
    expect(percentile([10, 20, 30], 0)).toBe(10);
  });

  it("returns last element at p100", () => {
    expect(percentile([10, 20, 30], 100)).toBe(30);
  });
});

describe("iqr", () => {
  it("computes known Q1, Q3, IQR", () => {
    // sorted: [1, 2, 3, 4, 5, 6, 7, 8]
    // Q1 = percentile(25) = index 1.75 → 2.75
    // Q3 = percentile(75) = index 5.25 → 6.25
    // IQR = 6.25 - 2.75 = 3.5
    const result = iqr([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.q1).toBe(2.75);
    expect(result.q3).toBe(6.25);
    expect(result.iqr).toBe(3.5);
  });
});

describe("isIqrOutlier", () => {
  it("returns false with fewer than 4 values", () => {
    expect(isIqrOutlier(100, [1, 2, 3])).toBe(false);
  });

  it("returns false for normal value", () => {
    // values: [10, 20, 30, 40, 50]
    // Q1=15, Q3=45, IQR=30, bounds: [-30, 90]
    expect(isIqrOutlier(50, [10, 20, 30, 40, 50])).toBe(false);
  });

  it("detects high outlier", () => {
    // Using bounds from above: upper = 90
    expect(isIqrOutlier(100, [10, 20, 30, 40, 50])).toBe(true);
  });

  it("detects low outlier", () => {
    // lower = -30
    expect(isIqrOutlier(-50, [10, 20, 30, 40, 50])).toBe(true);
  });
});

describe("zScoreToPercentile", () => {
  it("returns ~50 for z=0", () => {
    expect(zScoreToPercentile(0)).toBeCloseTo(50, 0);
  });

  it("returns ~97.5 for z≈1.96", () => {
    // Abramowitz-Stegun approximation with rounding yields ~97.5–98.5
    const result = zScoreToPercentile(1.96);
    expect(result).toBeGreaterThan(97);
    expect(result).toBeLessThan(99);
  });

  it("mirrors: negative z gives symmetric percentile", () => {
    const positive = zScoreToPercentile(1.5);
    const negative = zScoreToPercentile(-1.5);
    expect(positive + negative).toBeCloseTo(100, 0);
  });
});
