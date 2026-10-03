import {
  classifyBP,
  calculateMAP,
  calculatePulsePressure,
  calculateAscvdRisk,
  calculateAortaLinkHealthScore,
  evaluateRedFlags,
  evaluateBPRouting,
  decodeSFloat,
  parseBPMeasurement,
  entitiesToFhirBundle,
  fhirBundleToEntities
} from '../src/core/index.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  }
}

console.log('[Core Minimum Test Suite] Starting core engine verification...');

// 1. classifyBP verification (pure TypeScript)
console.log('1. Testing classifyBP...');
const eshClass = classifyBP(142, 92, 'esh_perhi');
assert(eshClass.key === 'stage1', '142/92 must be Grade 1 under ESH/PERHI');
const accClass = classifyBP(132, 82, 'acc_aha_2025');
assert(accClass.key === 'stage1', '132/82 must be Stage 1 under ACC/AHA 2025');
const escClass = classifyBP(125, 75, 'esc_2024');
assert(escClass.key === 'elevated', '125/75 must be Elevated BP under ESC 2024');

// 2. 10-year risk assessment (ASCVD)
console.log('2. Testing ASCVD risk calculator...');
const ascvd = calculateAscvdRisk({
  age: 55,
  gender: 'male',
  race: 'other',
  totalCholesterol: 210,
  hdlCholesterol: 45,
  systolicBP: 140,
  onBPTreatment: true,
  diabetes: false,
  smoker: false
});
assert(ascvd.riskPercent > 0, 'Risk percent must be greater than 0');
assert(Boolean(ascvd.riskLevel), 'Must return a risk level');

// 3. Health Score calculation (Life's Essential 8)
console.log('3. Testing Health Score LE8...');
const healthScore = calculateAortaLinkHealthScore({
  profile: {
    id: 'test-p1',
    name: 'Budi Test',
    relationship: 'self',
    avatar: 'user',
    targetSystolic: 120,
    targetDiastolic: 80,
    createdAt: '2026-01-01T00:00:00Z',
    bmi: 22.4,
    smokingStatus: 'never'
  },
  readings: [
    {
      id: 'r1',
      profileId: 'test-p1',
      systolic: 115,
      diastolic: 75,
      pulse: 70,
      timestamp: '2026-10-02T08:00:00Z'
    }
  ],
  medications: [],
  medicationLogs: [],
  labResults: [
    {
      id: 1,
      profileId: 'test-p1',
      timestamp: '2026-10-01T08:00:00Z',
      bloodUrea: 25,
      serumCreatinine: 0.9,
      uricAcid: 5.0,
      totalCholesterol: 170,
      hdlCholesterol: 55,
      hba1c: 5.4
    }
  ],
  sodiumLogs: [
    { id: 1, profileId: 'test-p1', date: '2026-10-01', sodiumMg: 1400 }
  ],
  sleepLogs: [
    { id: 1, profileId: 'test-p1', date: '2026-10-01', sleepHours: 8 }
  ],
  habits: [
    { id: 1, profileId: 'test-p1', date: '2026-10-01', sleepTime: '22:00', wakeTime: '06:00', sleepHours: 8, screenTimeHours: 1, outdoorMinutes: 60, timestamp: '2026-10-01T08:00:00Z' }
  ]
});
assert(healthScore.status === 'complete', 'Health score must be complete with full input');
assert(healthScore.totalScore !== null && healthScore.totalScore >= 80, 'Score with ideal metrics must be high (>=80)');

// 4. Care Routing & Red Flag triage
console.log('4. Testing Care Routing...');
const redFlag = evaluateRedFlags(['chest_back_pain']);
assert(redFlag?.level === 'EMERGENCY', 'Tearing chest/back pain must be EMERGENCY');
const bpRouting = evaluateBPRouting(185, 120, false);
assert(bpRouting.level === 'URGENT', '185/120 without symptoms must be URGENT');

// 5. Bluetooth IEEE-11073 SFLOAT Decoder
console.log('5. Testing decodeSFloat (IEEE-11073)...');
const sampleBuffer = new Uint8Array([0x00, 0x78, 0x00, 0x50, 0x00, 0x46, 0x00]);
const parsedGatt = parseBPMeasurement(new DataView(sampleBuffer.buffer));
assert(parsedGatt !== null, 'Valid SFLOAT buffer must parse');
assert(parsedGatt.systolic === 120, 'Parsed systolic must be 120');
assert(parsedGatt.diastolic === 80, 'Parsed diastolic must be 80');

// Special values check: NaN / Infinity must be safely rejected with errors
let threwOnNan = false;
try {
  const nanView = new DataView(new Uint8Array([0xFF, 0x07]).buffer);
  decodeSFloat(nanView, 0);
} catch {
  threwOnNan = true;
}
assert(threwOnNan, '0x07FF must be rejected as NaN error');

// 6. Round-trip FHIR R4 Bundle mapping
console.log('6. Testing FHIR R4 round-trip contract in core...');
const sampleProfile = {
  id: 'pat-test-01',
  name: 'Budi Test',
  relationship: 'self' as const,
  avatar: 'user',
  targetSystolic: 120,
  targetDiastolic: 80,
  createdAt: '2026-10-01T00:00:00Z',
  isDefault: true
};
const sampleReading = {
  id: 'rd-test-01',
  profileId: 'pat-test-01',
  systolic: 122,
  diastolic: 82,
  pulse: 72,
  timestamp: '2026-10-02T10:00:00Z'
};

const bundle = entitiesToFhirBundle({
  profiles: [sampleProfile],
  readings: [sampleReading]
});

assert(bundle.resourceType === 'Bundle', 'Must produce a valid FHIR Bundle');
assert(bundle.entry.length >= 2, 'Bundle must contain Patient and Observation entries');

const restored = fhirBundleToEntities(bundle);
assert(restored.profiles.length === 1, 'Restored profiles must match');
assert(restored.readings.length === 1, 'Restored readings must match');
assert(restored.readings[0].systolic === 122, 'Systolic reading preserved');

console.log('[Core Minimum Test Suite] ALL CORE TESTS PASSED SUCCESSFULLY! ✓');
