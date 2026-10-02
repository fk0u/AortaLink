// Self-check for Research Mode & SaMD Feature Gating (Issue #28). Run: npm run test:research
import assert from 'node:assert/strict';

// Mock localStorage for headless Node environment
const storage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v; },
  removeItem: (k: string) => { delete storage[k]; },
  clear: () => {
    for (const key in storage) delete storage[key];
  }
};

import {
  getAppReleaseMode,
  isResearchModeActive,
  activateResearchMode,
  withdrawResearchConsent,
  getResearchStudyId,
  getResearchConsentRecord,
  ALGORITHM_VERSIONS
} from '../src/services/config/release-mode.ts';

import {
  runClinicalMlAnalysis,
  isMlEngineAvailable,
  type ClinicalMlInput
} from '../src/services/ml/ml-engine.ts';

import {
  exportPseudonymizedFHIRBundle,
  exportPseudonymizedCSV
} from '../src/services/research/pseudonymized-exporter.ts';

import type { BPReading, Profile } from '../src/types/blood-pressure.ts';

console.log('[Research Selfcheck] Testing release mode & SaMD gating...');

// 1. Default state must be 'public' (non-alkes)
assert.equal(getAppReleaseMode(), 'public');
assert.equal(isResearchModeActive(), false);
assert.equal(isMlEngineAvailable(), false);
assert.equal(getResearchStudyId(), null);
console.log('✓ Default mode is strictly public (non-alkes)');

// 2. Core SaMD gating in Public Mode
const sampleInput: ClinicalMlInput = {
  profile: {
    id: 'p-1',
    name: 'Budi Santoso',
    avatar: '👨',
    relationship: 'self',
    targetSystolic: 120,
    targetDiastolic: 80,
    createdAt: '2026-01-01T00:00:00Z'
  },
  readings: [
    {
      id: 'r-1',
      profileId: 'p-1',
      systolic: 130,
      diastolic: 85,
      pulse: 72,
      timestamp: '2026-09-01T08:00:00Z',
      notes: 'Catatan rahasia: Pasien Budi Santoso email budi.santoso@klinik.id'
    },
    {
      id: 'r-2',
      profileId: 'p-1',
      systolic: 135,
      diastolic: 88,
      pulse: 75,
      timestamp: '2026-09-02T08:00:00Z'
    },
    {
      id: 'r-3',
      profileId: 'p-1',
      systolic: 128,
      diastolic: 82,
      pulse: 70,
      timestamp: '2026-09-03T08:00:00Z'
    }
  ],
  medications: [],
  medicationLogs: [],
  sodiumLogs: [],
  sleepLogs: [],
  labResults: []
};

assert.throws(
  () => runClinicalMlAnalysis(sampleInput),
  /Fitur SaMD Clinical ML hanya aktif pada Mode Riset\/Akademik/,
  'Calling runClinicalMlAnalysis in Public mode must throw gating error'
);
console.log('✓ SaMD core features throw gating error in public mode');

// 3. Activation validation
const invalidRes = activateResearchMode({ studyId: '  ', consentVersion: '1.0.0' });
assert.equal(invalidRes.success, false);
assert.equal(isResearchModeActive(), false);

const validRes = activateResearchMode({
  studyId: 'STUDY-CARDIO-2026',
  consentVersion: '1.0.0',
  participantPseudonym: 'PT-TEST-001',
  piOrInstitution: 'Lab Kardiologi UI'
});
assert.equal(validRes.success, true);
assert.equal(getAppReleaseMode(), 'research');
assert.equal(isResearchModeActive(), true);
assert.equal(isMlEngineAvailable(), true);
assert.equal(getResearchStudyId(), 'STUDY-CARDIO-2026');

const consentRecord = getResearchConsentRecord();
assert.ok(consentRecord);
assert.equal(consentRecord.participantPseudonym, 'PT-TEST-001');
assert.equal(consentRecord.withdrawnAt, null);
console.log('✓ Activation requires valid Study ID and signed consent');

// 4. SaMD feature works in Research mode
const report = runClinicalMlAnalysis(sampleInput);
assert.ok(report);
assert.equal(report.engineVersion, ALGORITHM_VERSIONS.engineVersion);
assert.equal(report.guideline, ALGORITHM_VERSIONS.guideline);
assert.ok(Array.isArray(report.insights));
console.log('✓ Clinical ML engine produces versioned outputs in research mode');

// 5. Pseudonymized dataset export (FHIR & CSV)
const sanitizedBundle = exportPseudonymizedFHIRBundle(sampleInput.readings, sampleInput.profile!);
assert.equal(sanitizedBundle.resourceType, 'Bundle');
const bundleString = JSON.stringify(sanitizedBundle);
assert.equal(bundleString.includes('Budi Santoso'), false, 'FHIR bundle must not contain real patient name');
assert.equal(bundleString.includes('budi.santoso@klinik.id'), false, 'FHIR bundle must not contain PII from notes');

const patientRes = sanitizedBundle.entry.find((e) => e.resource.resourceType === 'Patient')?.resource as any;
assert.ok(patientRes);
assert.equal(patientRes.name[0]?.text, 'PT-TEST-001', 'Real name must be replaced by pseudonym');
assert.equal(patientRes.telecom, undefined, 'Telecom must be stripped');
assert.equal(patientRes.birthDate, undefined, 'Birthdate must be stripped');

const observations = sanitizedBundle.entry.filter((e) => e.resource.resourceType === 'Observation');
assert.ok(observations.length > 0);
for (const obs of observations) {
  const o = obs.resource as any;
  assert.equal(o.note, undefined, 'Free-text observation note must be stripped');
  assert.equal(o.subject?.display, 'PT-TEST-001', 'Observation subject display must match pseudonym');
}

const csv = exportPseudonymizedCSV(sampleInput.readings);
assert.ok(csv.includes('study_id,participant_pseudonym,reading_id'));
assert.ok(csv.includes('algorithm_engine_version,guideline_version,app_version'));
assert.ok(csv.includes('STUDY-CARDIO-2026'));
assert.ok(csv.includes('PT-TEST-001'));
assert.equal(csv.includes('Budi Santoso'), false, 'Real name must not appear in exported CSV');
assert.equal(csv.includes('budi.santoso@klinik.id'), false, 'Free-text note PII must not appear in exported CSV');

// Formula injection test
const formulaInjectedCSV = exportPseudonymizedCSV(sampleInput.readings, {
  studyId: '=CMD|/C calc.exe',
  pseudonym: '+628123456789'
});
assert.ok(formulaInjectedCSV.includes("\"'=CMD|/C calc.exe\""), 'Excel formula injection prefix = must be neutralized');
assert.ok(formulaInjectedCSV.includes("\"'+628123456789\""), 'Excel formula injection prefix + must be neutralized');

console.log('✓ Pseudonymized export strips all PII from FHIR and CSV');

// 6. Withdrawal of consent
withdrawResearchConsent();
assert.equal(getAppReleaseMode(), 'public');
assert.equal(isResearchModeActive(), false);
assert.equal(isMlEngineAvailable(), false);
const withdrawnRecord = getResearchConsentRecord();
assert.ok(withdrawnRecord?.withdrawnAt);

assert.throws(
  () => runClinicalMlAnalysis(sampleInput),
  /Fitur SaMD Clinical ML hanya aktif pada Mode Riset\/Akademik/
);
console.log('✓ Withdrawal immediately re-locks SaMD features and resets to public');

console.log('[Research Selfcheck] All research-mode & SaMD gating tests passed successfully.');
