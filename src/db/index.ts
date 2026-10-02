import Dexie, { type Table } from 'dexie';
import { decodeLegacyEscapedText } from '../security/sanitizer.ts';
import type { Profile, BPReading, Reminder, HabitLog, GamificationState, SodiumLog, SleepLog, MedicationLog, MedicationItem, LabResult, FhirPatient, FhirObservation, FhirMedicationRequest, FhirMedicationStatement, AscvdProfile, ClinicalNote } from '../types/blood-pressure.ts';

export class AortaLinkDatabase extends Dexie {
  profiles!: Table<Profile, string>;
  readings!: Table<BPReading, string>;
  reminders!: Table<Reminder, number>;
  habits!: Table<HabitLog, number>;
  gamification!: Table<GamificationState, 'current'>;
  sodiumLogs!: Table<SodiumLog, number>;
  sleepLogs!: Table<SleepLog, number>;
  medicationLogs!: Table<MedicationLog, number>;
  medications!: Table<MedicationItem, number>;
  labResults!: Table<LabResult, number>;

  // HL7 FHIR R4 Core Stores
  fhirPatients!: Table<FhirPatient, string>;
  fhirObservations!: Table<FhirObservation, string>;
  fhirMedicationRequests!: Table<FhirMedicationRequest, string>;
  fhirMedicationStatements!: Table<FhirMedicationStatement, string>;

  // V7: Clinical Features
  ascvdProfiles!: Table<AscvdProfile, number>;
  clinicalNotes!: Table<ClinicalNote, number>;

  // V8: Sync bookkeeping — user deletions that must propagate to other devices
  syncTombstones!: Table<SyncTombstone, [string, string]>;

