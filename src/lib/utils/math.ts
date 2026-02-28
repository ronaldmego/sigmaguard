// Pure statistical functions for anomaly detection

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1));
}

export function zScore(value: number, avg: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - avg) / sd;
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

// Interquartile range: Q3 - Q1
export function iqr(values: number[]): { q1: number; q3: number; iqr: number } {
  const q1 = percentile(values, 25);
  const q3 = percentile(values, 75);
  return { q1, q3, iqr: q3 - q1 };
}

// Is value an IQR outlier? (outside Q1 - 1.5*IQR, Q3 + 1.5*IQR)
export function isIqrOutlier(value: number, values: number[]): boolean {
  if (values.length < 4) return false;
  const { q1, q3, iqr: iqrValue } = iqr(values);
  const lowerBound = q1 - 1.5 * iqrValue;
  const upperBound = q3 + 1.5 * iqrValue;
  return value < lowerBound || value > upperBound;
}

// Convert z-score to approximate percentile (standard normal CDF)
export function zScoreToPercentile(z: number): number {
  // Abramowitz and Stegun approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);
  const t = 1.0 / (1.0 + p * absZ);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-absZ * absZ / 2);

  return Math.round(((1 + sign * y) / 2) * 10000) / 100;
}
