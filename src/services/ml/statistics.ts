/**
 * AortaLink On-Device Clinical ML — Statistical Core
 * ---------------------------------------------------
 * Pure deterministic numeric primitives used by the ML engine.
 * No randomness, no external services: every output is fully
 * reproducible from the user's own data.
 */

export interface RegressionResult {
  /** Slope in units of y per unit of x. */
  slope: number;
  intercept: number;
  /** Coefficient of determination (0..1). */
  r2: number;
  /** Residual standard error of the fit (same units as y). */
  standardError: number;
  n: number;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Sample standard deviation (n-1 denominator). Returns 0 for n < 2. */
export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) * (v - m), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Ordinary least squares fit of y = intercept + slope * x.
 * Returns null when the fit is degenerate (fewer than 3 points or zero x-variance).
 */
export function olsFit(points: Array<{ x: number; y: number }>): RegressionResult | null {
  const n = points.length;
  if (n < 3) return null;

  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));

  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.x - mx) * (p.x - mx);
    sxy += (p.x - mx) * (p.y - my);
  }
  // Zero variance in x (e.g. all readings taken at the same instant) — no trend is identifiable.
  if (sxx === 0) return null;

  const slope = sxy / sxx;
  const intercept = my - slope * mx;

  let ssRes = 0;
  let ssTot = 0;
  for (const p of points) {
    const predicted = intercept + slope * p.x;
    ssRes += (p.y - predicted) * (p.y - predicted);
    ssTot += (p.y - my) * (p.y - my);
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const standardError = n > 2 && ssRes > 0 ? Math.sqrt(ssRes / (n - 2)) : 0;

  return { slope, intercept, r2, standardError, n };
}

/** Pearson correlation coefficient; 0 when undefined. */
export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}

export function sigmoid(z: number): number {
  // Numerically stable logistic function.
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
