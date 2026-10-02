/**
 * AortaLink Guideline Classifier Verification Suite (Issue #15)
 * -------------------------------------------------------------
 * Validates clinical guideline classifications against verified papers:
 * 1. ESH 2023 / PERHI 2021 (Default for Indonesia)
 * 2. ACC / AHA 2025 & 2017
 * 3. ESC 2024
 *
 * Checks:
 * - Rounding of fractional blood pressure values (audit P2-7 & clinical review)
 * - Category determined by highest of systolic or diastolic (and/or rule)
 * - ESH Grade 3 (>=180 and/or >=110 mmHg)
 * - Isolated Systolic (ISH) and Isolated Diastolic (IDH) flags
 * - Separate out-of-office (HBPM) thresholds (>=135/85 mmHg)
 * - Pediatric (<18 yo) exclusion from adult targets
 */

import assert from 'node:assert/strict';
import {
  classifyBP,
  classifyAgeAdjustedBP,
  calculateMAP,
  calculatePulsePressure,
  calculateRPP,
  classifyPulse,
  getAgeStratifiedTarget,
  GUIDELINE_REGISTRY
} from '../src/utils/bp-classifier.ts';

console.log('[Guideline Selfcheck] Starting clinical guidelines test suite...');

// ---------------------------------------------------------------------------
// 1. Registry & Guideline Metadata Verification
// ---------------------------------------------------------------------------
assert.ok(GUIDELINE_REGISTRY.esh_perhi);
assert.ok(GUIDELINE_REGISTRY.acc_aha_2025);
assert.ok(GUIDELINE_REGISTRY.esc_2024);

assert.equal(GUIDELINE_REGISTRY.esh_perhi.id, 'esh_perhi');
assert.ok(GUIDELINE_REGISTRY.esh_perhi.name.includes('PERHI'));
assert.equal(GUIDELINE_REGISTRY.esh_perhi.hypertensionThresholdOffice, '≥ 140/90 mmHg');
assert.equal(GUIDELINE_REGISTRY.esh_perhi.hypertensionThresholdHome, '≥ 135/85 mmHg');
console.log('✓ Guideline registry contains ESH/PERHI, ACC/AHA 2025, and ESC 2024');

// ---------------------------------------------------------------------------
// 2. Fractional Rounding Tests (Bug: 129.5 & 139.5 falling into wrong bracket)
// ---------------------------------------------------------------------------
// 129.5 / 84.5 rounds to 130 / 85:
// - ESH 2023: 130/85 is Normal-Tinggi ('elevated')
// - ACC/AHA 2025: 130/85 is Stage 1 ('stage1')
// - ESC 2024: 130/85 is Elevated BP ('elevated')
const r1Esh = classifyBP(129.5, 84.5, 'esh_perhi');
assert.equal(r1Esh.key, 'elevated', '129.5/84.5 in ESH must round to 130/85 (Normal-Tinggi / elevated)');

const r1Aha = classifyBP(129.5, 84.5, 'acc_aha_2025');
assert.equal(r1Aha.key, 'stage1', '129.5/84.5 in ACC/AHA must round to 130/85 (Stage 1)');

const r1Esc = classifyBP(129.5, 84.5, 'esc_2024');
assert.equal(r1Esc.key, 'elevated', '129.5/84.5 in ESC must round to 130/85 (Elevated BP)');

// 139.5 / 89.5 rounds to 140 / 90:
// - ESH 2023: Grade 1 ('stage1')
// - ACC/AHA 2025: Stage 2 ('stage2')
// - ESC 2024: Hypertension ('stage2')
const r2Esh = classifyBP(139.5, 89.5, 'esh_perhi');
assert.equal(r2Esh.key, 'stage1', '139.5/89.5 in ESH must round to 140/90 (Grade 1 / stage1)');

const r2Aha = classifyBP(139.5, 89.5, 'acc_aha_2025');
assert.equal(r2Aha.key, 'stage2', '139.5/89.5 in ACC/AHA must round to 140/90 (Stage 2 / stage2)');

