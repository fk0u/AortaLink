import assert from 'node:assert/strict';
import {
  entitiesToFhirBundle,
  fhirBundleToEntities,
  anthropometryAndSocialHistoryFromFHIR,
  extractRefUuid,
  fhirTableAdapters,
  type ClinicalEntitiesSnapshot
} from '../src/services/fhir/fhir-contract-adapters.ts';
import type {
  Profile,
  BPReading,
  LabResult,
  MedicationItem,
  ConditionItem,
  FamilyMemberHistoryItem,
  ImmunizationItem,
  FhirObservation
} from '../src/types/blood-pressure.ts';

console.log('[FHIR Contract Selfcheck] Starting HL7 FHIR R4 Internal Data Contract verification...');

// ---------------------------------------------------------------------------
// 1. Reference UUID extractor tests
// ---------------------------------------------------------------------------
assert.equal(extractRefUuid('urn:uuid:550e8400-e29b-41d4-a716-446655440000'), '550e8400-e29b-41d4-a716-446655440000');
assert.equal(extractRefUuid('Patient/550e8400-e29b-41d4-a716-446655440000'), '550e8400-e29b-41d4-a716-446655440000');
assert.equal(extractRefUuid(undefined), null);
console.log('✓ extractRefUuid passed');

// ---------------------------------------------------------------------------
// 2. Sample Data Fixtures
// ---------------------------------------------------------------------------
const profileId = '550e8400-e29b-41d4-a716-446655440000';
const sampleProfile: Profile = {
  id: profileId,
  name: 'Budi Santoso',
  relationship: 'self',
  gender: 'male',
  age: 52,
  isDefault: true,
  createdAt: '2026-03-01T08:00:00.000Z',
  heightCm: 172,
  weightKg: 68,
  bmi: 23.0,
  smokingStatus: 'former',
  alcoholConsumption: 'occasional',
  screeningCompletedAt: '2026-03-01T08:00:00.000Z'
};

const sampleReading: BPReading = {
  id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  profileId,
  timestamp: '2026-03-01T09:00:00.000Z',
  systolic: 128,
  diastolic: 82,
  pulse: 72,
  arm: 'kiri',
  position: 'duduk',
  measurement_context: 'istirahat',
  notes: 'Pemeriksaan tensi pagi'
};

const sampleLab: LabResult = {
  id: 101,
  profileId,
  timestamp: '2026-03-01T09:30:00.000Z',
  totalCholesterol: 195,
  ldlCholesterol: 110,
  hdlCholesterol: 55,
  triglycerides: 140,
  fastingBloodSugar: 95,
  hba1c: 5.6,
  serumCreatinine: 1.0,
  bloodUrea: 28,
  uricAcid: 5.5
};

const sampleMed: MedicationItem = {
  id: 201,
  profileId,
  name: 'Amlodipine',
  dosage: '5mg',
  schedule: 'pagi',
  purpose: 'Kontrol tekanan darah',
  drugClass: 'Calcium Channel Blocker',
  createdAt: '2026-03-01T08:00:00.000Z'
};

const sampleCondition: ConditionItem = {
  id: 'cond-uuid-1111',
  profileId,
  code: 'Q87.4',
  snomedCode: '19346006',
  name: 'Sindrom Marfan',
  category: 'aorta_risk',
  recordedDate: '2026-03-01T08:00:00.000Z',
  clinicalStatus: 'active',
  verificationStatus: 'confirmed'
};

const sampleFamily: FamilyMemberHistoryItem = {
  id: 'fam-uuid-2222',
  profileId,
  relationship: 'FTH',
  relationshipDisplay: 'Ayah Kandung',
  conditionCode: 'I71.0',
  conditionName: 'Diseksi Aorta',
  snomedCode: '308540004',
  recordedDate: '2026-03-01T08:00:00.000Z'
};

const sampleImm: ImmunizationItem = {
  id: 'imm-uuid-3333',
  profileId,
  vaccineCode: 'FLU',
  vaccineName: 'Influenza Tahunan',
  cvxCode: '140',
  occurrenceDateTime: '2026-03-01T08:00:00.000Z',
  recordedDate: '2026-03-01T08:00:00.000Z',
  status: 'completed'
};

const snapshot: ClinicalEntitiesSnapshot = {
  profiles: [sampleProfile],
  readings: [sampleReading],
  labResults: [sampleLab],
  medications: [sampleMed],
  conditions: [sampleCondition],
  familyHistory: [sampleFamily],
  immunizations: [sampleImm]
};

// ---------------------------------------------------------------------------
// 3. Compile to FHIR R4 Bundle
// ---------------------------------------------------------------------------
const bundle = entitiesToFhirBundle(snapshot);
assert.equal(bundle.resourceType, 'Bundle');
assert.equal(bundle.type, 'collection');
assert.ok(bundle.entry.length >= 7, 'Bundle should contain at least 7 entries');

// Verify patient entry
const patientEntry = bundle.entry.find((e) => e.resource.resourceType === 'Patient');
assert.ok(patientEntry, 'Patient entry must exist');
assert.equal(patientEntry.resource.id, profileId);

// Verify BP observation
const bpEntry = bundle.entry.find((e) =>
  e.resource.resourceType === 'Observation' &&
  (e.resource as any).code?.coding?.[0]?.code === '85354-9'
);
assert.ok(bpEntry, 'BP Observation must exist');

// Verify Condition entry
const condEntry = bundle.entry.find((e) => e.resource.resourceType === 'Condition');
assert.ok(condEntry, 'Condition entry must exist');
assert.equal((condEntry.resource as any).code?.coding?.[0]?.code, 'Q87.4');

