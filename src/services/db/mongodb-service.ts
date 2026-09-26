import { db } from '../../db';
import { useAppStore } from '../../store/useAppStore';

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

export const mongoDbAtlasService = new MongoDbAtlasService();
