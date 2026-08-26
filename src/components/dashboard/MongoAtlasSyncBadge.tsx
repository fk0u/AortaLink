/* Minimalist Real-Time Auto-Sync Status Indicator (Zero MongoDB Atlas Technical Jargon) */
import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2 } from '../icons/AppIcons';
import { mongoDbAtlasService } from '../../services/db/mongodb-service';
import { useAuthStore } from '../../store/useAuthStore';

export const MongoAtlasSyncBadge: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const syncCloudData = useAuthStore((state) => state.syncCloudData);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => mongoDbAtlasService.getLastSyncTime());

  // Realtime periodic background sync for authenticated non-guest users
  useEffect(() => {
    if (!isAuthenticated || user?.authProvider === 'guest') return;

    const interval = setInterval(async () => {
      try {
        setIsSyncing(true);
        await syncCloudData();
        setLastSyncTime(new Date().toISOString());
      } catch {
        // quiet background sync
      } finally {
        setIsSyncing(false);
      }
    }, 30000); // sync every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, user?.authProvider, syncCloudData]);

  // Window focus listener for instant real-time sync across devices
  useEffect(() => {
    if (!isAuthenticated || user?.authProvider === 'guest') return;

    const handleFocus = async () => {
      try {
        setIsSyncing(true);
        await syncCloudData();
        setLastSyncTime(new Date().toISOString());
      } catch {
        // quiet
      } finally {
        setIsSyncing(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, user?.authProvider, syncCloudData]);

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-900/40 text-teal-900 dark:text-teal-200 text-[11px] font-mono">
      <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
      <span className="font-medium">
        {isSyncing ? 'Menyinkronkan...' : 'Realtime Sync'}
      </span>
      {isSyncing && <RefreshCw size={11} className="animate-spin text-teal-600 dark:text-teal-400 ml-0.5" />}
    </div>
  );
};
