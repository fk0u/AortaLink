import { db, NOTES_ENCODING_RAW, withSyncMetadataSuppressed, type SyncTombstone } from '../../db';
import { decodeLegacyEscapedText } from '../../security/sanitizer';
import { useAppStore } from '../../store/useAppStore';
import { entitiesToFhirBundle, fhirBundleToEntities } from '../fhir/fhir-contract-adapters';

export interface SyncPushResult {
  success: boolean;
  syncedCount: number;
  message: string;
  statusCode?: number;
  isAuthError?: boolean;
}

export interface SyncPullResult {
  success: boolean;
  restoredCount: number;
  message: string;
  statusCode?: number;
  isAuthError?: boolean;
}

export interface MongoAtlasConfig {
  connectionString: string;
  clusterName: string;
  databaseName: string;
}

export const MONGODB_ATLAS_DEFAULT_CONFIG: MongoAtlasConfig = {
  connectionString: '',
  clusterName: 'Cluster0',
  databaseName: 'aortalink_ehr_db'
};

export class MongoDbAtlasService {
  private config: MongoAtlasConfig;

  constructor(config: MongoAtlasConfig = MONGODB_ATLAS_DEFAULT_CONFIG) {
    this.config = config;
  }

  private getAuthToken(): string | null {
    try {
      const saved = localStorage.getItem('aortalink_saas_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.token || null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Push ALL local Dexie.js records & userSettings to MongoDB Atlas Cloud Cluster
   * Packages clinical data into a standardized HL7 FHIR R4 Bundle (ADR 002)
   */
  public async pushUserData(): Promise<SyncPushResult> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return {
          success: false,
          syncedCount: 0,
          message: 'Tidak ada sesi login pengguna.',
          statusCode: 401,
          isAuthError: true
        };
      }

      const [
        readings,
        medications,
        medicationLogs,
        labResults,
        habits,
        sodiumLogs,
        sleepLogs,
        gamification,
        profiles,
        reminders,
        ascvdProfiles,
        clinicalNotes,
        conditions,
        familyHistory,
        immunizations
      ] = await Promise.all([
        db.readings.toArray(),
        db.medications.toArray(),
        db.medicationLogs.toArray(),
        db.labResults.toArray(),
        db.habits.toArray(),
        db.sodiumLogs.toArray(),
        db.sleepLogs.toArray(),
        db.gamification.toArray(),
        db.profiles.toArray(),
        db.reminders.toArray(),
        db.ascvdProfiles.toArray(),
        db.clinicalNotes.toArray(),
        db.conditions.toArray(),
        db.familyHistory.toArray(),
        db.immunizations.toArray()
      ]);

      // Package clinical data into canonical HL7 FHIR R4 Bundle (ADR 002)
      const fhirBundle = entitiesToFhirBundle({
        profiles,
        readings,
        labResults,
        medications,
        conditions,
        familyHistory,
        immunizations
      });

      // Deletions recorded since the last successful push must travel too,
      // or they would resurrect on other devices.
      const tombstones = await db.syncTombstones.toArray();

      const appState = useAppStore.getState();
      const userSettings = {
        theme: appState.theme,
        activeProfileId: appState.activeProfileId,
        dateFilter: appState.dateFilter
      };

      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fhirBundle,
          appState: {
            reminders,
            habits,
            sodiumLogs,
            sleepLogs,
            gamification,
            ascvdProfiles,
            clinicalNotes,
            userSettings
          },
          readings,
          medications,
          medicationLogs,
          labResults,
          habits,
          sodiumLogs,
          sleepLogs,
          gamification,
          profiles,
          reminders,
          ascvdProfiles,
          clinicalNotes,
          conditions,
          familyHistory,
          immunizations,
          tombstones,
          userSettings
        })
      });

      const data = await res.json().catch(() => ({}));
      const isAuthError = res.status === 401 || res.status === 403;

      if (res.ok && data.success) {
        // Cloud acknowledged the tombstones — prune them locally.
        if (tombstones.length > 0) {
          await db.syncTombstones.bulkDelete(tombstones.map((t) => [t.table, t.recordId]));
        }
        const timestamp = new Date().toISOString();
        localStorage.setItem('aortalink_mongodb_atlas_last_sync', timestamp);
        localStorage.setItem('aortalink_mongodb_atlas_synced_count', String(data.totalSynced));
        return {
          success: true,
          syncedCount: data.totalSynced,
          message: data.message || `Berhasil mengunggah ${data.totalSynced} data ke MongoDB Atlas Cloud.`,
          statusCode: res.status
        };
      }

      return {
        success: false,
        syncedCount: 0,
        message: data.message || (isAuthError ? 'Sesi tidak valid atau telah kadaluwarsa.' : `Gagal menyinkronkan data (HTTP ${res.status}).`),
        statusCode: res.status,
        isAuthError
      };
    } catch (err: any) {
      console.error('[AortaLink] Push User Data Error:', err);
      return { success: false, syncedCount: 0, message: err.message || 'Kesalahan koneksi sync.' };
    }
  }

  /**
   * Pull ALL 14 EHR tables & settings from MongoDB Atlas Cloud Cluster & restore into Dexie.js for multi-device access
   */
  public async pullAndRestoreUserData(): Promise<SyncPullResult> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return {
          success: false,
          restoredCount: 0,
          message: 'Tidak ada sesi login pengguna.',
          statusCode: 401,
          isAuthError: true
        };
      }

      const res = await fetch('/api/sync/pull', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json().catch(() => ({}));
      const isAuthError = res.status === 401 || res.status === 403;

      if (!res.ok || !data.success || !data.data) {
        return {
          success: false,
          restoredCount: 0,
          message: data.message || (isAuthError ? 'Sesi tidak valid atau telah kadaluwarsa.' : `Gagal mengunduh data dari cloud (HTTP ${res.status}).`),
          statusCode: res.status,
          isAuthError
        };
      }

      const cloudData = data.data;
      let totalRestored = 0;

      // Merge-by-recency: a cloud record only overwrites the local copy when
      // it is newer. Edits made locally while offline survive the pull; a
      // record modified here after the cloud copy never gets clobbered.
      const recordTime = (value: unknown): number => {
        const iso = typeof value === 'string' ? value : '';
        const t = iso ? new Date(iso).getTime() : NaN;
        return Number.isFinite(t) ? t : 0;
      };

      // Deletions made on this device that the cloud hasn't seen yet. A cloud
      // copy of such a record must not be restored, or pull-before-push would
      // resurrect everything the user just deleted.
      const pendingDeletes = new Set(
        (await db.syncTombstones.toArray()).map((t) => `${t.table}:${t.recordId}`)
      );
      const legacyReadingTombstones: SyncTombstone[] = [];

      const restoreTable = async (items: any[], tableObj: any, tableName: string) => {
        if (!Array.isArray(items) || items.length === 0) return 0;
        let applied = 0;
        for (const item of items) {
          delete item._id;
          delete item.userId;
          if (item.id === undefined || item.id === null) continue;
          if (pendingDeletes.has(`${tableName}:${String(item.id)}`)) continue;

          if (tableName === 'readings') {
            if (item.notesEncoding !== NOTES_ENCODING_RAW) {
              // Written by an old build that HTML-escaped notes. Decode once
              // and mark it, so text typed as `&lt;` today is never touched.
              if (typeof item.notes === 'string') item.notes = decodeLegacyEscapedText(item.notes);
              item.notesEncoding = NOTES_ENCODING_RAW;
            }
            if (typeof item.id !== 'string' || !item.id) {
              // Cloud reading created before the UUID migration. Rekey it
              // deterministically (a random id here minted a NEW duplicate on
              // every pull) and tombstone the numeric id so the cloud copy is
              // retired once this device pushes.
              const legacyId = String(item.id);
              legacyReadingTombstones.push({ table: 'readings', recordId: legacyId, deletedAt: new Date().toISOString() });
              const twin = typeof item.timestamp === 'string'
                ? await db.readings
                    .where('timestamp')
                    .equals(item.timestamp)
                    .filter((r) => r.profileId === item.profileId && r.systolic === item.systolic && r.diastolic === item.diastolic)
                    .first()
                : undefined;
              if (twin) continue; // already migrated locally (v9) under another id
              item.id = `legacy-reading-${legacyId}`;
            }
          }

          const existing = await tableObj.get(item.id);
          if (existing) {
            const localTime = Math.max(recordTime(existing.updatedAt), recordTime(existing.createdAt));
            const cloudTime = Math.max(recordTime(item.updatedAt), recordTime(item.createdAt));
            if (localTime > cloudTime) continue;
          }
          await tableObj.put(item);
          applied++;
        }
        return applied;
      };

      // Pull writes run suppressed so cloud updatedAt values are preserved
      // (not restamped to "now") and applying tombstones does not generate
      // new local ones.
      await withSyncMetadataSuppressed(async () => {
        // 1. Apply deletions from other devices BEFORE restoring records.
        if (Array.isArray(cloudData.tombstones)) {
          for (const t of cloudData.tombstones as Array<SyncTombstone & { id?: string }>) {
            // Older server builds stored the record id under `id`.
            const recordId = t?.recordId ?? t?.id;
            if (!t || !t.table || recordId === undefined || recordId === null) continue;
            const tableObj = TABLE_NAME_TO_DB[t.table];
            if (!tableObj) continue;
            const key = /^[0-9]+$/.test(String(recordId)) ? Number(recordId) : recordId;
            try {
              // A local copy written after the deletion (e.g. restored from a
              // backup) wins; the push below retires the cloud tombstone.
              const local = await tableObj.get(key);
              if (local && recordTime(local.updatedAt) > recordTime(t.deletedAt)) continue;
              await tableObj.delete(key);
            } catch {
              // record already absent — fine
            }
          }
        }

        // Prioritize FHIR R4 Bundle for restoring clinical entities (ADR 002)
        const hasFhirBundle = Boolean(data.fhirBundle && data.fhirBundle.resourceType === 'Bundle');
        const fhirEntities = hasFhirBundle ? fhirBundleToEntities(data.fhirBundle) : null;

        const profilesToRestore = (fhirEntities?.profiles && fhirEntities.profiles.length > 0)
          ? fhirEntities.profiles
          : (Array.isArray(cloudData.profiles) ? cloudData.profiles : []);
        totalRestored += await restoreTable(profilesToRestore, db.profiles, 'profiles');

        const readingsToRestore = (fhirEntities?.readings && fhirEntities.readings.length > 0)
          ? fhirEntities.readings
          : (Array.isArray(cloudData.readings) ? cloudData.readings : []);
        totalRestored += await restoreTable(
          [
            ...readingsToRestore.filter((r: any) => typeof r?.id === 'string'),
            ...readingsToRestore.filter((r: any) => typeof r?.id !== 'string')
          ],
          db.readings,
          'readings'
        );

        const medsToRestore = (fhirEntities?.medications && fhirEntities.medications.length > 0)
          ? fhirEntities.medications
          : (Array.isArray(cloudData.medications) ? cloudData.medications : []);
        totalRestored += await restoreTable(medsToRestore, db.medications, 'medications');

        totalRestored += await restoreTable(cloudData.medicationLogs, db.medicationLogs, 'medicationLogs');

        const labsToRestore = (fhirEntities?.labResults && fhirEntities.labResults.length > 0)
          ? fhirEntities.labResults
          : (Array.isArray(cloudData.labResults) ? cloudData.labResults : []);
        totalRestored += await restoreTable(labsToRestore, db.labResults, 'labResults');

        totalRestored += await restoreTable(cloudData.habits, db.habits, 'habits');
        totalRestored += await restoreTable(cloudData.sodiumLogs, db.sodiumLogs, 'sodiumLogs');
        totalRestored += await restoreTable(cloudData.sleepLogs, db.sleepLogs, 'sleepLogs');
        totalRestored += await restoreTable(cloudData.gamification, db.gamification, 'gamification');
        totalRestored += await restoreTable(cloudData.reminders, db.reminders, 'reminders');
        totalRestored += await restoreTable(cloudData.ascvdProfiles, db.ascvdProfiles, 'ascvdProfiles');
        totalRestored += await restoreTable(cloudData.clinicalNotes, db.clinicalNotes, 'clinicalNotes');

        const condsToRestore = (fhirEntities?.conditions && fhirEntities.conditions.length > 0)
          ? fhirEntities.conditions
          : (Array.isArray(cloudData.conditions) ? cloudData.conditions : []);
        totalRestored += await restoreTable(condsToRestore, db.conditions, 'conditions');

        const famToRestore = (fhirEntities?.familyHistory && fhirEntities.familyHistory.length > 0)
          ? fhirEntities.familyHistory
          : (Array.isArray(cloudData.familyHistory) ? cloudData.familyHistory : []);
        totalRestored += await restoreTable(famToRestore, db.familyHistory, 'familyHistory');

        const immToRestore = (fhirEntities?.immunizations && fhirEntities.immunizations.length > 0)
          ? fhirEntities.immunizations
          : (Array.isArray(cloudData.immunizations) ? cloudData.immunizations : []);
        totalRestored += await restoreTable(immToRestore, db.immunizations, 'immunizations');

        if (legacyReadingTombstones.length > 0) {
          await db.syncTombstones.bulkPut(legacyReadingTombstones);
        }
      });

      // Restore User Settings (Theme & Profile)
      if (cloudData.userSettings) {
        const { theme, activeProfileId } = cloudData.userSettings;
        if (theme) {
          useAppStore.getState().setTheme(theme);
        }
        if (activeProfileId) {
          useAppStore.getState().setActiveProfileId(activeProfileId);
        }
      }

      const timestamp = new Date().toISOString();
      localStorage.setItem('aortalink_mongodb_atlas_last_sync', timestamp);
      localStorage.setItem('aortalink_mongodb_atlas_synced_count', String(totalRestored));

      return {
        success: true,
        restoredCount: totalRestored,
        message: `Berhasil memulihkan ${totalRestored} rekam medis dari MongoDB Atlas Cloud!`,
        statusCode: res.status
      };
    } catch (err: any) {
      console.error('[AortaLink] Pull & Restore Error:', err);
      return { success: false, restoredCount: 0, message: err.message || 'Gagal menyinkronkan data dari cloud.' };
    }
  }

  /**
   * Delete a profile and all its associated data from MongoDB Atlas Cloud Cluster
   */
  public async deleteProfileCloud(profileId: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return { success: true, message: 'Data lokal telah dihapus (Mode Offline).' };
      }

      const res = await fetch(`/api/profiles/${encodeURIComponent(profileId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: 'Profil berhasil dihapus permanen dari Cloud MongoDB Atlas.' };
      }

      return { success: false, message: data.message || 'Gagal menghapus profil dari cloud.' };
    } catch (err: any) {
      console.error('[AortaLink] Delete Profile Cloud Error:', err);
      return { success: false, message: err.message || 'Kesalahan jaringan saat menghapus profil.' };
    }
  }

  public getLastSyncTime(): string | null {
    return localStorage.getItem('aortalink_mongodb_atlas_last_sync');
  }

  public getSyncedCount(): number {
    return Number(localStorage.getItem('aortalink_mongodb_atlas_synced_count') || '0');
  }

  public getConnectionString(): string {
    return this.config.connectionString;
  }
}

/** Dexie table name → Dexie table, for applying cloud tombstones. */
const TABLE_NAME_TO_DB: Record<string, { get: (key: any) => Promise<any>; delete: (key: any) => Promise<void> }> = {
  profiles: db.profiles,
  readings: db.readings,
  medications: db.medications,
  medicationLogs: db.medicationLogs,
  labResults: db.labResults,
  habits: db.habits,
  sodiumLogs: db.sodiumLogs,
  sleepLogs: db.sleepLogs,
  gamification: db.gamification,
  reminders: db.reminders,
  ascvdProfiles: db.ascvdProfiles,
  clinicalNotes: db.clinicalNotes,
  conditions: db.conditions,
  familyHistory: db.familyHistory,
  immunizations: db.immunizations
};

export const mongoDbAtlasService = new MongoDbAtlasService();
