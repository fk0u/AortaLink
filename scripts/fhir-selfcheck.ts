// HL7 FHIR R4 validation & round-trip selfcheck (audit P1-7, P1-8, issue #11).
// Run: node --experimental-strip-types scripts/fhir-selfcheck.ts

import assert from 'node:assert/strict';
import {
  convertReadingToFHIR,
  convertLabResultToFHIR,
  convertMedicationToFHIR,
  convertProfileToFHIR,
  exportReadingsToFHIRBundle,
  readingFromFHIR,
  labResultFromFHIR,
  medicationFromFHIR,
  profileFromFHIR,
  isUuid,
  toValidUuid
} from '../src/services/fhir/fhir-exporter.ts';
import type { BPReading, Profile, LabResult, MedicationItem } from '../src/types/blood-pressure.ts';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

console.log('[FHIR Selfcheck] Starting HL7 FHIR R4 compliance & round-trip tests...');

// ---------------------------------------------------------------------------
// 1. UUID deterministic mapping tests
// ---------------------------------------------------------------------------
const validUuid = 'c028e3b5-31a4-4a46-88d4-f6b0f1e1cb01';
assert.equal(isUuid(validUuid), true);
assert.equal(isUuid('not-a-uuid'), false);
assert.equal(isUuid(42), false);
assert.equal(toValidUuid(validUuid), validUuid);
assert.match(toValidUuid(42), UUID_REGEX);
assert.match(toValidUuid('prof-1'), UUID_REGEX);
assert.equal(toValidUuid('prof-1'), toValidUuid('prof-1'), 'Deterministic mapping must be repeatable');

// ---------------------------------------------------------------------------
// 2. Round-trip Tests: BPReading <-> FhirObservation
// ---------------------------------------------------------------------------
const sampleProfile: Profile = {
  id: '3f6e1f02-0c3f-42e8-9bc7-6ecbcfcb1100',
  name: 'Ahmad Dahlan',
  gender: 'male',
  avatar: '👨',
  relationship: 'self',
  age: 45,
  targetSystolic: 120,
  targetDiastolic: 80,
  createdAt: '2026-01-01T00:00:00Z'
};

const sampleReading: BPReading = {
  id: '9b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
  profileId: sampleProfile.id,
  systolic: 135,
  diastolic: 85,
  pulse: 74,
  timestamp: '2026-10-02T08:30:00.000Z',
  notes: 'Pengukuran pagi sebelum sarapan',
  measurement_context: 'Home'
};

const fhirObs = convertReadingToFHIR(sampleReading, sampleProfile);

// P1-8 checks on Observation
assert.equal('profileId' in fhirObs, false, 'Standard FHIR Observation must not have profileId');
assert.equal(Array.isArray(fhirObs.extension), true);
assert.ok(fhirObs.extension!.length > 0, 'extension must not be empty array');
assert.deepEqual(fhirObs.meta?.profile, ['http://hl7.org/fhir/StructureDefinition/bp']);
assert.match(fhirObs.id!, UUID_REGEX);
assert.equal(fhirObs.subject.reference, `urn:uuid:${sampleProfile.id}`);

// Round-trip fromFHIR
const restoredReading = readingFromFHIR(fhirObs);
assert.equal(restoredReading.id, sampleReading.id);
assert.equal(restoredReading.profileId, sampleReading.profileId);
assert.equal(restoredReading.systolic, sampleReading.systolic);
assert.equal(restoredReading.diastolic, sampleReading.diastolic);
assert.equal(restoredReading.pulse, sampleReading.pulse);
assert.equal(restoredReading.timestamp, sampleReading.timestamp);
assert.equal(restoredReading.notes, sampleReading.notes);
assert.equal(restoredReading.measurement_context, sampleReading.measurement_context);
console.log('✓ BPReading <-> FhirObservation round-trip passed');

// Reading without measurement_context must NOT emit extension property
const readingNoExt: BPReading = {
  id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  profileId: sampleProfile.id,
  systolic: 120,
  diastolic: 80,
  pulse: 70,
  timestamp: '2026-10-02T12:00:00.000Z'
};
const fhirNoExt = convertReadingToFHIR(readingNoExt);
assert.equal('extension' in fhirNoExt, false, 'Empty extension array must be omitted');
console.log('✓ Omit empty extension: [] check passed');

// ---------------------------------------------------------------------------
// 3. Round-trip Tests: LabResult <-> FhirObservation (LOINC P1-7)
// ---------------------------------------------------------------------------
const sampleLab: LabResult = {
  id: 101,
  profileId: sampleProfile.id,
  timestamp: '2026-09-15T09:00:00.000Z',
  bloodUrea: 32.5,
  serumCreatinine: 1.1,
  uricAcid: 6.4
};

const fhirLabs = convertLabResultToFHIR(sampleLab, sampleProfile);
assert.equal(fhirLabs.length, 3);

// Verify LOINC codes & lack of profileId
const ureaObs = fhirLabs.find((o) => o.code.coding?.[0]?.code === '3091-6');
assert.ok(ureaObs, 'LOINC 3091-6 for Urea [Mass/volume] in Serum or Plasma must be present');
assert.equal('profileId' in ureaObs!, false, 'Lab observation must not contain profileId');
assert.equal(ureaObs!.valueQuantity?.value, 32.5);
assert.equal(ureaObs!.valueQuantity?.unit, 'mg/dL');