  constructor() {
    super('AortaLinkDB');
    this.version(1).stores({
      profiles: 'id, name, relationship, isDefault, createdAt',
      readings: '++id, profileId, timestamp, systolic, diastolic, pulse',
      reminders: '++id, profileId, type, time, enabled'
    });

    this.version(2).stores({
      profiles: 'id, name, relationship, isDefault, createdAt',
      readings: '++id, profileId, timestamp, systolic, diastolic, pulse',
      reminders: '++id, profileId, type, time, enabled',
      habits: '++id, profileId, date, timestamp'
    });

    this.version(3).stores({
      profiles: 'id, name, relationship, isDefault, createdAt',
      readings: '++id, profileId, timestamp, systolic, diastolic, pulse',
      reminders: '++id, profileId, type, time, enabled',
      habits: '++id, profileId, date, timestamp',
      gamification: 'id, streak, longestStreak, lastMeasurementDate, score, earnedBadges'
    });

    this.version(4).stores({
      profiles: 'id, name, relationship, isDefault, createdAt',
      readings: '++id, profileId, timestamp, systolic, diastolic, pulse',
      reminders: '++id, profileId, type, time, enabled',
      habits: '++id, profileId, date, timestamp',
      gamification: 'id, streak, longestStreak, lastMeasurementDate, score, earnedBadges',
      sodiumLogs: '++id, profileId, date',
      sleepLogs: '++id, profileId, date',
      medicationLogs: '++id, profileId, date'
    });

    this.version(5).stores({
      profiles: 'id, name, relationship, isDefault, createdAt',
      readings: '++id, profileId, timestamp, systolic, diastolic, pulse, measurement_context',
      reminders: '++id, profileId, type, time, enabled',
      habits: '++id, profileId, date, timestamp',
      gamification: 'id, streak, longestStreak, lastMeasurementDate, score, earnedBadges',
      sodiumLogs: '++id, profileId, date',
      sleepLogs: '++id, profileId, date',
      medications: '++id, profileId, name, schedule',
      medicationLogs: '++id, profileId, medicationId, takenAt',
      labResults: '++id, profileId, timestamp'
    });

    // Version 6: HL7 FHIR R4 Resource Integration
    this.version(6).stores({
      profiles: 'id, name, relationship, isDefault, createdAt',
      readings: '++id, profileId, timestamp, systolic, diastolic, pulse, measurement_context',
      reminders: '++id, profileId, type, time, enabled',
      habits: '++id, profileId, date, timestamp',
      gamification: 'id, streak, longestStreak, lastMeasurementDate, score, earnedBadges',
      sodiumLogs: '++id, profileId, date',
      sleepLogs: '++id, profileId, date',
      medications: '++id, profileId, name, schedule',
      medicationLogs: '++id, profileId, medicationId, takenAt',
      labResults: '++id, profileId, timestamp',
      fhirPatients: 'id, active',
      fhirObservations: 'id, profileId, status, effectiveDateTime',
      fhirMedicationRequests: 'id, profileId, status, intent',
      fhirMedicationStatements: 'id, profileId, status, effectiveDateTime'
    });

    // Version 7: ASCVD Risk Calculator & Clinical Notes Journal
    this.version(7).stores({
      profiles: 'id, name, relationship, isDefault, createdAt',
      readings: '++id, profileId, timestamp, systolic, diastolic, pulse, measurement_context',
      reminders: '++id, profileId, type, time, enabled',
      habits: '++id, profileId, date, timestamp',
      gamification: 'id, streak, longestStreak, lastMeasurementDate, score, earnedBadges',
      sodiumLogs: '++id, profileId, date',
      sleepLogs: '++id, profileId, date',
      medications: '++id, profileId, name, schedule',
      medicationLogs: '++id, profileId, medicationId, takenAt',
      labResults: '++id, profileId, timestamp',
      fhirPatients: 'id, active',
      fhirObservations: 'id, profileId, status, effectiveDateTime',
      fhirMedicationRequests: 'id, profileId, status, intent',
      fhirMedicationStatements: 'id, profileId, status, effectiveDateTime',
      ascvdProfiles: '++id, profileId, timestamp',
      clinicalNotes: '++id, profileId, timestamp'
    });

    // Version 8: Sync tombstones — primary key [table+recordId] so repeated
    // deletes of the same record stay a single row.
    this.version(8).stores({
      syncTombstones: '[table+recordId], deletedAt'
    });

    // Version 9: readings primary key becomes a UUID (string). Auto-increment
    // ids are device-local, so two devices creating readings offline could
    // mint the same numeric id with different content and silently clobber
    // each other in cloud sync. UUIDs remove the collision class entirely.
    this.version(9)
      .stores({
        readings: 'id, profileId, timestamp, systolic, diastolic, pulse, measurement_context'
      })
      .upgrade(async (tx) => {
        const readingsTable = tx.table('readings');
        const notesTable = tx.table('clinicalNotes');
        const legacy = await readingsTable.toArray();
        const idMap = new Map<number | string, string>();

        for (const reading of legacy) {
          const oldId = reading.id;
          const newId = typeof oldId === 'string' && oldId ? oldId : newSyncId();
          idMap.set(oldId, newId);
          if (oldId !== newId) {
            await readingsTable.delete(oldId);
            await readingsTable.put({ ...reading, id: newId });
          }
        }

        // Remap clinical note links so they keep pointing at the rekeyed readings.
        const notes = await notesTable.toArray();
        for (const note of notes) {
          if (Array.isArray(note.linkedReadingIds) && note.linkedReadingIds.length > 0) {
            const remapped = note.linkedReadingIds.map((id: number | string) => idMap.get(id) ?? id);
            await notesTable.update(note.id as number, { linkedReadingIds: remapped });
          }
        }
      });

    // Version 10: undo the HTML-escaping the old form sanitizer baked into
    // stored reading notes (`kopi &amp;amp; jalan` → `kopi & jalan`). The
    // record is re-stamped so the repaired text wins the next cloud sync.
    this.version(10).upgrade(async (tx) => {
      const now = new Date().toISOString();
      await tx.table('readings').toCollection().modify((reading: BPReading & { updatedAt?: string; notesEncoding?: string }) => {
        if (reading.notesEncoding === NOTES_ENCODING_RAW) return;
        reading.notesEncoding = NOTES_ENCODING_RAW;
        reading.updatedAt = now;
        if (typeof reading.notes === 'string') {
          reading.notes = decodeLegacyEscapedText(reading.notes);
        }
      });
    });
  }
}

