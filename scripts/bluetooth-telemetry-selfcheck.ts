/**
 * AortaLink Bluetooth Telemetry & Fallback Selfcheck Suite (Issue #14)
 * -------------------------------------------------------------------
 * Validates IEEE 11073-20601 SFLOAT parser, measurement status flags,
 * kPa conversion, single-door input range validator, and tested device catalog.
 */

import assert from 'node:assert/strict';
import {
  decodeSFloat,
  kPaToMmHg,
  parseBPMeasurement,
  TESTED_BLE_DEVICES
} from '../src/services/bluetooth/ble-service.ts';
import { validateBPRange } from '../src/security/sanitizer.ts';

console.log('[BLE Selfcheck] Starting Bluetooth telemetry test suite...');

// ---------------------------------------------------------------------------
// 1. IEEE 11073-20601 SFLOAT Decoder Verification
// ---------------------------------------------------------------------------
function buildSFloatBuffer(mantissa12: number, exponent4: number): DataView {
  const buf = new ArrayBuffer(2);
  const view = new DataView(buf);
  const word = ((exponent4 & 0x0f) << 12) | (mantissa12 & 0x0fff);
  view.setUint16(0, word, true); // little-endian
  return view;
}

// 1.1 Valid SFLOAT values
const view120 = buildSFloatBuffer(120, 0);
assert.equal(decodeSFloat(view120, 0), 120, 'SFLOAT 120 * 10^0 should decode to 120');

const view80 = buildSFloatBuffer(80, 0);
assert.equal(decodeSFloat(view80, 0), 80, 'SFLOAT 80 * 10^0 should decode to 80');

// Exponent test: 1200 * 10^-1 = 120.0
const viewExpNeg1 = buildSFloatBuffer(1200, -1);
assert.equal(decodeSFloat(viewExpNeg1, 0), 120, 'SFLOAT 1200 * 10^-1 should decode to 120');

// 1.2 Rejection of IEEE 11073-20601 Special Values
assert.throws(
  () => decodeSFloat(buildSFloatBuffer(0x07ff, 0), 0),
  /NaN/,
  'SFLOAT 0x07FF must be rejected as NaN'
);

assert.throws(
  () => decodeSFloat(buildSFloatBuffer(0x0800, 0), 0),
  /NRes/,
  'SFLOAT 0x0800 must be rejected as NRes (Not at this resolution)'
);

assert.throws(
  () => decodeSFloat(buildSFloatBuffer(0x07fe, 0), 0),
  /\+INFINITY/,
  'SFLOAT 0x07FE must be rejected as +INFINITY'
);

assert.throws(
  () => decodeSFloat(buildSFloatBuffer(0x0802, 0), 0),
  /-INFINITY/,
  'SFLOAT 0x0802 must be rejected as -INFINITY'
);

assert.throws(
  () => decodeSFloat(buildSFloatBuffer(0x0801, 0), 0),
  /Reserved/,
  'SFLOAT 0x0801 must be rejected as Reserved'
);
console.log('✓ SFLOAT decoding and IEEE 11073 special value rejections verified');

// ---------------------------------------------------------------------------
// 2. Unit Conversion: kPa to mmHg
// ---------------------------------------------------------------------------
assert.equal(kPaToMmHg(16.0), 120, '16.0 kPa should convert to 120 mmHg');
assert.equal(kPaToMmHg(10.7), 80, '10.7 kPa should convert to 80 mmHg');
assert.equal(kPaToMmHg(0), 0, '0 kPa should convert to 0 mmHg');
console.log('✓ kPa to mmHg conversion verified');

// ---------------------------------------------------------------------------
// 3. GATT Blood Pressure Measurement Parser (parseBPMeasurement)
// ---------------------------------------------------------------------------

// 3.1 Standard mmHg packet with pulse and timestamp
// Flags byte = 0x06 (timestampPresent=1, pulsePresent=1, unit=mmHg)
function createStandardPacket(): DataView {
  const buf = new ArrayBuffer(19);
  const view = new DataView(buf);
  let offset = 0;

  // Flags: mmHg (bit 0 = 0), timestamp (bit 1 = 1), pulse (bit 2 = 1)
  view.setUint8(offset++, 0x06);

  // Systolic = 120
  view.setUint16(offset, 120, true);
  offset += 2;

  // Diastolic = 80
  view.setUint16(offset, 80, true);
  offset += 2;

  // MAP = 93.3 (rounded)
  view.setUint16(offset, 93, true);
  offset += 2;

  // Timestamp: 2026-10-02 14:30:15
  view.setUint16(offset, 2026, true);
  offset += 2;
  view.setUint8(offset++, 10); // Month (1-indexed in BLE)
  view.setUint8(offset++, 2);  // Day
  view.setUint8(offset++, 14); // Hours
  view.setUint8(offset++, 30); // Minutes
  view.setUint8(offset++, 15); // Seconds

  // Pulse = 72
  view.setUint16(offset, 72, true);
  offset += 2;

  return view;
}

const standardMeasurement = parseBPMeasurement(createStandardPacket());
assert.equal(standardMeasurement.systolic, 120);
assert.equal(standardMeasurement.diastolic, 80);
assert.equal(standardMeasurement.map, 93);
assert.equal(standardMeasurement.pulse, 72);
assert.equal(standardMeasurement.unit, 'mmHg');
assert.ok(standardMeasurement.timestamp instanceof Date);
assert.equal(standardMeasurement.timestamp?.getFullYear(), 2026);
assert.equal(standardMeasurement.isFlaggedMeasurement, false);
assert.equal(standardMeasurement.isExcludedFromAverages, false);
console.log('✓ Standard mmHg GATT measurement packet parsed cleanly');

