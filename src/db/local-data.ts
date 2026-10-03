import { decodeLegacyEscapedText } from '../security/sanitizer';
import { db, newSyncId, NOTES_ENCODING_RAW, SYNCED_TABLES, withSyncMetadataSuppressed, type SyncTombstone } from './index';

// ---------------------------------------------------------------------------
// Whole-database operations: account switches, guest → account migration,
// and backup restores. These are the places where local medical data can be
// lost or leak between accounts, so they all live here behind one contract.
// ---------------------------------------------------------------------------

export type SyncedTableName = (typeof SYNCED_TABLES)[number];
export type LocalDataSnapshot = Partial<Record<SyncedTableName, any[]>>;

/** Tables keyed by device-local auto-increment ids (`++id`). */
const AUTO_INCREMENT_TABLES: ReadonlySet<SyncedTableName> = new Set<SyncedTableName>([
  'reminders',
  'habits',
  'sodiumLogs',
  'sleepLogs',
  'medications',
  'medicationLogs',
  'labResults',
  'ascvdProfiles',
  'clinicalNotes'
]);

/** Tables that every fresh database gets seeded with; they are not "user data". */
const SEED_ONLY_TABLES: ReadonlySet<SyncedTableName> = new Set<SyncedTableName>(['profiles', 'gamification']);

// ---------------------------------------------------------------------------
// Local data owner
// ---------------------------------------------------------------------------
// Records WHOSE data the local database currently holds ('guest' or a cloud
// user id). Lets login decide between keeping, migrating, or wiping local data
// AFTER authentication succeeds, instead of wiping blindly up front.

const LOCAL_DATA_OWNER_KEY = 'aortalink_local_data_owner';
export const GUEST_DATA_OWNER = 'guest';

export function getLocalDataOwner(): string | null {
  try {
    return localStorage.getItem(LOCAL_DATA_OWNER_KEY);
  } catch {
    return null;
  }
}

export function setLocalDataOwner(owner: string | null): void {
  try {
    if (owner) localStorage.setItem(LOCAL_DATA_OWNER_KEY, owner);
    else localStorage.removeItem(LOCAL_DATA_OWNER_KEY);
  } catch {
    // storage unavailable — owner tracking degrades to "unknown"
  }
}

// ---------------------------------------------------------------------------
// Inspection
// ---------------------------------------------------------------------------

/** True when the database holds anything beyond the default seed. */
export async function hasUserEnteredData(): Promise<boolean> {
  for (const name of SYNCED_TABLES) {
    if (SEED_ONLY_TABLES.has(name)) continue;
    if ((await db.table(name).count()) > 0) return true;
  }
  return (await db.profiles.count()) > 1;
}

/** True when the device holds Mode Lokal (guest) data that could move into an account. */
export async function hasGuestDataToMigrate(): Promise<boolean> {
  return getLocalDataOwner() === GUEST_DATA_OWNER && (await hasUserEnteredData());
}

/**
 * Number of local changes the cloud has not seen: records stamped after the
 * last successful sync, plus pending deletions.
 */
export async function countUnsyncedChanges(lastSyncIso: string | null): Promise<number> {
  const lastSync = lastSyncIso ? new Date(lastSyncIso).getTime() : 0;
  let count = await db.syncTombstones.count();
  for (const name of SYNCED_TABLES) {
    count += await db
      .table(name)
      .filter((row: { updatedAt?: string }) => {
        if (!lastSync) return true;
        const t = row.updatedAt ? new Date(row.updatedAt).getTime() : NaN;
        return Number.isFinite(t) && t > lastSync;
      })
      .count();
  }
  return count;
}

// ---------------------------------------------------------------------------
// Snapshot / merge (guest → account migration)
// ---------------------------------------------------------------------------

export interface FullLocalSnapshot {
  tables: LocalDataSnapshot;
  tombstones: SyncTombstone[];
}

export async function snapshotLocalData(): Promise<FullLocalSnapshot> {
  const tables: LocalDataSnapshot = {};
  for (const name of SYNCED_TABLES) {
    tables[name] = await db.table(name).toArray();
  }
  return { tables, tombstones: await db.syncTombstones.toArray() };
}

/** Puts a snapshot back exactly as it was (timestamps preserved). */
export async function restoreLocalSnapshot(snapshot: FullLocalSnapshot): Promise<void> {
  await withSyncMetadataSuppressed(async () => {
    await db.transaction('rw', [...SYNCED_TABLES.map((n) => db.table(n)), db.syncTombstones], async () => {
      for (const name of SYNCED_TABLES) {
        await db.table(name).clear();
        await db.table(name).bulkPut(snapshot.tables[name] ?? []);
      }
      await db.syncTombstones.clear();
      await db.syncTombstones.bulkPut(snapshot.tombstones);
    });
  });
}