const creatObs = fhirLabs.find((o) => o.code.coding?.[0]?.code === '2160-0');
assert.ok(creatObs, 'LOINC 2160-0 for Creatinine must be present');

const uricObs = fhirLabs.find((o) => o.code.coding?.[0]?.code === '3084-1');
assert.ok(uricObs, 'LOINC 3084-1 for Urate (Serum or Plasma) must be present');

const restoredLab = labResultFromFHIR(fhirLabs);
assert.equal(restoredLab.bloodUrea, sampleLab.bloodUrea);
assert.equal(restoredLab.serumCreatinine, sampleLab.serumCreatinine);
assert.equal(restoredLab.uricAcid, sampleLab.uricAcid);
console.log('✓ LabResult <-> FhirObservation round-trip & LOINC codes passed');

// ---------------------------------------------------------------------------
// 4. Round-trip Tests: MedicationItem <-> FhirMedicationRequest (RxNorm P1-8)
// ---------------------------------------------------------------------------
const amlodipineMed: MedicationItem = {
  id: 1,
  profileId: sampleProfile.id,
  name: 'Amlodipine',
  dosage: '5mg',
  schedule: 'malam',
  purpose: 'Kontrol tekanan darah',
  drugClass: 'CCB',
  createdAt: '2026-01-01T00:00:00Z'
};

const customMed: MedicationItem = {
  id: 2,
  profileId: sampleProfile.id,
  name: 'Herbal Tensipro',
  dosage: '2 kapsul',
  schedule: 'sesuai_kebutuhan',
  purpose: 'Suplemen mandiri',
  drugClass: 'Herbal',
  createdAt: '2026-01-01T00:00:00Z'
};

const amloReq = convertMedicationToFHIR(amlodipineMed, sampleProfile);
assert.equal('profileId' in amloReq, false);
assert.equal(amloReq.medicationCodeableConcept.coding?.[0]?.code, '17767');
assert.equal(amloReq.medicationCodeableConcept.coding?.[0]?.system, 'http://www.nlm.nih.gov/research/umls/rxnorm');

const customReq = convertMedicationToFHIR(customMed, sampleProfile);
assert.equal('profileId' in customReq, false);
// Custom meds must have NO fake RxNorm coding!
assert.equal(customReq.medicationCodeableConcept.coding, undefined, 'Custom med must not have fake RxNorm coding');
assert.ok(customReq.medicationCodeableConcept.text?.includes('Herbal Tensipro'));

const restoredAmlo = medicationFromFHIR(amloReq);
assert.equal(restoredAmlo.name, 'Amlodipine');
assert.equal(restoredAmlo.dosage, '5mg');
assert.equal(restoredAmlo.schedule, 'malam');
console.log('✓ MedicationItem <-> FhirMedicationRequest round-trip passed');

// ---------------------------------------------------------------------------
// 5. Round-trip Tests: Profile <-> FhirPatient
// ---------------------------------------------------------------------------
const fhirPatient = convertProfileToFHIR(sampleProfile);
assert.equal(fhirPatient.resourceType, 'Patient');
assert.equal(fhirPatient.id, sampleProfile.id);
assert.equal(fhirPatient.name[0]?.text, sampleProfile.name);
assert.equal(fhirPatient.gender, 'male');

const restoredProfile = profileFromFHIR(fhirPatient);
assert.equal(restoredProfile.id, sampleProfile.id);
assert.equal(restoredProfile.name, sampleProfile.name);
assert.equal(restoredProfile.gender, sampleProfile.gender);
console.log('✓ Profile <-> FhirPatient round-trip passed');

// ---------------------------------------------------------------------------
// 6. Bundle Generation & fullUrl UUID Verification
// ---------------------------------------------------------------------------
const bundle = exportReadingsToFHIRBundle([sampleReading, readingNoExt], sampleProfile);
assert.equal(bundle.resourceType, 'Bundle');
assert.equal(bundle.type, 'collection');
assert.equal(bundle.entry.length, 3, 'Bundle should contain Patient + 2 Observations');

// First entry is Patient
assert.equal(bundle.entry[0].resource.resourceType, 'Patient');
assert.ok(bundle.entry[0].fullUrl.startsWith('urn:uuid:'));
const patientUuid = bundle.entry[0].fullUrl.replace('urn:uuid:', '');
assert.match(patientUuid, UUID_REGEX);

// Subsequent entries are Observations pointing to the Patient
for (let i = 1; i < bundle.entry.length; i++) {
  const entry = bundle.entry[i];
  assert.equal(entry.resource.resourceType, 'Observation');
  assert.ok(entry.fullUrl.startsWith('urn:uuid:'));
  const obsUuid = entry.fullUrl.replace('urn:uuid:', '');
  assert.match(obsUuid, UUID_REGEX);
  const obs = entry.resource as any;
  assert.equal(obs.subject.reference, `urn:uuid:${patientUuid}`);
}
console.log('✓ Bundle generation & fullUrl RFC 4122 compliance passed');

// ---------------------------------------------------------------------------
// 7. HL7 FHIR Validator / HAPI Cloud Test
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
    } else {
      throw err;
    }
  }
}

await validateWithHapi(bundle);
console.log('\n[FHIR Selfcheck] All HL7 FHIR R4 checks passed successfully.');
