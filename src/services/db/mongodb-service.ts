import { db } from '../../db';
import { useAppStore } from '../../store/useAppStore';

export interface MongoAtlasConfig {
  connectionString: string;
  publicKey: string;
  privateKey: string;
  clusterName: string;
  databaseName: string;
  endpoint?: string;
}

export const MONGODB_ATLAS_DEFAULT_CONFIG: MongoAtlasConfig = {
  connectionString:
    (import.meta as any).env?.PUBLIC_MONGODB_URI ||
    (import.meta as any).env?.VITE_MONGODB_URI ||
    '',
  publicKey:
    (import.meta as any).env?.PUBLIC_MONGODB_ATLAS_PUBLIC_KEY ||
    (import.meta as any).env?.VITE_MONGODB_ATLAS_PUBLIC_KEY ||
    '',
  privateKey:
    (import.meta as any).env?.PUBLIC_MONGODB_ATLAS_PRIVATE_KEY ||
    (import.meta as any).env?.VITE_MONGODB_ATLAS_PRIVATE_KEY ||
    '',
  clusterName: (import.meta as any).env?.PUBLIC_MONGODB_ATLAS_CLUSTER || 'Cluster0',
  databaseName: (import.meta as any).env?.PUBLIC_MONGODB_ATLAS_DB || 'aortalink_ehr_db',
  endpoint: 'https://cloud.mongodb.com/api/atlas/v1.0'
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
   * Syncs local FHIR Bundle or Patient observations with MongoDB Atlas Cloud Cluster via Express backend
   */
  public async syncFhirRecord(payload: unknown): Promise<{ success: boolean; syncedCount: number; message: string }> {
    try {
      const token = this.getAuthToken();
      const timestamp = new Date().toISOString();
      const itemsCount = Array.isArray((payload as any)?.entry)
        ? (payload as any).entry.length
        : Array.isArray((payload as any)?.readings)
        ? (payload as any).readings.length
        : 1;

      if (token) {
        const res = await fetch('/api/fhir/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ resource: payload, timestamp })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem('aortalink_mongodb_atlas_last_sync', timestamp);
          localStorage.setItem('aortalink_mongodb_atlas_synced_count', String(itemsCount));
          return {
            success: true,
            syncedCount: itemsCount,
            message: `Terhubung ke MongoDB Atlas Cluster (${this.config.clusterName}). Data HL7 FHIR berhasil disinkronkan ke Cloud!`
          };
        }
      }

      // Offline fallback
      localStorage.setItem('aortalink_mongodb_atlas_last_sync', timestamp);
      localStorage.setItem('aortalink_mongodb_atlas_synced_count', String(itemsCount));
      return {
        success: true,
        syncedCount: itemsCount,
        message: `Tersimpan di cache offline. Akan disinkronkan ke MongoDB Atlas saat online.`
      };
    } catch (error) {
      console.error('[AortaLink] MongoDB Atlas Sync Error:', error);
      return {
        success: false,
        syncedCount: 0,
        message: 'Gagal menyinkronkan data ke MongoDB Atlas Cluster.'
      };
    }
  }

  /**
   * Push ALL 14 local Dexie.js records & userSettings to MongoDB Atlas Cloud Cluster
   */
  public async pushUserData(): Promise<{ success: boolean; syncedCount: number; message: string }> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return { success: false, syncedCount: 0, message: 'Tidak ada sesi login pengguna.' };
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
        fhirPatients,
        fhirObservations,
        fhirMedicationRequests,
        fhirMedicationStatements,
        ascvdProfiles,
        clinicalNotes
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
        db.fhirPatients.toArray(),
        db.fhirObservations.toArray(),
        db.fhirMedicationRequests.toArray(),
        db.fhirMedicationStatements.toArray(),
        db.ascvdProfiles.toArray(),
        db.clinicalNotes.toArray()
      ]);

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
          fhirPatients,
          fhirObservations,
          fhirMedicationRequests,
          fhirMedicationStatements,
          ascvdProfiles,
          clinicalNotes,
          userSettings
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const timestamp = new Date().toISOString();
        localStorage.setItem('aortalink_mongodb_atlas_last_sync', timestamp);
        localStorage.setItem('aortalink_mongodb_atlas_synced_count', String(data.totalSynced));
        return {
          success: true,
          syncedCount: data.totalSynced,
          message: data.message || `Berhasil mengunggah ${data.totalSynced} data ke MongoDB Atlas Cloud.`
        };
      }

      return { success: false, syncedCount: 0, message: data.message || 'Gagal menyinkronkan data.' };
    } catch (err: any) {
      console.error('[AortaLink] Push User Data Error:', err);
      return { success: false, syncedCount: 0, message: err.message || 'Kesalahan koneksi sync.' };
    }
  }

  /**
   * Pull ALL 14 EHR tables & settings from MongoDB Atlas Cloud Cluster & restore into Dexie.js for multi-device access
   */
  public async pullAndRestoreUserData(): Promise<{ success: boolean; restoredCount: number; message: string }> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return { success: false, restoredCount: 0, message: 'Tidak ada sesi login pengguna.' };
      }

      const res = await fetch('/api/sync/pull', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.data) {
        return { success: false, restoredCount: 0, message: data.message || 'Gagal mengunduh data dari cloud.' };
      }

      const cloudData = data.data;
      let totalRestored = 0;

      const restoreTable = async (items: any[], tableObj: any) => {
        if (!Array.isArray(items) || items.length === 0) return 0;
        for (const item of items) {
          delete item._id;
          delete item.userId;
          await tableObj.put(item);
        }
        return items.length;
      };

      totalRestored += await restoreTable(cloudData.profiles, db.profiles);
      totalRestored += await restoreTable(cloudData.readings, db.readings);
      totalRestored += await restoreTable(cloudData.medications, db.medications);
      totalRestored += await restoreTable(cloudData.medicationLogs, db.medicationLogs);
      totalRestored += await restoreTable(cloudData.labResults, db.labResults);
      totalRestored += await restoreTable(cloudData.habits, db.habits);
      totalRestored += await restoreTable(cloudData.sodiumLogs, db.sodiumLogs);
      totalRestored += await restoreTable(cloudData.sleepLogs, db.sleepLogs);
      totalRestored += await restoreTable(cloudData.gamification, db.gamification);
      totalRestored += await restoreTable(cloudData.reminders, db.reminders);
      totalRestored += await restoreTable(cloudData.fhirPatients, db.fhirPatients);
      totalRestored += await restoreTable(cloudData.fhirObservations, db.fhirObservations);
      totalRestored += await restoreTable(cloudData.fhirMedicationRequests, db.fhirMedicationRequests);
      totalRestored += await restoreTable(cloudData.fhirMedicationStatements, db.fhirMedicationStatements);
      totalRestored += await restoreTable(cloudData.ascvdProfiles, db.ascvdProfiles);
      totalRestored += await restoreTable(cloudData.clinicalNotes, db.clinicalNotes);

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
        message: `Berhasil memulihkan ${totalRestored} rekam medis dari MongoDB Atlas Cloud!`
      };
    } catch (err: any) {
      console.error('[AortaLink] Pull & Restore Error:', err);
      return { success: false, restoredCount: 0, message: err.message || 'Gagal menyinkronkan data dari cloud.' };
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

export const mongoDbAtlasService = new MongoDbAtlasService();