const r2Esc = classifyBP(139.5, 89.5, 'esc_2024');
assert.equal(r2Esc.key, 'stage2', '139.5/89.5 in ESC must round to 140/90 (Hypertension / stage2)');
console.log('✓ Non-integer rounding correctly eliminates boundary bracket bugs');

// ---------------------------------------------------------------------------
// 3. ESH 2023 / PERHI 2021 Reference Values
// ---------------------------------------------------------------------------
// Optimal: <120 AND <80
const eshOpt = classifyBP(115, 75, 'esh_perhi');
assert.equal(eshOpt.key, 'optimal');
assert.equal(eshOpt.isIsolatedSystolic, false);
assert.equal(eshOpt.isIsolatedDiastolic, false);

// Normal: 120-129 and/or 80-84
const eshNorm = classifyBP(124, 82, 'esh_perhi');
assert.equal(eshNorm.key, 'normal');

// Normal-tinggi: 130-139 and/or 85-89
const eshHighNorm = classifyBP(134, 86, 'esh_perhi');
assert.equal(eshHighNorm.key, 'elevated');

// Grade 1: 140-159 and/or 90-99
const eshG1 = classifyBP(145, 92, 'esh_perhi');
assert.equal(eshG1.key, 'stage1');

// Grade 2: 160-179 and/or 100-109
const eshG2 = classifyBP(165, 102, 'esh_perhi');
assert.equal(eshG2.key, 'stage2');

// Grade 3: >=180 and/or >=110 (Bug fix: Grade 3 was previously missing in bp-classifier)
const eshG3Sys = classifyBP(185, 85, 'esh_perhi');
assert.equal(eshG3Sys.key, 'stage3', 'SBP >= 180 must classify as ESH Grade 3');
assert.equal(eshG3Sys.isIsolatedSystolic, true, 'SBP >= 180 and DBP < 90 is Isolated Systolic Hypertension');

const eshG3Dia = classifyBP(150, 115, 'esh_perhi');
assert.equal(eshG3Dia.key, 'stage3', 'DBP >= 110 must classify as ESH Grade 3');

const eshG3Both = classifyBP(190, 115, 'esh_perhi');
assert.equal(eshG3Both.key, 'stage3', 'SBP >= 180 and DBP >= 110 must classify as ESH Grade 3');

// Isolated Diastolic Hypertension (IDH): SBP < 140 and DBP >= 90
const eshIdh = classifyBP(125, 94, 'esh_perhi');
assert.equal(eshIdh.key, 'stage1');
assert.equal(eshIdh.isIsolatedDiastolic, true);
assert.equal(eshIdh.isIsolatedSystolic, false);
console.log('✓ ESH 2023 / PERHI classification brackets, Grade 3, and ISH/IDH verified');

// ---------------------------------------------------------------------------
// 4. ACC / AHA 2025 Reference Values
// ---------------------------------------------------------------------------
// Normal: <120 and <80
const ahaNorm = classifyBP(118, 76, 'acc_aha_2025');
assert.equal(ahaNorm.key, 'normal');

// Elevated: 120-129 and <80
const ahaElev = classifyBP(125, 78, 'acc_aha_2025');
assert.equal(ahaElev.key, 'elevated');

// Stage 1: 130-139 or 80-89
const ahaS1 = classifyBP(132, 75, 'acc_aha_2025');
assert.equal(ahaS1.key, 'stage1');
assert.equal(ahaS1.isIsolatedSystolic, true, 'In ACC/AHA, SBP 130-139 with DBP < 80 is ISH');

// Stage 2: >=140 or >=90
const ahaS2 = classifyBP(142, 88, 'acc_aha_2025');
assert.equal(ahaS2.key, 'stage2');

// Severe Hypertension: >180 and/or >120
const ahaCrisis = classifyBP(185, 125, 'acc_aha_2025');
assert.equal(ahaCrisis.key, 'crisis');
console.log('✓ ACC / AHA 2025 classification brackets verified');

// ---------------------------------------------------------------------------
// 5. ESC 2024 Reference Values
// ---------------------------------------------------------------------------
// Non-elevated: <120 and <70
const escNonElev = classifyBP(115, 65, 'esc_2024');
assert.equal(escNonElev.key, 'normal', 'ESC Non-elevated maps to normal key');

