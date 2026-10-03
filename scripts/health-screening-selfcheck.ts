// Health Screening & FHIR R4 compliance selfcheck (Step 03, Issue #13)
// Run: node --experimental-strip-types scripts/health-screening-selfcheck.ts

import assert from 'node:assert/strict';
import {
  convertConditionToFHIR,
  conditionFromFHIR,
  convertFamilyHistoryToFHIR,
  familyHistoryFromFHIR,
  convertImmunizationToFHIR,
  immunizationFromFHIR,
  convertAnthropometryToFHIR,
  convertSocialHistoryToFHIR,
  exportCompleteFHIRBundle,
  isUuid,
  toValidUuid
} from '../src/services/fhir/fhir-exporter.ts';
import {
  calculateBMI,
  AORTA_RISK_FACTORS_CATALOG,
  CARDIO_IMMUNIZATIONS_CATALOG,
  evaluateScreeningRisk
} from '../src/services/screening/screening-service.ts';
import type {
  Profile,
  ConditionItem,
  FamilyMemberHistoryItem,
  ImmunizationItem
} from '../src/types/blood-pressure.ts';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

console.log('[Screening Selfcheck] Starting Step 03 health screening & FHIR R4 verification...');

// ---------------------------------------------------------------------------
// 1. BMI Asia-Pacific WHO Stratification & Finite Rejection Tests
// ---------------------------------------------------------------------------
const underweight = calculateBMI(170, 50); // BMI 17.3
assert.ok(underweight);
assert.equal(underweight.category, 'underweight');

const normal = calculateBMI(170, 62); // BMI 21.5
assert.ok(normal);
assert.equal(normal.category, 'normal');

const overweight = calculateBMI(170, 70); // BMI 24.2
assert.ok(overweight);
assert.equal(overweight.category, 'overweight');

const obese1 = calculateBMI(170, 80); // BMI 27.7
assert.ok(obese1);
assert.equal(obese1.category, 'obese1');

const obese2 = calculateBMI(170, 95); // BMI 32.9
assert.ok(obese2);
assert.equal(obese2.category, 'obese2');

// Invalid and non-finite inputs return null
assert.equal(calculateBMI(0, 70), null);
assert.equal(calculateBMI(170, -5), null);
assert.equal(calculateBMI(NaN, 70), null);
assert.equal(calculateBMI(170, Infinity), null);
console.log('✓ BMI calculation, Asia-Pacific WHO brackets, and non-finite rejection verified');

// ---------------------------------------------------------------------------
// 2. Aorta Risk Factors Catalog Integrity (WHO ICD-10 + SNOMED CT)
// ---------------------------------------------------------------------------
const REQUIRED_AORTA_KEYS = [
  'family_aneurysm',
  'family_dissection',
  'marfan',
  'loeys_dietz',
  'veds',
  'turner',
  'bicuspid_aorta',
  'coarctation',
  'takayasu_arteritis',
  'giant_cell_arteritis',
  'personal_aorta_history',
  'hypertension',
  'smoking',
  'stimulants',
  'cad_pjk',
  'stroke_ischemic',
  'tia_ischemic',
  'pad_peripheral',
  'advanced_age_male',
  'pregnancy_high_risk'
];

assert.equal(
  AORTA_RISK_FACTORS_CATALOG.length,
  REQUIRED_AORTA_KEYS.length,
  `Catalog must contain exactly ${REQUIRED_AORTA_KEYS.length} aorta & vascular risk factors`
);

for (const key of REQUIRED_AORTA_KEYS) {
  assert.ok(AORTA_RISK_FACTORS_CATALOG.some((f) => f.key === key), `Missing required risk factor: ${key}`);
}

const marfan = AORTA_RISK_FACTORS_CATALOG.find((f) => f.key === 'marfan');
assert.ok(marfan);
assert.equal(marfan.icd10Code, 'Q87.4', 'Marfan must map to ICD-10 WHO Q87.4');
assert.equal(marfan.snomedCode, '19346006');
assert.equal(marfan.supportsAortaDetails, true);

const bicuspid = AORTA_RISK_FACTORS_CATALOG.find((f) => f.key === 'bicuspid_aorta');
assert.ok(bicuspid);
assert.equal(bicuspid.icd10Code, 'Q23.1');

const veds = AORTA_RISK_FACTORS_CATALOG.find((f) => f.key === 'veds');
assert.ok(veds);
assert.equal(veds.icd10Code, 'Q79.6');

