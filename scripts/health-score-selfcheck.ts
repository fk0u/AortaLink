// AortaLink Health Score (AHA Life's Essential 8) Selfcheck & Verification (Issue #16).
// Run: node --experimental-strip-types scripts/health-score-selfcheck.ts

import assert from 'node:assert/strict';
import {
  calculateAortaLinkHealthScore,
  scoreBloodPressure,
  scoreNicotine,
  scoreBMI,
  scoreBloodLipids,
  scoreBloodGlucose,
  scorePhysicalActivity,
  scoreSleepHealth,
  scoreDiet,
  HEALTH_SCORE_ENGINE_VERSION
} from '../src/services/health-score/health-score-engine.ts';
import type {
  BPReading,
  Profile,
  LabResult,
  MedicationItem,
  SodiumLog,
  SleepLog,
  HabitLog
} from '../src/types/blood-pressure.ts';

console.log('[Health Score Selfcheck] Starting AHA Life\'s Essential 8 verification...');

// ---------------------------------------------------------------------------
// 1. Metric 1: Blood Pressure Scoring (AHA LE8 thresholds & treatment penalty)
// ---------------------------------------------------------------------------
const optimalReading: BPReading = {
  id: 'bp-1',
  profileId: 'p-1',
  timestamp: '2026-10-01T08:00:00Z',
  systolic: 115,
  diastolic: 75
};
// Untreated optimal (<120/<80) -> 100 pts
const bpScore1 = scoreBloodPressure([optimalReading], false);
assert.equal(bpScore1.score, 100);
assert.equal(bpScore1.status, 'optimal');

// Treated optimal (<120/<80) -> 100 - 20 = 80 pts
const bpScore2 = scoreBloodPressure([optimalReading], true);
assert.equal(bpScore2.score, 80);
assert.equal(bpScore2.treatedAdjustmentApplied, true);

// Stage 1 untreated (135/85) -> 50 pts
const stage1Reading: BPReading = {
  id: 'bp-2',
  profileId: 'p-1',
  timestamp: '2026-10-01T08:00:00Z',
  systolic: 135,
  diastolic: 85
};
const bpScore3 = scoreBloodPressure([stage1Reading], false);
assert.equal(bpScore3.score, 50);

// Stage 2 untreated (165/102) -> 0 pts
const stage2Reading: BPReading = {
  id: 'bp-3',
  profileId: 'p-1',
  timestamp: '2026-10-01T08:00:00Z',
  systolic: 165,
  diastolic: 102
};
const bpScore4 = scoreBloodPressure([stage2Reading], false);
assert.equal(bpScore4.score, 0);

// Empty readings -> missing
const bpScoreEmpty = scoreBloodPressure([], false);
assert.equal(bpScoreEmpty.score, null);
assert.equal(bpScoreEmpty.isAvailable, false);
console.log('✓ Metric 1: Blood Pressure LE8 scores & treated adjustment verified');

// ---------------------------------------------------------------------------
// 2. Metric 2: Nicotine Exposure Scoring
// ---------------------------------------------------------------------------
assert.equal(scoreNicotine('never').score, 100);
assert.equal(scoreNicotine('former').score, 75);
assert.equal(scoreNicotine('passive').score, 25);
assert.equal(scoreNicotine('current').score, 0);
assert.equal(scoreNicotine(undefined).score, null);
assert.equal(scoreNicotine(undefined).isAvailable, false);
console.log('✓ Metric 2: Nicotine exposure verified');

// ---------------------------------------------------------------------------
// 3. Metric 3: Body Mass Index (Asia-Pacific WHO cut-offs)
// ---------------------------------------------------------------------------
// Optimal Asia (<23.0) -> 100 pts
assert.equal(scoreBMI(21.5).score, 100);
// Overweight Asia (23.0 - 24.9) -> 70 pts
assert.equal(scoreBMI(23.8).score, 70);
// Obese 1 Asia (25.0 - 27.4) -> 40 pts
assert.equal(scoreBMI(26.2).score, 40);
// Obese 2 Asia (27.5 - 29.9) -> 15 pts
assert.equal(scoreBMI(28.5).score, 15);
// Obese 3 (>=30.0) -> 0 pts
assert.equal(scoreBMI(32.0).score, 0);
// Missing BMI
assert.equal(scoreBMI(undefined).score, null);
console.log('✓ Metric 3: BMI Asia-Pacific cut-offs verified');

// ---------------------------------------------------------------------------
// 4. Metric 4: Blood Lipids (Non-HDL Cholesterol)
// ---------------------------------------------------------------------------
const sampleLabOptimal: LabResult = {
  id: 1,
  profileId: 'p-1',
  timestamp: '2026-10-01T08:00:00Z',
  totalCholesterol: 170,
  hdlCholesterol: 55 // Non-HDL = 115 (<130) -> 100 pts untreated, 80 pts treated
};
assert.equal(scoreBloodLipids([sampleLabOptimal], false).score, 100);
assert.equal(scoreBloodLipids([sampleLabOptimal], true).score, 80);

const sampleLabHigh: LabResult = {
  id: 2,
  profileId: 'p-1',
  timestamp: '2026-10-01T08:00:00Z',
  totalCholesterol: 240,
  hdlCholesterol: 40 // Non-HDL = 200 (190-219) -> 20 pts
};
assert.equal(scoreBloodLipids([sampleLabHigh], false).score, 20);

// Missing lab
assert.equal(scoreBloodLipids([], false).score, null);
console.log('✓ Metric 4: Blood Lipids Non-HDL & statin deduction verified');

