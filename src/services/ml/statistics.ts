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
  /** Mean of x and Σ(x−x̄)², needed for prediction intervals and the slope test. */
  meanX: number;
  sxx: number;
  /** Two-sided p-value of H0: slope = 0 (t-test, n−2 df). */
  slopePValue: number;
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
  const slopeSe = standardError / Math.sqrt(sxx);
  const slopePValue = slopeSe === 0 ? (slope === 0 ? 1 : 0) : studentTTwoSidedP(slope / slopeSe, n - 2);

  return { slope, intercept, r2, standardError, n, meanX: mx, sxx, slopePValue };
}

/**
 * Half-width of the 95% prediction interval for a new observation at x:
 * t(0.975, n−2) · s · √(1 + 1/n + (x − x̄)² / Sxx).
 * Widens with extrapolation distance and small n, unlike a constant 1.96·s band.
 */
export function predictionHalfWidth(fit: RegressionResult, x: number): number {
  const t = studentTQuantile(0.975, fit.n - 2);
  return t * fit.standardError * Math.sqrt(1 + 1 / fit.n + ((x - fit.meanX) ** 2) / fit.sxx);
}

/** Welch's unequal-variance t-test. Returns null when either group has < 2 values. */
export function welchTTest(a: number[], b: number[]): { t: number; df: number; pValue: number } | null {
  if (a.length < 2 || b.length < 2) return null;
  const va = stdDev(a) ** 2 / a.length;
  const vb = stdDev(b) ** 2 / b.length;
  const diff = mean(a) - mean(b);
  if (va + vb === 0) return { t: diff === 0 ? 0 : Infinity, df: a.length + b.length - 2, pValue: diff === 0 ? 1 : 0 };
  const t = diff / Math.sqrt(va + vb);
  const df = (va + vb) ** 2 / ((va * va) / (a.length - 1) + (vb * vb) / (b.length - 1));
  return { t, df, pValue: studentTTwoSidedP(t, df) };
}

/** Two-sided p-value for a Student t statistic with `df` degrees of freedom. */
export function studentTTwoSidedP(t: number, df: number): number {
  if (!Number.isFinite(t)) return 0;
  return regularizedIncompleteBeta(df / (df + t * t), df / 2, 0.5);
}

/** Quantile of the Student t distribution (p in 0.5..1), by bisection on the CDF. */
export function studentTQuantile(p: number, df: number): number {
  const target = 2 * (1 - p); // two-sided tail mass
  let lo = 0;
  let hi = 1000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (studentTTwoSidedP(mid, df) > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function logGamma(x: number): number {
  // Lanczos approximation (g = 7, n = 9).
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Regularized incomplete beta I_x(a, b) via Lentz's continued fraction (Numerical Recipes). */
function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x > (a + 1) / (a + b + 2)) return 1 - regularizedIncompleteBeta(1 - x, b, a);
  const tiny = 1e-30;
  let f = 1;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  d = Math.abs(d) < tiny ? 1 / tiny : 1 / d;
  f = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let num = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + num * d;
    d = Math.abs(d) < tiny ? 1 / tiny : 1 / d;
    c = 1 + num / c;
    c = Math.abs(c) < tiny ? tiny : c;
    f *= d * c;
    num = -((a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + num * d;
    d = Math.abs(d) < tiny ? 1 / tiny : 1 / d;
    c = 1 + num / c;
    c = Math.abs(c) < tiny ? tiny : c;
    const delta = d * c;
    f *= delta;
    if (Math.abs(delta - 1) < 1e-12) break;
  }
  return (front * f) / a;
}

/** Deterministic PRNG (mulberry32) so bootstrap results are reproducible from the same data. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Value at quantile q (0..1) of an unsorted sample, linear interpolation. */
export function quantile(values: number[], q: number): number {
  const s = [...values].sort((x, y) => x - y);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
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
