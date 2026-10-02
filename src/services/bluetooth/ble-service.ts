/**
 * AortaLink Bluetooth LE Service
 *
 * Implements Web Bluetooth API integration for auto-pairing with
 * digital blood pressure monitors (Omron, Beurer, etc.) via the
 * standard Blood Pressure GATT profile.
 *
 * BLE GATT Profile:
 * - Blood Pressure Service UUID: 0x1810
 * - Blood Pressure Measurement Characteristic UUID: 0x2A35
 *
 * IEEE 11073-20601 Blood Pressure Measurement Data Format:
 * - Flags (1 byte)
 *   - bit 0: Unit (0 = mmHg, 1 = kPa)
 *   - bit 1: Timestamp present
 *   - bit 2: Pulse rate present
 *   - bit 3: User ID present
 *   - bit 4: Measurement status present
 * - SFLOAT systolic (2 bytes) — always present
 * - SFLOAT diastolic (2 bytes) — always present
 * - SFLOAT MAP (2 bytes) — always present
 * - Optional timestamp (7 bytes): year[2], month[1], day[1], hours[1], min[1], sec[1]
 * - Optional pulse (2 bytes)
 * - Optional user ID (1 byte)
 * - Optional measurement status (2 bytes)
 *
 * SFLOAT encoding: 16-bit float (4-bit signed exponent, 12-bit signed mantissa)
 * value = mantissa × 10^exponent
 */

import { db, newSyncId } from '../../db/index.ts';
import type {
  BPReading,
  BodyPosition,
  ArmUsed,
  MeasurementContext,
  BleMeasurementStatus
} from '../../types/blood-pressure.ts';
import { validateBPRange } from '../../security/sanitizer.ts';

// ---------------------------------------------------------------------------
// BLE UUIDs
// ---------------------------------------------------------------------------
export const BLOOD_PRESSURE_SERVICE_UUID = 0x1810;
export const BP_MEASUREMENT_CHAR_UUID = 0x2A35;
export const BP_FEATURE_CHAR_UUID = 0x2A36;

// ---------------------------------------------------------------------------
// Tested Devices Registry (GATT 0x1810 standard compliance)
// ---------------------------------------------------------------------------
export interface TestedBLEDevice {
  brand: string;
  model: string;
  standardGatt1810: boolean;
  notes: string;
}

export const TESTED_BLE_DEVICES: TestedBLEDevice[] = [
  {
    brand: 'Omron',
    model: 'HEM-7361T / HEM-7156T',
    standardGatt1810: true,
    notes: 'Mendukung standar Bluetooth GATT 0x1810 / 0x2A35.'
  },
  {
    brand: 'Omron',
    model: 'HEM-7600T (Evolv)',
    standardGatt1810: true,
    notes: 'Desain tubeless tanpa selang, standard GATT 0x1810.'
  },
  {
    brand: 'Beurer',
    model: 'BM 57 / BM 85',
    standardGatt1810: true,
    notes: 'Koneksi Bluetooth Smart standar IEEE 11073-20601.'
  },
  {
    brand: 'Yuwell',
    model: 'YE680B',
    standardGatt1810: true,
    notes: 'GATT Blood Pressure Service 0x1810 terverifikasi.'
  },
  {
    brand: 'A&D Medical',
    model: 'UA-651BLE',
    standardGatt1810: true,
    notes: 'Kompatibilitas penuh profil GATT Blood Pressure standar.'
  }
];

// ---------------------------------------------------------------------------
// Connection / pairing state
// ---------------------------------------------------------------------------
export type BLEConnectionState =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'reading'
  | 'done'
  | 'error';

export interface BLEStateChangeCallback {
  (state: BLEConnectionState, message?: string): void;
}

