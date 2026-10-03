import { db } from '../db';
import { replaceAllLocalData } from '../db/local-data';
import { BackupDataFormat, BPReading, HabitLog, Profile, Reminder } from '../types/blood-pressure';
import { validateBPRange } from '../security/sanitizer';

export function createBackupFilename(exportedAt = new Date()): string {
  const stamp = exportedAt.toISOString().replace(/[:.]/g, '-');
  return `aortalink-backup-${stamp}.json`;
}

export async function createBackupPayload(): Promise<BackupDataFormat> {
  const [profiles, readings, reminders, habits, medications, medicationLogs, labResults] = await Promise.all([
    db.profiles.toArray(),
    db.readings.toArray(),
    db.reminders.toArray(),
    db.habits.toArray(),
    db.medications.toArray(),
    db.medicationLogs.toArray(),
    db.labResults.toArray()
  ]);

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    profiles,
    readings,
    reminders,
    habits,
    medications,
    medicationLogs,
    labResults
  };
}

export function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function ensureArray<T>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

export function normalizeBackupPayload(input: unknown): BackupDataFormat {
  if (!input || typeof input !== 'object') {
    throw new Error('File backup tidak valid.');
  }

  const payload = input as Partial<BackupDataFormat> & {
    profiles?: unknown;
    readings?: unknown;
    reminders?: unknown;
    habits?: unknown;
    medications?: unknown;
    medicationLogs?: unknown;
    labResults?: unknown;
  };

  const profiles = ensureArray<Profile>(payload.profiles);
  if (profiles.length === 0) {
    throw new Error('Backup harus memiliki minimal 1 profil.');
  }

  return {
    version: typeof payload.version === 'string' ? payload.version : '1.0.0',
    exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : new Date().toISOString(),
    profiles,
    readings: ensureArray<BPReading>(payload.readings).filter(
      (r) => r && typeof r === 'object' && validateBPRange(r.systolic, r.diastolic, r.pulse).valid
    ),
    reminders: ensureArray<Reminder>(payload.reminders),
    habits: ensureArray<HabitLog>(payload.habits),
    medications: ensureArray<import('../types/blood-pressure').MedicationItem>(payload.medications),
    medicationLogs: ensureArray<import('../types/blood-pressure').MedicationLog>(payload.medicationLogs),
    labResults: ensureArray<import('../types/blood-pressure').LabResult>(payload.labResults)
  };
}

export async function restoreBackupPayload(payload: BackupDataFormat) {
  // Only tables the backup actually carries are replaced; see replaceAllLocalData
  // for how deletions are tombstoned so the cloud doesn't resurrect them.
  await replaceAllLocalData({
    profiles: payload.profiles,
    readings: payload.readings || [],
    reminders: payload.reminders || [],
    ...(payload.habits ? { habits: payload.habits } : {}),
    ...(payload.medications ? { medications: payload.medications } : {}),
    ...(payload.medicationLogs ? { medicationLogs: payload.medicationLogs } : {}),
    ...(payload.labResults ? { labResults: payload.labResults } : {}),
    ...(payload.conditions ? { conditions: payload.conditions } : {}),
    ...(payload.familyHistory ? { familyHistory: payload.familyHistory } : {}),
    ...(payload.immunizations ? { immunizations: payload.immunizations } : {})
  });
}