// ---------------------------------------------------------------------------
// 5. Metric 5: Blood Glucose (HbA1c & Fasting Glucose)
// ---------------------------------------------------------------------------
const labHbA1cNormal: LabResult = {
  id: 3,
  profileId: 'p-1',
  timestamp: '2026-10-01T08:00:00Z',
  hba1c: 5.4
};
assert.equal(scoreBloodGlucose([labHbA1cNormal], false).score, 100);

const labHbA1cPrediabetes: LabResult = {
  id: 4,
  profileId: 'p-1',
  timestamp: '2026-10-01T08:00:00Z',
  hba1c: 6.0
};
assert.equal(scoreBloodGlucose([labHbA1cPrediabetes], false).score, 60);

const labHbA1cDiabetic: LabResult = {
  id: 5,
  profileId: 'p-1',
  timestamp: '2026-10-01T08:00:00Z',
  hba1c: 7.2
};
assert.equal(scoreBloodGlucose([labHbA1cDiabetic], true).score, 30);
console.log('✓ Metric 5: Blood Glucose HbA1c & DM stratification verified');

// ---------------------------------------------------------------------------
// 6. Metric 6: Physical Activity
// ---------------------------------------------------------------------------
const activeHabits: HabitLog[] = [
  { id: 1, profileId: 'p-1', habitType: 'exercise', name: 'Jalan Santai', durationMinutes: 45, timestamp: '2026-10-01T08:00:00Z' }
];
assert.ok((scorePhysicalActivity(activeHabits).score || 0) > 0);
assert.equal(scorePhysicalActivity([]).score, null);
console.log('✓ Metric 6: Physical Activity verified');

// ---------------------------------------------------------------------------
// 7. Metric 7: Sleep Health
// ---------------------------------------------------------------------------
const normalSleepLogs: SleepLog[] = [
  { id: 1, profileId: 'p-1', date: '2026-10-01', hoursSlept: 8 }
];
assert.equal(scoreSleepHealth(normalSleepLogs).score, 100);

const shortSleepLogs: SleepLog[] = [
  { id: 2, profileId: 'p-1', date: '2026-10-01', hoursSlept: 4.5 }
];
assert.equal(scoreSleepHealth(shortSleepLogs).score, 20);
assert.equal(scoreSleepHealth([]).score, null);
console.log('✓ Metric 7: Sleep Health verified');

// ---------------------------------------------------------------------------
// 8. Metric 8: Dietary Quality (Sodium Intake DASH proxy)
// ---------------------------------------------------------------------------
const idealSodiumLogs: SodiumLog[] = [
  { id: 1, profileId: 'p-1', date: '2026-10-01', sodiumMg: 1400 }
];
assert.equal(scoreDiet(idealSodiumLogs).score, 100);

const highSodiumLogs: SodiumLog[] = [
  { id: 2, profileId: 'p-1', date: '2026-10-01', sodiumMg: 3500 }
];
assert.equal(scoreDiet(highSodiumLogs).score, 0);
assert.equal(scoreDiet([]).score, null);
console.log('✓ Metric 8: Dietary Quality & Sodium Intake verified');

// ---------------------------------------------------------------------------
// 9. Completeness & Refusal to Guess ('not_enough_data')
// ---------------------------------------------------------------------------
const partialProfile: Profile = {
  id: 'p-partial',
  name: 'Siti Rahma',
  gender: 'female',
  age: 48,
  bmi: 22.4,
  smokingStatus: 'never',
  createdAt: '2026-01-01T00:00:00Z'
};

// Incomplete: only BP, smoking, and BMI provided (3 of 8)
const incompleteReport = calculateAortaLinkHealthScore({
  profile: partialProfile,
  readings: [optimalReading]
});

assert.equal(incompleteReport.status, 'not_enough_data', 'Must refuse to guess total score when data is incomplete');
assert.equal(incompleteReport.totalScore, null);
assert.equal(incompleteReport.category, null);
assert.equal(incompleteReport.completedMetricsCount, 3);
assert.equal(incompleteReport.missingMetrics.length, 5);
assert.ok(incompleteReport.missingMetrics.includes('lipids'));
assert.ok(incompleteReport.missingMetrics.includes('sleep'));
console.log('✓ Incomplete input returns not_enough_data with exact missing metrics list');

// ---------------------------------------------------------------------------
// 10. Complete 8/8 Metrics -> Produces Valid Total Score & Category
// ---------------------------------------------------------------------------
const completeReport = calculateAortaLinkHealthScore({
  profile: partialProfile,
  readings: [optimalReading], // 100
  labResults: [sampleLabOptimal, labHbA1cNormal], // lipids 100, glucose 100
  sleepLogs: normalSleepLogs, // sleep 100
  sodiumLogs: idealSodiumLogs, // diet 100
  habits: [
    { id: 1, profileId: 'p-partial', habitType: 'exercise', name: 'Lari Pagi', durationMinutes: 60, timestamp: '2026-10-01T08:00:00Z' }
  ]
});

assert.equal(completeReport.status, 'complete');
assert.equal(completeReport.completedMetricsCount, 8);
assert.equal(completeReport.missingMetrics.length, 0);
assert.ok(typeof completeReport.totalScore === 'number');
assert.ok(completeReport.totalScore! >= 80, 'Score should be high optimal');
assert.equal(completeReport.category, 'high');
assert.ok(completeReport.categoryLabel.includes('Tinggi / Optimal'));
console.log(`✓ Complete input produced total score ${completeReport.totalScore}/100 (${completeReport.category})`);

console.log('\n[Health Score Selfcheck] ALL HEALTH SCORE TESTS PASSED SUCCESSFULLY!');
