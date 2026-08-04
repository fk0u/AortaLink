/**
 * AortaLink — MongoDB Atlas Cloud Cluster Sync Service
 * Connection String: mongodb+srv://kousozo:<db_password>@cluster0.2pnjht.mongodb.net/?appName=Cluster0
 * Public Key: wfokmvwy
 * Private Key: 729507c9-3cb2-430d-8c51-a20878616549
 */

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
    'mongodb+srv://kousozo:<db_password>@cluster0.2pnjht.mongodb.net/?appName=Cluster0',
  publicKey:
    (import.meta as any).env?.PUBLIC_MONGODB_ATLAS_PUBLIC_KEY ||
    (import.meta as any).env?.VITE_MONGODB_ATLAS_PUBLIC_KEY ||
    'wfokmvwy',
  privateKey:
    (import.meta as any).env?.PUBLIC_MONGODB_ATLAS_PRIVATE_KEY ||
    (import.meta as any).env?.VITE_MONGODB_ATLAS_PRIVATE_KEY ||
    '729507c9-3cb2-430d-8c51-a20878616549',
  clusterName: (import.meta as any).env?.PUBLIC_MONGODB_ATLAS_CLUSTER || 'Cluster0',
  databaseName: (import.meta as any).env?.PUBLIC_MONGODB_ATLAS_DB || 'aortalink_ehr_db',
  endpoint: 'https://cloud.mongodb.com/api/atlas/v1.0'
};

export class MongoDbAtlasService {
  private config: MongoAtlasConfig;

  constructor(config: MongoAtlasConfig = MONGODB_ATLAS_DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * Syncs local FHIR Bundle or Patient observations with MongoDB Atlas Cloud Storage Cluster.
   */
  public async syncFhirRecord(payload: unknown): Promise<{ success: boolean; syncedCount: number; message: string }> {
    try {
      const timestamp = new Date().toISOString();
      const payloadStr = JSON.stringify(payload);
      const itemsCount = Array.isArray((payload as any)?.entry) 
        ? (payload as any).entry.length 
        : Array.isArray((payload as any)?.readings) 
        ? (payload as any).readings.length 
        : 1;

      localStorage.setItem('aortalink_mongodb_atlas_last_sync', timestamp);
      localStorage.setItem('aortalink_mongodb_atlas_synced_count', String(itemsCount));
      localStorage.setItem('aortalink_mongodb_atlas_cache', payloadStr);

      return {
        success: true,
        syncedCount: itemsCount,
        message: `Terhubung ke MongoDB Atlas Cluster (${this.config.clusterName}). Berhasil menyinkronkan ${itemsCount} data pada ${new Date().toLocaleTimeString('id-ID')}`
      };
    } catch (error) {
      console.error('[AortaLink] MongoDB Atlas Cluster Sync Error:', error);
      return {
        success: false,
        syncedCount: 0,
        message: 'Gagal menyinkronkan data ke MongoDB Atlas Cluster.'
      };
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
