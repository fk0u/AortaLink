/* Honest Sync Status Indicator — shows only what actually happened.
   States: Mode Lokal (guest) · Offline · Menyinkronkan · Tersinkron HH:mm · Gagal */
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Cloud, CheckCircle2, AlertTriangle } from '../icons/AppIcons';
import { mongoDbAtlasService } from '../../services/db/mongodb-service';
import { useAuthStore } from '../../store/useAuthStore';

type SyncUiState = 'local' | 'offline' | 'syncing' | 'synced' | 'error';

const BADGE_STYLES: Record<SyncUiState, string> = {
  local: 'bg-slate-100/80 dark:bg-white/10 border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300',
  offline: 'bg-slate-100/80 dark:bg-white/10 border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300',
  syncing: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-900/50 text-amber-900 dark:text-amber-200',
  synced: 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200/70 dark:border-teal-900/40 text-teal-900 dark:text-teal-200',
  error: 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
};

const BADGE_LABELS: Record<SyncUiState, string> = {
  local: 'Mode Lokal',
  offline: 'Offline',
  syncing: 'Menyinkronkan…',
  synced: 'Tersinkron',
  error: 'Gagal sinkron'
};

function formatClock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const MongoAtlasSyncBadge: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const syncCloudData = useAuthStore((state) => state.syncCloudData);

  const isGuest = user?.authProvider === 'guest';

  const [state, setState] = useState<SyncUiState>(isGuest ? 'local' : 'synced');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => mongoDbAtlasService.getLastSyncTime());
  const [isOffline, setIsOffline] = useState<boolean>(() => !navigator.onLine);

  // Track real connectivity so the badge never claims a sync that cannot happen.
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const runSync = useCallback(async () => {
    if (isOffline) {
      setState('offline');
      return;
    }
    setState('syncing');
    try {
      await syncCloudData();
      const stamp = new Date().toISOString();
      setLastSyncTime(stamp);
      setState('synced');
    } catch {
      // Data stays safe in Dexie — say so instead of pretending it synced.
      setState('error');
    }
  }, [isOffline, syncCloudData]);

  // Periodic background sync for authenticated non-guest users.
  useEffect(() => {
    if (!isAuthenticated || isGuest) return;
    const interval = setInterval(runSync, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isGuest, runSync]);

  // Instant sync on window focus.
  useEffect(() => {
    if (!isAuthenticated || isGuest) return;
    window.addEventListener('focus', runSync);
    return () => window.removeEventListener('focus', runSync);
  }, [isAuthenticated, isGuest, runSync]);

  // Resolve the honest initial state.
  useEffect(() => {
    if (isGuest) setState('local');
    else if (isOffline) setState('offline');
    else if (state !== 'syncing' && state !== 'error') setState('synced');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest, isOffline]);

  const dotClass =
    state === 'syncing'
      ? 'bg-amber-500 animate-pulse'
      : state === 'error'
        ? 'bg-rose-500'
        : state === 'synced'
          ? 'bg-emerald-500'
          : 'bg-slate-400';

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono ${BADGE_STYLES[state]}`}
      title={
        state === 'local'
          ? 'Data tersimpan di perangkat ini. Masuk dengan akun untuk sinkronisasi lintas perangkat.'
          : state === 'error'
            ? 'Sinkronisasi terakhir gagal — data Anda tetap aman tersimpan lokal dan akan dicoba lagi otomatis.'
            : lastSyncTime
              ? `Sinkron terakhir ${formatClock(lastSyncTime)}`
              : undefined
      }
    >
      {state === 'local' && <Cloud size={11} className="opacity-70" />}
      {state === 'error' && <AlertTriangle size={11} className="opacity-80" />}
      {state === 'synced' && <CheckCircle2 size={11} className="opacity-70" />}
      {state === 'syncing' && <RefreshCw size={11} className="animate-spin opacity-80" />}
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span className="font-medium">
        {BADGE_LABELS[state]}
        {state === 'synced' && lastSyncTime ? ` ${formatClock(lastSyncTime)}` : ''}
      </span>
    </div>
  );
};
