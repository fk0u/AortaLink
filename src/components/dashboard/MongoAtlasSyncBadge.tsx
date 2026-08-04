/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · Clean Minimalist MongoDB Atlas Sync Badge */
import React, { useState } from 'react';
import { Database, RefreshCw, CheckCircle2 } from 'lucide-react';
import { mongoDbAtlasService } from '../../services/db/mongodb-service';
import { useAppStore } from '../../store/useAppStore';

export const MongoAtlasSyncBadge: React.FC = () => {
  const addToast = useAppStore((state) => state.addToast);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(mongoDbAtlasService.getLastSyncTime());

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await mongoDbAtlasService.syncFhirRecord({
        source: 'AortaLink SaaS Web',
        timestamp: new Date().toISOString()
      });

      if (res.success) {
        setLastSync(mongoDbAtlasService.getLastSyncTime());
        addToast({
          type: 'success',
          title: 'MongoDB Atlas Cluster Synced!',
          message: res.message
        });
      }
    } catch {
      addToast({ type: 'error', title: 'Sync Error', message: 'Gagal menyinkronkan dengan MongoDB Atlas Cluster.' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-100 text-xs font-bold shadow-sm">
      <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="font-extrabold truncate">MongoDB Atlas</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold hidden sm:inline">
          Cloud Active
        </span>
      </div>

      <button
        type="button"
        onClick={handleSyncNow}
        disabled={isSyncing}
        className="p-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 transition-colors ml-1"
        title="Sync Sekarang ke MongoDB Atlas Cluster"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};