/**
 * Merges guest records into a database that already holds the account's
 * cloud data. Cloud records win on key conflicts (e.g. the shared default
 * profile). Auto-increment records get fresh local ids so they can't overwrite
 * the account's records that happen to share the same number; medication log
 * links are remapped accordingly. Writes are stamped, so they push next sync.
 */
export async function mergeLocalSnapshot(snapshot: FullLocalSnapshot): Promise<number> {
  let merged = 0;
  const medicationIdMap = new Map<unknown, number>();

  await db.transaction('rw', SYNCED_TABLES.map((n) => db.table(n)), async () => {
    // medications before medicationLogs so the id map is filled in time.
    const order: SyncedTableName[] = [
      'medications',
      ...SYNCED_TABLES.filter((n) => n !== 'medications')
    ];
    for (const name of order) {
      const table = db.table(name);
      for (const row of snapshot.tables[name] ?? []) {
        if (AUTO_INCREMENT_TABLES.has(name)) {
          const { id: oldId, ...rest } = row;
          if (name === 'medicationLogs' && rest.medicationId !== undefined) {
            rest.medicationId = medicationIdMap.get(rest.medicationId) ?? rest.medicationId;
          }
          const newId = await table.add(rest);
          if (name === 'medications') medicationIdMap.set(oldId, newId as number);
          merged++;
          continue;
        }
        if (row.id === undefined || row.id === null) continue;
        if (await table.get(row.id)) continue; // account copy wins
        await table.put(row);
        merged++;
      }
    }
  });

  return merged;
}

// ---------------------------------------------------------------------------
// Replace (backup restore / JSON import)
// ---------------------------------------------------------------------------

/**
 * Replaces local data with `data` in a way that sync understands.
 *
 * - Every table present in `data` is replaced: records that disappear are
 *   deleted through the sync middleware, so they leave tombstones and do NOT
 *   come back from the cloud on the next pull (plain `clear()` did).
 * - Tables absent from `data` keep their records, except rows that belong to
 *   a profile that no longer exists — those would be orphans, so they are
 *   deleted (with tombstones) too.
 * - Restored records are stamped "now" so they win over older cloud copies.
 * - Legacy numeric reading ids are rekeyed to UUIDs (with note links remapped).
 */
export async function replaceAllLocalData(data: LocalDataSnapshot): Promise<void> {
  const input: LocalDataSnapshot = { ...data };

  if (input.readings) {
    const idMap = new Map<unknown, string>();
    input.readings = input.readings.map((reading) => {
      // Backups made by older builds carry HTML-escaped notes.
      const r = reading.notesEncoding === NOTES_ENCODING_RAW || typeof reading.notes !== 'string'
        ? reading
        : { ...reading, notes: decodeLegacyEscapedText(reading.notes) };
      if (typeof r.id === 'string' && r.id) return r;
      const id = newSyncId();
      if (r.id !== undefined && r.id !== null) idMap.set(r.id, id);
      return { ...r, id };
    });
    if (input.clinicalNotes && idMap.size > 0) {
      input.clinicalNotes = input.clinicalNotes.map((n) => ({
        ...n,
        linkedReadingIds: Array.isArray(n.linkedReadingIds)
          ? n.linkedReadingIds.map((id: unknown) => idMap.get(id) ?? id)
          : n.linkedReadingIds
      }));
    }
  }

  await db.transaction('rw', [...SYNCED_TABLES.map((n) => db.table(n)), db.syncTombstones], async () => {
    for (const name of SYNCED_TABLES) {
      const incoming = input[name];
      if (!incoming) continue;
      const table = db.table(name);
      const keep = new Set(incoming.map((row) => String(row.id)));
      const existingKeys = await table.toCollection().primaryKeys();
      const removed = existingKeys.filter((key) => !keep.has(String(key)));
      if (removed.length > 0) await table.bulkDelete(removed);
      if (incoming.length > 0) {
        // A restored record must not be deleted again by a stale pending tombstone.
        await db.syncTombstones.bulkDelete(incoming.map((row) => [name, String(row.id)] as [string, string]));
        await table.bulkPut(incoming);
      }
    }

    if (input.profiles) {
      const profileIds = new Set(input.profiles.map((p) => String(p.id)));
      for (const name of SYNCED_TABLES) {
        if (input[name] || name === 'profiles' || name === 'gamification') continue;
        const table = db.table(name);
        const orphanKeys = await table
          .filter((row: { profileId?: string }) => typeof row.profileId === 'string' && !profileIds.has(row.profileId))
          .primaryKeys();
        if (orphanKeys.length > 0) await table.bulkDelete(orphanKeys);
      }
    }
  });
}