export interface BLEPairingOptions {
  position?: BodyPosition;
  arm?: ArmUsed;
  measurementContext?: MeasurementContext;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Parsed measurement result
// ---------------------------------------------------------------------------
export interface ParsedBPMeasurement {
  systolic: number;
  diastolic: number;
  map: number; // Mean Arterial Pressure
  pulse?: number;
  timestamp?: Date;
  unit: 'mmHg' | 'kPa';
  userId?: number;
  measurementStatus?: BleMeasurementStatus;
  isFlaggedMeasurement?: boolean;
  isExcludedFromAverages?: boolean;
}

// ---------------------------------------------------------------------------
// IEEE 11073-20601 SFLOAT decoder
// ---------------------------------------------------------------------------

/**
 * Decode a 16-bit SFLOAT (IEEE 11073-20601) from two bytes.
 * Format: 4-bit signed exponent (bits 12-15) + 12-bit signed mantissa (bits 0-11).
 *
 * Rejects IEEE 11073-20601 special values:
 * - 0x07FF: NaN (Not a Number)
 * - 0x0800: NRes (Not at this Resolution)
 * - 0x07FE: +INFINITY
 * - 0x0802: -INFINITY
 * - 0x0801: Reserved
 */
export function decodeSFloat(dataView: DataView, offset: number): number {
  const word = dataView.getUint16(offset, true); // little-endian
  const rawMantissa = word & 0x0fff;

  if (rawMantissa === 0x07ff) {
    throw new Error('SFLOAT decode error: NaN (Not a Number, 0x07FF)');
  }
  if (rawMantissa === 0x0800) {
    throw new Error('SFLOAT decode error: NRes (Not at this Resolution, 0x0800)');
  }
  if (rawMantissa === 0x07fe) {
    throw new Error('SFLOAT decode error: +INFINITY (0x07FE)');
  }
  if (rawMantissa === 0x0802) {
    throw new Error('SFLOAT decode error: -INFINITY (0x0802)');
  }
  if (rawMantissa === 0x0801) {
    throw new Error('SFLOAT decode error: Reserved (0x0801)');
  }

  const mantissa = (rawMantissa << 20) >> 20; // sign-extend 12-bit mantissa
  const exponent = (word >> 12) << 28 >> 28;  // sign-extend 4-bit exponent
  return mantissa * Math.pow(10, exponent);
}

// ---------------------------------------------------------------------------
// Flags parsing
// ---------------------------------------------------------------------------

interface MeasurementFlags {
  unit: 'mmHg' | 'kPa';
  timestampPresent: boolean;
  pulsePresent: boolean;
  userIdPresent: boolean;
  measurementStatusPresent: boolean;
}

function parseFlags(flagsByte: number): MeasurementFlags {
  return {
    unit: (flagsByte & 0x01) ? 'kPa' : 'mmHg',
    timestampPresent: !!(flagsByte & 0x02),
    pulsePresent: !!(flagsByte & 0x04),
    userIdPresent: !!(flagsByte & 0x08),
    measurementStatusPresent: !!(flagsByte & 0x10),
  };
}

// ---------------------------------------------------------------------------
// Convert kPa to mmHg
// ---------------------------------------------------------------------------
export function kPaToMmHg(kPa: number): number {
  return Math.round(kPa * 7.50062);
}

// ---------------------------------------------------------------------------
// BP Measurement parser
// ---------------------------------------------------------------------------

/**
 * Parse a raw Blood Pressure Measurement characteristic value
 * according to IEEE 11073-20601.
 */
export function parseBPMeasurement(data: DataView): ParsedBPMeasurement {
  const flags = parseFlags(data.getUint8(0));
  let offset = 1;

  const rawSys = decodeSFloat(data, offset);
  offset += 2;

  const rawDia = decodeSFloat(data, offset);
  offset += 2;

  const rawMap = decodeSFloat(data, offset);
  offset += 2;

  const isKpa = flags.unit === 'kPa';
  const systolic = isKpa ? kPaToMmHg(rawSys) : Math.round(rawSys);
  const diastolic = isKpa ? kPaToMmHg(rawDia) : Math.round(rawDia);
  const map = isKpa ? kPaToMmHg(rawMap) : Math.round(rawMap * 10) / 10;

  let timestamp: Date | undefined;
  if (flags.timestampPresent && offset + 7 <= data.byteLength) {
    const year = data.getUint16(offset, true);
    const month = data.getUint8(offset + 2) - 1; // JS Date months are 0-indexed
    const day = data.getUint8(offset + 3);
    const hours = data.getUint8(offset + 4);
    const minutes = data.getUint8(offset + 5);
    const seconds = data.getUint8(offset + 6);
    timestamp = new Date(year, month, day, hours, minutes, seconds);
    offset += 7;
  } else {
    timestamp = new Date(); // fall back to now if device doesn't provide
  }

  let pulse: number | undefined;
  if (flags.pulsePresent && offset + 2 <= data.byteLength) {
    const rawPulse = decodeSFloat(data, offset);
    const roundedPulse = Math.round(rawPulse);
    pulse = roundedPulse > 0 ? roundedPulse : undefined;
    offset += 2;
  }

  let userId: number | undefined;
  if (flags.userIdPresent && offset + 1 <= data.byteLength) {
    userId = data.getUint8(offset);
    offset += 1;
  }

  let measurementStatus: BleMeasurementStatus | undefined;
  let isFlaggedMeasurement = false;
  let isExcludedFromAverages = false;

  if (flags.measurementStatusPresent && offset + 2 <= data.byteLength) {
    const statusWord = data.getUint16(offset, true);
    offset += 2;
    const bodyMovement = !!(statusWord & 0x0001);
    const cuffLoose = !!(statusWord & 0x0002);
    const irregularPulse = !!(statusWord & 0x0004);
    const pulseRateFlag = (statusWord >> 3) & 0x0003;
    const improperPosition = !!(statusWord & 0x0020);

    measurementStatus = {
      bodyMovement,
      cuffLoose,
      irregularPulse,
      pulseRangeExceeded: pulseRateFlag === 1 ? 'upper' : pulseRateFlag === 2 ? 'lower' : undefined,
      improperPosition
    };

    if (bodyMovement || cuffLoose || improperPosition) {
      isFlaggedMeasurement = true;
      isExcludedFromAverages = true;
    }
  }

  return {
    systolic,
    diastolic,
    map,
    pulse,
    timestamp,
    unit: flags.unit,
    userId,
    measurementStatus,
    isFlaggedMeasurement,
    isExcludedFromAverages
  };
}

// ---------------------------------------------------------------------------
// Main BLE pairing & reading flow
// ---------------------------------------------------------------------------

let activeDevice: BluetoothDevice | null = null;
let activeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

/**
 * Check whether the Web Bluetooth API is available in the current browser.
 */
export function isBluetoothAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Scan for, connect to, and read a measurement from a BLE BP monitor.
 *
 * @param profileId - The profile to associate readings with
 * @param onStateChange - Callback for UI state updates
 * @returns The parsed BP reading (already stored in Dexie)
 */
export async function scanAndReadBP(
  profileId: string,
  onStateChange: BLEStateChangeCallback,
  options?: BLEPairingOptions
): Promise<BPReading> {
  if (!isBluetoothAvailable()) {
    const msg = 'Browser tidak mendukung Web Bluetooth. Gunakan Chrome/Edge di desktop atau Android.';
    onStateChange('error', msg);
    throw new Error(msg);
  }

  // -- SCANNING --
  onStateChange('scanning', 'Memindai tensimeter digital...');

  let device: BluetoothDevice;
  try {
    device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [BLOOD_PRESSURE_SERVICE_UUID] },
      ],
      optionalServices: [BLOOD_PRESSURE_SERVICE_UUID],
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      const msg = 'Tidak ada tensimeter ditemukan. Pastikan perangkat menyala dan dalam mode pairing.';
      onStateChange('error', msg);
      throw new Error(msg);
    }
    const msg = 'Pemindaian dibatalkan atau gagal. Silakan coba lagi.';
    onStateChange('error', msg);
    throw new Error(msg);
  }

  activeDevice = device;

  // Listen for unexpected disconnects
  device.addEventListener('gattserverdisconnected', () => {
    onStateChange('error', 'Koneksi ke tensimeter terputus. Silakan coba lagi.');
    cleanup();
  });

  // -- CONNECTING --
  onStateChange('connecting', `Menghubungkan ke ${device.name || 'tensimeter'}...`);

  let server: BluetoothRemoteGATTServer;
  try {
    server = await device.gatt!.connect();
  } catch {
    const msg = 'Gagal menghubungkan ke perangkat. Pastikan tensimeter dalam jangkauan.';
    onStateChange('error', msg);
    throw new Error(msg);
  }

  // -- READING --
  onStateChange('reading', 'Membaca data tekanan darah...');

  let service: BluetoothRemoteGATTService;
  let characteristic: BluetoothRemoteGATTCharacteristic;
  let dataView: DataView;

  try {
    service = await server.getPrimaryService(BLOOD_PRESSURE_SERVICE_UUID);
    characteristic = await service.getCharacteristic(BP_MEASUREMENT_CHAR_UUID);

    activeCharacteristic = characteristic;

    // Try to start notifications to get the latest reading
    // If the device supports indications, we'll get a value via characteristicvaluechanged
    if (characteristic.properties.indicate || characteristic.properties.notify) {
      dataView = await new Promise<DataView>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Waktu tunggu habis. Perangkat tidak mengirim data.'));
        }, 15000);

        const listener = (event: Event) => {
          clearTimeout(timeout);
          const target = event.target as BluetoothRemoteGATTCharacteristic;
          resolve(target.value!);
          target.removeEventListener('characteristicvaluechanged', listener);
          target.stopNotifications().catch(() => {});
        };

        characteristic.addEventListener('characteristicvaluechanged', listener);
        characteristic.startNotifications().catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    } else {
      // Fall back to direct read
      dataView = await characteristic.readValue();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal membaca data dari perangkat.';
    onStateChange('error', msg);
    throw new Error(msg);
  }

  // -- PARSE --
  const parsed = parseBPMeasurement(dataView);

  const systolic = parsed.systolic;
  const diastolic = parsed.diastolic;
  const pulse = parsed.pulse;

  // Single-door validation
  const validation = validateBPRange(systolic, diastolic, pulse);
  if (!validation.valid) {
    const msg = `Data tensi dari perangkat tidak valid: ${validation.error}`;
    onStateChange('error', msg);
    throw new Error(msg);
  }

  // Tags assembly
  const tags = options?.tags ? [...options.tags] : [];
  if (!tags.includes('Bluetooth')) {
    tags.push('Bluetooth');
  }
  if (parsed.measurementStatus?.irregularPulse && !tags.includes('Aritmia')) {
    tags.push('Aritmia');
  }
  if (parsed.isFlaggedMeasurement && !tags.includes('Perlu Ukur Ulang')) {
    tags.push('Perlu Ukur Ulang');
  }

  // -- STORE --
  const bpReading: BPReading = {
    id: newSyncId(),
    profileId,
    systolic,
    diastolic,
    pulse,
    timestamp: (parsed.timestamp ?? new Date()).toISOString(),
    position: options?.position || 'duduk',
    arm: options?.arm || 'kiri',
    measurement_context: options?.measurementContext || 'Home',
    measurementStatus: parsed.measurementStatus,
    isFlaggedMeasurement: parsed.isFlaggedMeasurement,
    isExcludedFromAverages: parsed.isExcludedFromAverages,
    tags,
  };

  try {
    await db.readings.add(bpReading);
  } catch {
    const msg = 'Data berhasil dibaca tetapi gagal disimpan ke database lokal.';
    onStateChange('error', msg);
    throw new Error(msg);
  }

  // -- DONE --
  const pulseText = pulse !== undefined ? `, Nadi ${pulse} BPM` : '';
  const warningText = parsed.isFlaggedMeasurement ? ' (Perhatian: terdeteksi gerakan/posisi manset)' : '';
  onStateChange(
    'done',
    `Berhasil: ${systolic}/${diastolic} mmHg${pulseText}${warningText}`
  );

  // Clean up connection
  cleanup();

  return bpReading;
}

/**
 * Disconnect from the active device and release resources.
 */
export function cleanup(): void {
  if (activeCharacteristic) {
    try {
      activeCharacteristic.stopNotifications().catch(() => {});
    } catch { /* ignore */ }
    activeCharacteristic = null;
  }
  if (activeDevice?.gatt?.connected) {
    activeDevice.gatt.disconnect();
  }
  activeDevice = null;
}

/**
 * Get a friendly error message in Indonesian for a BLE error.
 */
export function getBLEErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotFoundError':
        return 'Perangkat tidak ditemukan. Pastikan tensimeter menyala dan dekat.';
      case 'SecurityError':
        return 'Izin Bluetooth ditolak. Aktifkan Bluetooth di pengaturan browser.';
      case 'NetworkError':
        return 'Koneksi ke perangkat gagal. Coba lagi.';
      case 'NotSupportedError':
        return 'Browser tidak mendukung Web Bluetooth. Gunakan Chrome/Edge.';
      case 'AbortError':
        return 'Pemindaian dibatalkan.';
      default:
        return `Kesalahan Bluetooth: ${err.message}`;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Kesalahan tidak dikenal saat menghubungkan perangkat.';
}