// 3.2 Measurement Status Flags: body movement, cuff loose, improper position
// Flags byte = 0x14 (pulsePresent=1, measurementStatusPresent=1)
function createPacketWithStatus(statusWord: number): DataView {
  const buf = new ArrayBuffer(11);
  const view = new DataView(buf);
  let offset = 0;

  // Flags: bit 2 (pulse=1), bit 4 (status=1) -> 0x14
  view.setUint8(offset++, 0x14);

  // Systolic = 135
  view.setUint16(offset, 135, true);
  offset += 2;

  // Diastolic = 85
  view.setUint16(offset, 85, true);
  offset += 2;

  // MAP = 102
  view.setUint16(offset, 102, true);
  offset += 2;

  // Pulse = 68
  view.setUint16(offset, 68, true);
  offset += 2;

  // Status word (16-bit)
  view.setUint16(offset, statusWord, true);
  offset += 2;

  return view;
}

// Test Body Movement (bit 0 = 0x0001)
const movePacket = parseBPMeasurement(createPacketWithStatus(0x0001));
assert.equal(movePacket.measurementStatus?.bodyMovement, true);
assert.equal(movePacket.isFlaggedMeasurement, true);
assert.equal(movePacket.isExcludedFromAverages, true);

// Test Cuff Loose (bit 1 = 0x0002)
const cuffPacket = parseBPMeasurement(createPacketWithStatus(0x0002));
assert.equal(cuffPacket.measurementStatus?.cuffLoose, true);
assert.equal(cuffPacket.isFlaggedMeasurement, true);
assert.equal(cuffPacket.isExcludedFromAverages, true);

// Test Irregular Pulse (bit 2 = 0x0004) without movement
const arrhythmiaPacket = parseBPMeasurement(createPacketWithStatus(0x0004));
assert.equal(arrhythmiaPacket.measurementStatus?.irregularPulse, true);
assert.equal(arrhythmiaPacket.measurementStatus?.bodyMovement, false);
assert.equal(arrhythmiaPacket.isFlaggedMeasurement, false); // Irregular pulse alone is not discarded
assert.equal(arrhythmiaPacket.isExcludedFromAverages, false);

// Test Improper Position (bit 5 = 0x0020)
const positionPacket = parseBPMeasurement(createPacketWithStatus(0x0020));
assert.equal(positionPacket.measurementStatus?.improperPosition, true);
assert.equal(positionPacket.isFlaggedMeasurement, true);
assert.equal(positionPacket.isExcludedFromAverages, true);
console.log('✓ BLE measurement status flags & artifact exclusion verified');

// ---------------------------------------------------------------------------
// 4. Single-Door Physiological Range Validator (validateBPRange)
// ---------------------------------------------------------------------------

// 4.1 Valid cases
assert.equal(validateBPRange(120, 80, 72).valid, true);
assert.equal(validateBPRange(140, 90).valid, true); // pulse is optional
assert.equal(validateBPRange(40, 30, 30).valid, true); // bottom boundary
assert.equal(validateBPRange(300, 200, 250).valid, true); // top boundary

// 4.2 Inverted or Equal pressures (SBP <= DBP)
assert.equal(validateBPRange(120, 120).valid, false);
assert.match(validateBPRange(120, 120).error || '', /lebih tinggi/i);
assert.equal(validateBPRange(80, 120).valid, false);

// 4.3 Out of physiological bounds
assert.equal(validateBPRange(301, 80).valid, false);
assert.equal(validateBPRange(39, 30).valid, false);
assert.equal(validateBPRange(120, 201).valid, false);
assert.equal(validateBPRange(120, 29).valid, false);

// 4.4 Pulse bounds
assert.equal(validateBPRange(120, 80, 29).valid, false);
assert.equal(validateBPRange(120, 80, 251).valid, false);
assert.equal(validateBPRange(120, 80, NaN).valid, false);
assert.equal(validateBPRange(NaN, 80).valid, false);
assert.equal(validateBPRange(120, Infinity).valid, false);
console.log('✓ Single-door physiological range validator (validateBPRange) verified');

// ---------------------------------------------------------------------------
// 5. Tested BLE Device Catalog Verification
// ---------------------------------------------------------------------------
assert.ok(Array.isArray(TESTED_BLE_DEVICES));
assert.ok(TESTED_BLE_DEVICES.length >= 5);

const omron = TESTED_BLE_DEVICES.find((d) => d.brand === 'Omron');
assert.ok(omron);
assert.ok(omron.model.includes('HEM-7361T') || omron.model.includes('HEM-7156T'));

const beurer = TESTED_BLE_DEVICES.find((d) => d.brand === 'Beurer');
assert.ok(beurer);

const yuwell = TESTED_BLE_DEVICES.find((d) => d.brand === 'Yuwell');
assert.ok(yuwell);

const ad = TESTED_BLE_DEVICES.find((d) => d.brand === 'A&D Medical');
assert.ok(ad);

for (const device of TESTED_BLE_DEVICES) {
  assert.ok(device.brand, 'Device must have brand');
  assert.ok(device.model, 'Device must have model');
  assert.equal(device.standardGatt1810, true, 'Device must support standard GATT 0x1810');
  assert.ok(device.notes, 'Device must have documentation notes');
}
console.log(`✓ Tested BLE Device Catalog verified (${TESTED_BLE_DEVICES.length} verified models)`);

console.log('\n[BLE Selfcheck] ALL TESTS PASSED! Telemetry spec and validation fully operational.');