// Verify FamilyMemberHistory entry
const famEntry = bundle.entry.find((e) => e.resource.resourceType === 'FamilyMemberHistory');
assert.ok(famEntry, 'FamilyMemberHistory entry must exist');

// Verify Immunization entry
const immEntry = bundle.entry.find((e) => e.resource.resourceType === 'Immunization');
assert.ok(immEntry, 'Immunization entry must exist');
assert.equal((immEntry.resource as any).vaccineCode?.coding?.[0]?.code, 'FLU');
assert.equal((immEntry.resource as any).vaccineCode?.coding?.[1]?.code, '140');

console.log(`✓ entitiesToFhirBundle generated valid Bundle with ${bundle.entry.length} entries`);

// ---------------------------------------------------------------------------
// 4. Round-trip Decompile: fhirBundleToEntities
// ---------------------------------------------------------------------------
const restored = fhirBundleToEntities(bundle);
assert.equal(restored.profiles?.length, 1);
const rProf = restored.profiles![0];
assert.equal(rProf.id, profileId);
assert.equal(rProf.name, sampleProfile.name);
assert.equal(rProf.heightCm, sampleProfile.heightCm);
assert.equal(rProf.weightKg, sampleProfile.weightKg);
assert.equal(rProf.bmi, sampleProfile.bmi);
assert.equal(rProf.smokingStatus, sampleProfile.smokingStatus);
assert.equal(rProf.alcoholConsumption, sampleProfile.alcoholConsumption);
console.log('✓ Profile + Anthropometry + Social History round-trip passed');

assert.equal(restored.readings?.length, 1);
const rReading = restored.readings![0];
assert.equal(rReading.systolic, sampleReading.systolic);
assert.equal(rReading.diastolic, sampleReading.diastolic);
assert.equal(rReading.pulse, sampleReading.pulse);
assert.equal(rReading.profileId, profileId);
console.log('✓ BPReading round-trip passed');

assert.equal(restored.labResults?.length, 1);
const rLab = restored.labResults![0];
assert.equal(rLab.totalCholesterol, sampleLab.totalCholesterol);
assert.equal(rLab.serumCreatinine, sampleLab.serumCreatinine);
assert.equal(rLab.bloodUrea, sampleLab.bloodUrea);
assert.equal(rLab.uricAcid, sampleLab.uricAcid);
console.log('✓ LabResult round-trip passed');

assert.equal(restored.medications?.length, 1);
const rMed = restored.medications![0];
assert.equal(rMed.name, sampleMed.name);
assert.equal(rMed.dosage, sampleMed.dosage);
console.log('✓ MedicationItem round-trip passed');

assert.equal(restored.conditions?.length, 1);
const rCond = restored.conditions![0];
assert.equal(rCond.code, sampleCondition.code);
assert.equal(rCond.category, sampleCondition.category);
console.log('✓ ConditionItem round-trip passed');

assert.equal(restored.familyHistory?.length, 1);
const rFam = restored.familyHistory![0];
assert.equal(rFam.relationship, sampleFamily.relationship);
assert.equal(rFam.conditionCode, sampleFamily.conditionCode);
console.log('✓ FamilyMemberHistoryItem round-trip passed');

assert.equal(restored.immunizations?.length, 1);
const rImm = restored.immunizations![0];
assert.equal(rImm.vaccineCode, sampleImm.vaccineCode);
assert.equal(rImm.cvxCode, sampleImm.cvxCode);
console.log('✓ ImmunizationItem round-trip passed');

// ---------------------------------------------------------------------------
// 5. Test direct fhirTableAdapters
// ---------------------------------------------------------------------------
assert.ok(fhirTableAdapters.profiles);
assert.ok(fhirTableAdapters.readings);
assert.ok(fhirTableAdapters.labResults);
assert.ok(fhirTableAdapters.medications);
assert.ok(fhirTableAdapters.conditions);
assert.ok(fhirTableAdapters.familyHistory);
assert.ok(fhirTableAdapters.immunizations);
console.log('✓ fhirTableAdapters registry verified');

// ---------------------------------------------------------------------------
// 6. HL7 FHIR Validator / HAPI Cloud Test
// ---------------------------------------------------------------------------
async function validateWithHapi(bundleResource: any) {
  const endpoint = 'https://hapi.fhir.org/baseR4/Bundle/$validate';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/fhir+json',
        Accept: 'application/fhir+json'
      },
      body: JSON.stringify(bundleResource),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[FHIR Validator Warning] HAPI server returned HTTP ${res.status}; skipping remote check.`);
      return;
    }

    const outcome = await res.json();
    const errors = (outcome.issue || []).filter((issue: any) => issue.severity === 'error');

    if (errors.length > 0) {
      console.error('[FHIR Validator FAILED] Errors returned by HAPI FHIR Validator:');
      console.error(JSON.stringify(errors, null, 2));
      throw new Error(`HL7 FHIR Validation failed with ${errors.length} error(s).`);
    }

    console.log(`✓ HL7 FHIR Official Validator ($validate): 0 errors detected (valid FHIR R4 Bundle)`);
  } catch (err: any) {
    if (err.name === 'AbortError' || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      console.warn(`[FHIR Validator Warning] Remote validator unreachable (${err.message}); offline checks verified.`);
      return;
    }
    throw err;
  }
}

await validateWithHapi(bundle);

console.log('\n[FHIR Contract Selfcheck] ALL FHIR R4 CONTRACT TESTS PASSED SUCCESSFULLY!');