/**
 * Marks a reading whose `notes` are stored as typed. Readings without it were
 * written by the old HTML-escaping sanitizer and still need decoding.
 */
export const NOTES_ENCODING_RAW = 'raw';

/** Stable UUID for records that must merge across devices without collision. */
export function newSyncId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // ID entropy only — never used for health data values.
  return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export interface SyncTombstone {
  /** Dexie table name the record was deleted from (e.g. 'readings'). */
  table: string;
  /** Primary key of the deleted record, stringified. */
  recordId: string;
  deletedAt: string;
}

export const db = new AortaLinkDatabase();

// ---------------------------------------------------------------------------
// Sync metadata middleware
// ---------------------------------------------------------------------------
// Every record the user creates or edits gets an `updatedAt` stamp, and every
// deletion leaves a tombstone. This is what makes multi-device sync
// merge-by-recency possible instead of blind last-push-wins.
// ---------------------------------------------------------------------------

/** Dexie tables that participate in cloud sync (everything but tombstones). */
export const SYNCED_TABLES = [
  'profiles',
  'readings',
  'reminders',
  'habits',
  'gamification',
  'sodiumLogs',
  'sleepLogs',
  'medications',
  'medicationLogs',
  'labResults',
  'fhirPatients',
  'fhirObservations',
  'fhirMedicationRequests',
  'fhirMedicationStatements',
  'ascvdProfiles',
  'clinicalNotes'
] as const;

let syncMetadataSuppressed = false;

/**
 * Runs `fn` WITHOUT stamping updatedAt or creating tombstones.
 * Used for account switches (clearing another user's data must NOT
 * tombstone it) and for pulling cloud records (their own updatedAt
 * must be preserved, not replaced by "now").
 */
export async function withSyncMetadataSuppressed<T>(fn: () => Promise<T>): Promise<T> {
  const previous = syncMetadataSuppressed;
  syncMetadataSuppressed = true;
  try {
    return await fn();
  } finally {
    syncMetadataSuppressed = previous;
  }
}

// Dexie 4 dbcore middleware: intercepts every add/put/delete on synced tables.
db.use({
  stack: 'dbcore',
  name: 'sync-metadata',
  create: (downlevelDatabase) => {
    const tombstoneTable = downlevelDatabase.table('syncTombstones');
    return {
      ...downlevelDatabase,
      // A plain `db.readings.delete(id)` opens a transaction on `readings`
      // only, where the tombstone store is unreachable. Widen every write
      // transaction on a synced table to include it.
      transaction: (stores, mode, options) => {
        const needsTombstones =
          mode === 'readwrite' &&
          !stores.includes('syncTombstones') &&
          stores.some((name) => (SYNCED_TABLES as readonly string[]).includes(name));
        return downlevelDatabase.transaction(needsTombstones ? [...stores, 'syncTombstones'] : stores, mode, options);
      },
      table: (tableName) => {
        const downlevelTable = downlevelDatabase.table(tableName);
        if (!(SYNCED_TABLES as readonly string[]).includes(tableName)) {
          return downlevelTable;
        }
        return {
          ...downlevelTable,
          mutate: (req) => {
            if (syncMetadataSuppressed) {
              return downlevelTable.mutate(req);
            }
            const now = new Date().toISOString();

            if ((req.type === 'add' || req.type === 'put') && req.values && req.values.length > 0) {
              // Only stamp records that are actually synced tables.
              // Readings written by this build store notes as typed (see
              // normalizeClinicalText); the marker tells pull not to decode them.
              const stamped = req.values.map((value) =>
                tableName === 'readings'
                  ? { ...value, updatedAt: now, notesEncoding: NOTES_ENCODING_RAW }
                  : { ...value, updatedAt: now }
              );
              return downlevelTable.mutate({ ...req, values: stamped });
            }

            if (req.type === 'delete' && req.keys && req.keys.length > 0) {
              // Record tombstones in the SAME transaction so they can never
              // diverge from the deletion itself.
              const tombstones = req.keys.map((key) => ({
                table: tableName,
                recordId: String(key),
                deletedAt: now
              }));
              // Awaited: if the tombstone write fails, the delete must fail
              // with it (and abort the transaction) instead of silently
              // producing a deletion that never reaches other devices.
              return tombstoneTable
                .mutate({
                  type: 'put',
                  values: tombstones,
                  keys: tombstones.map((t) => [t.table, t.recordId]),
                  trans: req.trans,
                  criteria: undefined,
                  changeSpec: undefined
                })
                .then(() => downlevelTable.mutate(req));
            }

            // deleteRange / clear pass through untouched: bulk wipes are
            // account-switch or restore operations that run suppressed.
            return downlevelTable.mutate(req);
          }
        };
      }
    };
  }
});