const turner = AORTA_RISK_FACTORS_CATALOG.find((f) => f.key === 'turner');
assert.ok(turner);
assert.equal(turner.icd10Code, 'Q96.9');

// Verify split distinct choices for Takayasu vs GCA
assert.ok(AORTA_RISK_FACTORS_CATALOG.find((f) => f.key === 'takayasu_arteritis' && f.icd10Code === 'M31.4'));
assert.ok(AORTA_RISK_FACTORS_CATALOG.find((f) => f.key === 'giant_cell_arteritis' && f.icd10Code === 'M31.5'));

// Verify split distinct choices for Atherosclerosis (CAD, Stroke, TIA, PAD)
assert.ok(AORTA_RISK_FACTORS_CATALOG.find((f) => f.key === 'cad_pjk' && f.icd10Code === 'I25.1'));
assert.ok(AORTA_RISK_FACTORS_CATALOG.find((f) => f.key === 'stroke_ischemic' && f.icd10Code === 'I64'));
assert.ok(AORTA_RISK_FACTORS_CATALOG.find((f) => f.key === 'tia_ischemic' && f.icd10Code === 'G45.9'));
assert.ok(AORTA_RISK_FACTORS_CATALOG.find((f) => f.key === 'pad_peripheral' && f.icd10Code === 'I73.9'));

console.log('✓ Aorta Risk Factors Catalog & WHO ICD-10/SNOMED codes verified');

// ---------------------------------------------------------------------------
// 3. Condition <-> FHIR R4 Round-trip Tests (With Category Preservation)
// ---------------------------------------------------------------------------
const sampleProfile: Profile = {
  id: '3f6e1f02-0c3f-42e8-9bc7-6ecbcfcb1100',
  name: 'Budi Santoso',
  gender: 'male',
  avatar: 'user',
  relationship: 'self',
  age: 56, // age >= 55 triggers demographic risk
  targetSystolic: 120,
  targetDiastolic: 80,
  createdAt: '2026-01-01T00:00:00Z',
  heightCm: 172,
  weightKg: 78,
  bmi: 26.4,
  smokingStatus: 'former',
  alcoholConsumption: 'none',
  substanceUseHistory: false
};

const sampleCondition: ConditionItem = {
  id: 'e4f5a6b7-c8d9-4e0f-8a2b-3c4d5e6f7a8b',
  profileId: sampleProfile.id,
  code: 'Q87.4',
  snomedCode: '19346006',
  category: 'aorta_risk',
  name: 'Sindrom Marfan',
  clinicalStatus: 'active',
  verificationStatus: 'confirmed',
  onsetDateTime: '2020-05-10',
  recordedDate: '2026-10-02T10:00:00.000Z',
  notes: 'Evaluasi rutin akar aorta',
  aortaDetails: {
    diameterMm: 44,
    segment: 'ascending',
    modality: 'cta',
    measurementMethod: 'inner_to_inner'
  }
};

const fhirCond = convertConditionToFHIR(sampleCondition, sampleProfile);
assert.equal(fhirCond.resourceType, 'Condition');
assert.match(fhirCond.id!, UUID_REGEX);
assert.equal(fhirCond.clinicalStatus?.coding?.[0]?.code, 'active');
assert.equal(fhirCond.verificationStatus?.coding?.[0]?.code, 'confirmed');
assert.equal(fhirCond.code.coding?.[0]?.code, 'Q87.4');
assert.equal(fhirCond.code.coding?.[1]?.code, '19346006');
assert.equal(fhirCond.subject.reference, `urn:uuid:${sampleProfile.id}`);
assert.ok(fhirCond.extension && fhirCond.extension.length > 0);

// Round-trip back to ConditionItem
const restoredCond = conditionFromFHIR(fhirCond);
assert.equal(restoredCond.id, sampleCondition.id);
assert.equal(restoredCond.profileId, sampleCondition.profileId);
assert.equal(restoredCond.code, sampleCondition.code);
assert.equal(restoredCond.snomedCode, sampleCondition.snomedCode);
assert.equal(restoredCond.category, 'aorta_risk');
assert.equal(restoredCond.name, sampleCondition.name);
assert.equal(restoredCond.clinicalStatus, sampleCondition.clinicalStatus);
assert.equal(restoredCond.verificationStatus, sampleCondition.verificationStatus);
assert.equal(restoredCond.aortaDetails?.diameterMm, 44);
assert.equal(restoredCond.aortaDetails?.segment, 'ascending');
assert.equal(restoredCond.aortaDetails?.modality, 'cta');

