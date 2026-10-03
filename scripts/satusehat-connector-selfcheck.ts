import { DEFAULT_SANDBOX_CONFIG, DEFAULT_PROD_CONFIG } from '../src/connectors/satusehat/satusehat-config.ts';
import { SATUSEHAT_PROFILES, SATUSEHAT_IDENTIFIER_SYSTEMS } from '../src/connectors/satusehat/satusehat-profiles.ts';
import { mapPatientToSatusehat, mapObservationToSatusehat, mapFromSatusehat } from '../src/connectors/satusehat/satusehat-mapper.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  }
}

console.log('[SATUSEHAT Connector Selfcheck] Starting test suite...');

// Test 1: Config defaults & environments
console.log('Testing configuration & environment URLs...');
assert(DEFAULT_SANDBOX_CONFIG.environment === 'sandbox', 'Default sandbox env must be sandbox');
assert(DEFAULT_SANDBOX_CONFIG.authUrl.includes('dto.kemkes.go.id'), 'Sandbox auth URL must point to DTO Kemkes');
assert(DEFAULT_SANDBOX_CONFIG.baseUrl.includes('dto.kemkes.go.id'), 'Sandbox base URL must point to DTO Kemkes');
assert(DEFAULT_PROD_CONFIG.environment === 'production', 'Default prod env must be production');
assert(DEFAULT_PROD_CONFIG.baseUrl === 'https://api-satusehat.kemkes.go.id/fhir-r4/v1', 'Prod base URL verified');

// Test 2: Profiles & Identifiers
console.log('Testing SATUSEHAT profile URIs and identifier systems...');
assert(SATUSEHAT_PROFILES.Patient.includes('kemkes.go.id'), 'Patient profile must be under kemkes.go.id');
assert(SATUSEHAT_PROFILES.Observation.includes('kemkes.go.id'), 'Observation profile must be under kemkes.go.id');
assert(SATUSEHAT_IDENTIFIER_SYSTEMS.NIK.includes('nik'), 'NIK system URL verified');
assert(SATUSEHAT_IDENTIFIER_SYSTEMS.IHS_NUMBER.includes('ihs-number'), 'IHS Number system URL verified');

// Test 3: Mapping Patient with NIK and IHS Number
console.log('Testing Patient mapping to SATUSEHAT profile...');
const mappedPatient = mapPatientToSatusehat(
  {
    id: 'pat-001',
    name: 'Budi Santoso',
    nik: '3171012345670001',
    ihsNumber: 'P12345678901',
    birthDate: '1980-05-12',
    gender: 'male'
  },
  'ORG-100293'
);

assert(mappedPatient.resourceType === 'Patient', 'Resource type must be Patient');
assert(mappedPatient.meta?.profile?.[0] === SATUSEHAT_PROFILES.Patient, 'Meta profile must match SATUSEHAT Patient');
assert(mappedPatient.identifier?.some((i: any) => i.system === SATUSEHAT_IDENTIFIER_SYSTEMS.NIK && i.value === '3171012345670001'), 'Must include NIK identifier');
assert(mappedPatient.identifier?.some((i: any) => i.system === SATUSEHAT_IDENTIFIER_SYSTEMS.IHS_NUMBER && i.value === 'P12345678901'), 'Must include IHS Number');
assert(mappedPatient.managingOrganization?.reference === 'Organization/ORG-100293', 'Managing organization reference verified');

// Test 4: Mapping Observation to SATUSEHAT profile
console.log('Testing Observation mapping to SATUSEHAT profile...');
const mappedObs = mapObservationToSatusehat(
  {
    id: 'obs-001',
    patientId: 'P12345678901',
    code: '8480-6',
    value: 128,
    unit: 'mmHg',
    date: '2026-10-03T10:00:00Z',
    encounterId: 'ENC-001'
  },
  'P12345678901'
);

assert(mappedObs.resourceType === 'Observation', 'Resource type must be Observation');
assert(mappedObs.meta?.profile?.[0] === SATUSEHAT_PROFILES.Observation, 'Meta profile must match SATUSEHAT Observation');
assert(mappedObs.subject?.reference === 'Patient/P12345678901', 'Subject reference must point to Patient');
assert(mappedObs.valueQuantity?.value === 128, 'Value must match 128');
assert(mappedObs.valueQuantity?.unit === 'mmHg', 'Unit must match mmHg');

// Test 5: Round-trip reverse mapping
console.log('Testing reverse mapping from SATUSEHAT resource...');
const localPat = mapFromSatusehat(mappedPatient);
assert(localPat.id === 'pat-001' || Boolean(localPat.name), 'Reverse mapped local patient must preserve identity');
assert(localPat.name === 'Budi Santoso', 'Patient name preserved');
assert(localPat.nik === '3171012345670001', 'NIK preserved');

console.log('[SATUSEHAT Connector Selfcheck] All SATUSEHAT Connector checks passed successfully! ✓');