/**
 * Completely clears all 16 local tables in Dexie.js to prevent data leakage between accounts.
 * Runs with sync metadata suppressed: wiping another account's data must not
 * tombstone it, and local tombstones are wiped with it.
 */
export async function clearLocalEhrDatabase() {
  try {
    await withSyncMetadataSuppressed(async () => {
      await Promise.all([
        db.profiles.clear(),
        db.readings.clear(),
        db.reminders.clear(),
        db.habits.clear(),
        db.gamification.clear(),
        db.sodiumLogs.clear(),
        db.sleepLogs.clear(),
        db.medicationLogs.clear(),
        db.medications.clear(),
        db.labResults.clear(),
        db.fhirPatients.clear(),
        db.fhirObservations.clear(),
        db.fhirMedicationRequests.clear(),
        db.fhirMedicationStatements.clear(),
        db.ascvdProfiles.clear(),
        db.clinicalNotes.clear(),
        db.syncTombstones.clear()
      ]);
    });
  } catch (err) {
    console.warn('[AortaLink DB] Clear Database Warning:', err);
  }
}

/**
 * Initialize fresh database with default profile, clinical medication regimen, and FHIR R4 seeds.
 */
export async function seedInitialData(customName?: string) {
  const defaultProfileId = 'profile-self-default';
  const profileCount = await db.profiles.count();
  
  if (profileCount === 0) {
    const initialProfile: Profile = {
      id: defaultProfileId,
      name: customName || 'Saya',
      relationship: 'self',
      avatar: 'user',
      targetSystolic: 120,
      targetDiastolic: 80,
      createdAt: new Date().toISOString(),
      isDefault: true
    };

    await db.profiles.add(initialProfile);
  }

  // Initialize gamification state if not present
  const gamificationState = await db.gamification.get('current');
  if (!gamificationState) {
    await db.gamification.put({
      id: 'current',
      streak: 0,
      longestStreak: 0,
      lastMeasurementDate: null,
      score: 0,
      earnedBadges: []
    });
  }

  // Note: Medications start empty so each user enters their own real medical regimen.

  // Inject default FHIR Patient Resource
  const fhirPatientCount = await db.fhirPatients.count();
  if (fhirPatientCount === 0) {
    const defaultFhirPatient: FhirPatient = {
      resourceType: 'Patient',
      id: defaultProfileId,
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/Patient']
      },
      active: true,
      name: [{
        use: 'official',
        text: customName || 'Saya',
        family: 'Pengguna',
        given: ['AortaLink']
      }]
    };
    await db.fhirPatients.put(defaultFhirPatient);
  }
}