// Category round-trip for comorbidity
const sampleComorb: ConditionItem = {
  id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
  profileId: sampleProfile.id,
  code: 'E11.9',
  category: 'comorbidity',
  name: 'Diabetes Melitus Tipe 2',
  clinicalStatus: 'active',
  recordedDate: '2026-10-02T10:00:00.000Z'
};
const fhirComorb = convertConditionToFHIR(sampleComorb, sampleProfile);
const restoredComorb = conditionFromFHIR(fhirComorb);
assert.equal(restoredComorb.category, 'comorbidity', 'Category comorbidity must be preserved');
console.log('✓ ConditionItem <-> FhirCondition round-trip & category preservation passed');

// ---------------------------------------------------------------------------
// 4. FamilyMemberHistory <-> FHIR R4 Round-trip Tests (deceased[x] choice)
// ---------------------------------------------------------------------------
const sampleFamily: FamilyMemberHistoryItem = {
  id: 'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a',
  profileId: sampleProfile.id,
  relationship: 'FTH',
  relationshipDisplay: 'Ayah Kandung',
  conditionCode: 'I71.0',
  conditionName: 'Diseksi Aorta',
  snomedCode: '308540004',
  deceased: true,
  deceasedAge: 48,
  contributedToDeath: true,
  recordedDate: '2026-10-02T10:00:00.000Z'
};

const fhirFamily = convertFamilyHistoryToFHIR(sampleFamily, sampleProfile);
assert.equal(fhirFamily.resourceType, 'FamilyMemberHistory');
assert.match(fhirFamily.id!, UUID_REGEX);
assert.equal(fhirFamily.relationship.coding?.[0]?.code, 'FTH');
assert.equal(fhirFamily.date, sampleFamily.recordedDate, 'Family history must retain recordedDate in FHIR date');
assert.equal(fhirFamily.deceasedAge?.value, 48);
assert.equal(fhirFamily.deceasedBoolean, undefined, 'Must not emit both deceasedBoolean and deceasedAge');
assert.equal(fhirFamily.condition?.[0]?.code.coding?.[0]?.code, 'I71.0');
assert.equal(fhirFamily.condition?.[0]?.contributedToDeath, true);

// Round-trip back to FamilyMemberHistoryItem
const restoredFamily = familyHistoryFromFHIR(fhirFamily);
assert.equal(restoredFamily.id, sampleFamily.id);
assert.equal(restoredFamily.profileId, sampleFamily.profileId);
assert.equal(restoredFamily.relationship, 'FTH');
assert.equal(restoredFamily.conditionCode, 'I71.0');
assert.equal(restoredFamily.snomedCode, '308540004');
assert.equal(restoredFamily.deceased, true);
assert.equal(restoredFamily.deceasedAge, 48);
assert.equal(restoredFamily.contributedToDeath, true);
assert.equal(restoredFamily.recordedDate, sampleFamily.recordedDate);
console.log('✓ FamilyMemberHistoryItem <-> FhirFamilyMemberHistory round-trip passed');

// ---------------------------------------------------------------------------
// 5. Immunization <-> FHIR R4 Round-trip Tests
// ---------------------------------------------------------------------------
const sampleImm: ImmunizationItem = {
  id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  profileId: sampleProfile.id,
  vaccineCode: 'FLU',
  vaccineName: 'Influenza Tahunan',
  cvxCode: '140',
  occurrenceDateTime: '2026-04-15T09:00:00.000Z',
  status: 'completed',
  recordedDate: '2026-10-02T10:00:00.000Z'
};

const fhirImm = convertImmunizationToFHIR(sampleImm, sampleProfile);
assert.equal(fhirImm.resourceType, 'Immunization');
assert.match(fhirImm.id!, UUID_REGEX);
assert.equal(fhirImm.status, 'completed');
assert.equal(fhirImm.vaccineCode.coding?.[0]?.code, 'FLU');
assert.equal(fhirImm.vaccineCode.coding?.[1]?.code, '140');

// Round-trip back to ImmunizationItem
const restoredImm = immunizationFromFHIR(fhirImm);
assert.equal(restoredImm.id, sampleImm.id);
assert.equal(restoredImm.profileId, sampleImm.profileId);
assert.equal(restoredImm.vaccineCode, 'FLU');
assert.equal(restoredImm.cvxCode, '140');
assert.equal(restoredImm.status, 'completed');
console.log('✓ ImmunizationItem <-> FhirImmunization round-trip passed');

