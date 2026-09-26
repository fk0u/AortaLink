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

import { db, newSyncId } from '../../db';
import type { BPReading } from '../../types/blood-pressure';

// ---------------------------------------------------------------------------
// BLE UUIDs
// ---------------------------------------------------------------------------
export const BLOOD_PRESSURE_SERVICE_UUID = 0x1810;
export const BP_MEASUREMENT_CHAR_UUID = 0x2A35;
export const BP_FEATURE_CHAR_UUID = 0x2A36;

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
}

// ---------------------------------------------------------------------------
// IEEE 11073-20601 SFLOAT decoder
// ---------------------------------------------------------------------------

/**
 * Decode a 16-bit SFLOAT (IEEE 11073-20601) from two bytes.
 * Format: 4-bit signed exponent (bits 12-15) + 12-bit signed mantissa (bits 0-11).
 */
function decodeSFloat(dataView: DataView, offset: number): number {
  const word = dataView.getUint16(offset, true); // little-endian
  const mantissa = (word & 0x0fff) << 20 >> 20; // sign-extend 12-bit mantissa
  const exponent = (word >> 12) << 28 >> 28;     // sign-extend 4-bit exponent
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
// BP Measurement parser
// ---------------------------------------------------------------------------

/**
 * Parse a raw Blood Pressure Measurement characteristic value
 * according to IEEE 11073-20601.
 */
export function parseBPMeasurement(data: DataView): ParsedBPMeasurement {
  const flags = parseFlags(data.getUint8(0));
  let offset = 1;

  const systolic = decodeSFloat(data, offset);
  offset += 2;

  const diastolic = decodeSFloat(data, offset);
  offset += 2;

  const map = decodeSFloat(data, offset);
  offset += 2;

  let timestamp: Date | undefined;
  if (flags.timestampPresent) {
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
  if (flags.pulsePresent) {
    pulse = decodeSFloat(data, offset);
    pulse = Math.round(pulse); // pulse is typically an integer
    offset += 2;
  }

  let userId: number | undefined;
  if (flags.userIdPresent) {
    userId = data.getUint8(offset);
    offset += 1;
  }

  // measurementStatusPresent — we read but don't use currently
  // Could be used for body movement detection, cuff fit, irregular pulse, etc.

  return {
    systolic: Math.round(systolic),
    diastolic: Math.round(diastolic),
    map: Math.round(map * 10) / 10,
    pulse,
    timestamp,
    unit: flags.unit,
    userId,
  };
}

// ---------------------------------------------------------------------------
// Convert kPa to mmHg
// ---------------------------------------------------------------------------
function kPaToMmHg(kPa: number): number {
  return Math.round(kPa * 7.50062);
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
  onStateChange: BLEStateChangeCallback
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

  // Convert kPa to mmHg if needed
  const systolic = parsed.unit === 'kPa' ? kPaToMmHg(parsed.systolic) : parsed.systolic;
  const diastolic = parsed.unit === 'kPa' ? kPaToMmHg(parsed.diastolic) : parsed.diastolic;
  const pulse = parsed.pulse ?? 0;

  // -- STORE --
  const bpReading: BPReading = {
    id: newSyncId(),
    profileId,
    systolic,
    diastolic,
    pulse,
    timestamp: (parsed.timestamp ?? new Date()).toISOString(),
    position: 'duduk',
    arm: 'kiri',
    tags: ['Bluetooth'],
  };

  try {
    await db.readings.add(bpReading);
  } catch {
    const msg = 'Data berhasil dibaca tetapi gagal disimpan ke database lokal.';
    onStateChange('error', msg);
    throw new Error(msg);
  }

  // -- DONE --
  onStateChange(
    'done',
    `Berhasil: ${systolic}/${diastolic} mmHg, Nadi ${pulse} BPM`
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
