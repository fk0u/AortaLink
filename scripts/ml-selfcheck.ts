// Self-check for the ML statistical core. Run: npm run test:ml
import assert from 'node:assert/strict';
import {
  olsFit,
  predictionHalfWidth,
  quantile,
  seededRandom,
  studentTQuantile,
  studentTTwoSidedP,
  welchTTest
} from '../src/services/ml/statistics.ts';

const near = (a: number, b: number, tol: number, msg: string) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

// Student t reference values (statistical tables).
near(studentTQuantile(0.975, 10), 2.228, 0.001, 't(0.975, 10)');
near(studentTQuantile(0.975, 3), 3.182, 0.001, 't(0.975, 3)');
near(studentTQuantile(0.975, 1e6), 1.96, 0.001, 't(0.975, ∞)');
near(studentTTwoSidedP(2.228, 10), 0.05, 0.001, 'p(t=2.228, df=10)');
near(studentTTwoSidedP(0, 5), 1, 1e-9, 'p(t=0)');

// Welch: identical groups → p = 1; clearly separated groups → p < 0.001.
assert.equal(welchTTest([120, 130, 125], [120, 130, 125])!.pValue, 1);
assert.ok(welchTTest([150, 152, 149, 151], [120, 121, 119, 122])!.pValue < 0.001);
assert.equal(welchTTest([1], [2, 3]), null);
// Small noisy groups with a big mean gap should NOT be significant.
assert.ok(welchTTest([140, 120, 160], [125, 135, 115])!.pValue > 0.05);

// OLS: exact line → slope recovered, p ≈ 0; flat noise → p > 0.05.
const line = olsFit([0, 1, 2, 3, 4, 5].map((x) => ({ x, y: 120 + 2 * x + (x % 2 ? 0.1 : -0.1) })))!;
near(line.slope, 2, 0.05, 'slope');
assert.ok(line.slopePValue < 0.001);
const flat = olsFit([0, 1, 2, 3, 4, 5].map((x) => ({ x, y: [130, 120, 135, 118, 128, 125][x] })))!;
assert.ok(flat.slopePValue > 0.05);

// Prediction interval widens with extrapolation distance and is wider than 1.96·s.
const near1 = predictionHalfWidth(line, line.meanX);
const far = predictionHalfWidth(line, line.meanX + 20);
assert.ok(far > near1, 'PI widens');
assert.ok(near1 > 1.96 * line.standardError, 'PI wider than naive band');

// Bootstrap helpers are deterministic.
const a = seededRandom(42);
const b = seededRandom(42);
assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
assert.equal(quantile([3, 1, 2, 4], 0.5), 2.5);

console.log('ml-selfcheck: all checks passed');