// ---------------------------------------------------------------------------
// 6. Anthropometry & Social History FHIR Observations
// ---------------------------------------------------------------------------
const anthro = convertAnthropometryToFHIR(sampleProfile);
assert.ok(anthro.height);
assert.equal(anthro.height.code.coding?.[0]?.code, '8302-2', 'Height must use LOINC 8302-2');
assert.equal(anthro.height.valueQuantity?.value, 172);

assert.ok(anthro.weight);
assert.equal(anthro.weight.code.coding?.[0]?.code, '29463-7', 'Weight must use LOINC 29463-7');
assert.equal(anthro.weight.valueQuantity?.value, 78);

assert.ok(anthro.bmi);
assert.equal(anthro.bmi.code.coding?.[0]?.code, '39156-5', 'BMI must use LOINC 39156-5');
assert.equal(anthro.bmi.valueQuantity?.value, 26.4);
assert.ok(anthro.bmi.derivedFrom && anthro.bmi.derivedFrom.length === 2, 'BMI must have standard derivedFrom references');

const social = convertSocialHistoryToFHIR(sampleProfile);
assert.equal(social.length, 2); // Former smoker + alcohol consumption
assert.equal(social[0].code.coding?.[0]?.code, '72166-2', 'Smoking status must use LOINC 72166-2');
assert.equal(social[0].valueCodeableConcept?.coding?.[0]?.code, '8517006', 'Former smoker must use SNOMED 8517006 in valueCodeableConcept');

assert.equal(social[1].code.coding?.[0]?.code, '11331-6', 'Alcohol status must use LOINC 11331-6');
assert.equal(social[1].valueCodeableConcept?.coding?.[0]?.code, '228274009', 'Lifetime non-drinker must use SNOMED 228274009');

// Exercise all four SNOMED CT alcohol codes
const pOccasional: Profile = { ...sampleProfile, alcoholConsumption: 'occasional' };
const sOccasional = convertSocialHistoryToFHIR(pOccasional);
assert.equal(sOccasional[1].valueCodeableConcept?.coding?.[0]?.code, '228276006', 'Occasional drinker must use SNOMED 228276006');

const pModerate: Profile = { ...sampleProfile, alcoholConsumption: 'moderate' };
const sModerate = convertSocialHistoryToFHIR(pModerate);
assert.equal(sModerate[1].valueCodeableConcept?.coding?.[0]?.code, '43783005', 'Moderate drinker must use SNOMED 43783005');

const pHeavy: Profile = { ...sampleProfile, alcoholConsumption: 'heavy' };
const sHeavy = convertSocialHistoryToFHIR(pHeavy);
assert.equal(sHeavy[1].valueCodeableConcept?.coding?.[0]?.code, '160577002', 'Heavy drinker must use SNOMED 160577002');

console.log('✓ Anthropometry & Social History Observations with all LOINC & SNOMED codes passed');

// ---------------------------------------------------------------------------
// 7. Complete FHIR R4 Bundle Collection Export
// ---------------------------------------------------------------------------
const fullBundle = exportCompleteFHIRBundle({
  profile: sampleProfile,
  readings: [],
  labResults: [],
  medications: [],
  conditions: [sampleCondition],
  familyHistory: [sampleFamily],
  immunizations: [sampleImm]
});

assert.equal(fullBundle.resourceType, 'Bundle');
assert.equal(fullBundle.type, 'collection');
assert.equal(
  fullBundle.entry.length,
  9,
  'Bundle must contain exactly 9 entries (1 Patient, 3 Vital Signs, 2 Social History Observations, 1 Condition, 1 FamilyHistory, 1 Immunization)'
);

for (const entry of fullBundle.entry) {
  assert.match(entry.fullUrl, /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.ok(entry.resource);
  assert.ok(entry.resource.resourceType);
}
console.log('✓ Full FHIR R4 Bundle Collection export passed (9/9 entries verified)');

// ---------------------------------------------------------------------------
// 8. Screening Risk Evaluation (Including Demographic Risk)
// ---------------------------------------------------------------------------
const summary = evaluateScreeningRisk(sampleProfile, [sampleCondition], [sampleFamily], [sampleImm]);
assert.equal(summary.hasSyndromicAortaRisk, true, 'Marfan must trigger hasSyndromicAortaRisk');
assert.equal(summary.familyHistoryCount, 1);
assert.ok(summary.positiveFactors.length >= 3);
assert.ok(summary.clinicalHighlights.length >= 2);
console.log('✓ Screening risk evaluation engine passed');

console.log('\n[Screening Selfcheck] ALL HEALTH SCREENING & FHIR R4 CHECKS PASSED!');