// Elevated BP: 120-139 or 70-89
const escElev1 = classifyBP(125, 68, 'esc_2024');
assert.equal(escElev1.key, 'elevated', 'SBP 125 with DBP 68 is ESC Elevated BP');

const escElev2 = classifyBP(115, 78, 'esc_2024');
assert.equal(escElev2.key, 'elevated', 'SBP 115 with DBP 78 is ESC Elevated BP');

// Hypertension: >=140 or >=90
const escHt = classifyBP(142, 92, 'esc_2024');
assert.equal(escHt.key, 'stage2', 'ESC Hypertension maps to stage2 key');

const escSevere = classifyBP(185, 115, 'esc_2024');
assert.equal(escSevere.key, 'stage3');
console.log('✓ ESC 2024 new Elevated BP category verified');

// ---------------------------------------------------------------------------
// 6. Out-of-Office (HBPM) Separate Threshold Tests
// ---------------------------------------------------------------------------
// Home reading 136/86 mmHg:
// Under clinic threshold (140/90), this is NOT clinic hypertension.
// But under HBPM threshold (135/85), this IS elevated above home threshold!
const homeReadingEsh = classifyBP(136, 86, 'esh_perhi', { isHomeMeasurement: true });
assert.equal(homeReadingEsh.isHomeMeasurement, true);
assert.equal(homeReadingEsh.isAboveHomeThreshold, true, '136/86 at home is above HBPM threshold (≥135/85)');

const homeReadingNorm = classifyBP(130, 80, 'esh_perhi', { isHomeMeasurement: true });
assert.equal(homeReadingNorm.isAboveHomeThreshold, false, '130/80 at home is within normal HBPM limits');
console.log('✓ Out-of-office (HBPM) threshold correctly separates home vs clinic hypertension');

// ---------------------------------------------------------------------------
// 7. Pediatric Exclusion (<18 yo) from Adult Targets
// ---------------------------------------------------------------------------
const pedTarget = getAgeStratifiedTarget(14);
assert.equal(pedTarget.isPediatricExcluded, true);
assert.ok(pedTarget.caution.includes('<18 tahun'));
assert.ok(pedTarget.targetText.includes('Pediatrik'));

const adultTarget = getAgeStratifiedTarget(45);
assert.equal(adultTarget.isPediatricExcluded, undefined);
assert.ok(adultTarget.targetText.includes('< 130/80'));

const pedAdj = classifyAgeAdjustedBP(110, 70, 12);
assert.equal(pedAdj.isNormalForAge, false, 'Pediatric cases must not evaluate to isNormalForAge: true via adult formulas');
assert.ok(pedAdj.ageClinicalAdvice.includes('<18 tahun'));
console.log('✓ Pediatric target exclusion verified');

// ---------------------------------------------------------------------------
// 8. Physiological Calculations (MAP, PP, RPP, Pulse)
// ---------------------------------------------------------------------------
// MAP: 120/80 -> 80 + 40/3 = 93
assert.equal(calculateMAP(120, 80), 93);
// PP: 120/80 -> 40
assert.equal(calculatePulsePressure(120, 80), 40);
// RPP: 120 * 70 = 8400
assert.equal(calculateRPP(120, 70), 8400);

const normalPulse = classifyPulse(72);
assert.equal(normalPulse.status, 'normal');

const bradyPulse = classifyPulse(52);
assert.equal(bradyPulse.status, 'low');

const tachyPulse = classifyPulse(110);
assert.equal(tachyPulse.status, 'high');
console.log('✓ Hemodynamic calculations (MAP, PP, RPP, Pulse) verified');

// ---------------------------------------------------------------------------
// 9. Provenance & Patient Wording
// ---------------------------------------------------------------------------
const res = classifyBP(135, 88, 'esh_perhi');
assert.equal(res.guidelineId, 'esh_perhi');
assert.equal(res.guidelineVersion, '2023 / PERHI 2021');
assert.ok(res.patientWording.includes('Tekanan darah Anda (135/88 mmHg)'));
assert.ok(res.patientWording.includes('ESH / PERHI'));
console.log('✓ Provenance metadata and patient wording verified');

console.log('[Guideline Selfcheck] All guideline tests passed successfully.');
