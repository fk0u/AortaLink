/* Honest Sync Status Indicator — shows only what actually happened.
   States: Mode Lokal (guest) · Offline · Belum sinkron (idle) · Menyinkronkan · Tersinkron HH:mm · Gagal */
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Cloud, CheckCircle2, AlertTriangle } from '../icons/AppIcons';
import { mongoDbAtlasService } from '../../services/db/mongodb-service';
import { useAuthStore } from '../../store/useAuthStore';

type SyncUiState = 'local' | 'offline' | 'idle' | 'syncing' | 'synced' | 'error';

const BADGE_STYLES: Record<SyncUiState, string> = {
  local: 'bg-slate-100/80 dark:bg-white/10 border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300',
  offline: 'bg-slate-100/80 dark:bg-white/10 border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300',
  idle: 'bg-slate-100/80 dark:bg-white/10 border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300',
  syncing: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-900/50 text-amber-900 dark:text-amber-200',
  synced: 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200/70 dark:border-teal-900/40 text-teal-900 dark:text-teal-200',
  error: 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
};

const BADGE_LABELS: Record<SyncUiState, string> = {
  local: 'Mode Lokal',
  offline: 'Offline',
  idle: 'Belum sinkron',
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

  const [isOffline, setIsOffline] = useState<boolean>(() => !navigator.onLine);
  const [state, setState] = useState<SyncUiState>(() => {
    if (isGuest) return 'local';
    if (!navigator.onLine) return 'offline';
    return 'idle';
  });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => mongoDbAtlasService.getLastSyncTime());
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  const runSync = useCallback(async () => {
    if (!navigator.onLine) {
      setState('offline');
      return;
    }
    setState('syncing');
    try {
      await syncCloudData();
      const stamp = new Date().toISOString();
      setLastSyncTime(stamp);
      setSyncErrorMessage(null);
      setState('synced');
    } catch (err: any) {
      // Data stays safe in Dexie — say so instead of pretending it synced.
      setSyncErrorMessage(err?.message || 'Gagal sinkronisasi data.');
      setState('error');
    }
  }, [syncCloudData]);

  // Run sync immediately on mount (or when auth becomes active), then periodically every 30s.
  useEffect(() => {
    if (!isAuthenticated || isGuest) return;
    runSync();
    const interval = setInterval(runSync, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, isGuest, runSync]);

  // Instant sync on window focus.
  useEffect(() => {
    if (!isAuthenticated || isGuest) return;
    window.addEventListener('focus', runSync);
    return () => window.removeEventListener('focus', runSync);
  }, [isAuthenticated, isGuest, runSync]);

  // Track real connectivity so the badge never claims a sync that cannot happen.
  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true);
      if (!isGuest) setState('offline');
    };
    const goOnline = () => {
      setIsOffline(false);
      if (isAuthenticated && !isGuest) {
        runSync();
      }
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [isAuthenticated, isGuest, runSync]);

  // Handle guest status changes.
  useEffect(() => {
    if (isGuest) {
      setState('local');
    }
  }, [isGuest]);

  const dotClass =
    state === 'syncing'
      ? 'bg-amber-500 animate-pulse'
      : state === 'error'
        ? 'bg-rose-500'
        : state === 'synced'
          ? 'bg-emerald-500'
          : 'bg-slate-400';

  const tooltipText =
    state === 'local'
      ? 'Data tersimpan di perangkat ini. Masuk dengan akun untuk sinkronisasi lintas perangkat.'
      : state === 'offline'
        ? 'Tidak ada koneksi internet. Data Anda tetap tersimpan lokal dan akan disinkronkan saat online.'
        : state === 'error'
          ? syncErrorMessage
            ? `Sinkronisasi gagal: ${syncErrorMessage} — data Anda tetap aman tersimpan lokal. Klik untuk mencoba lagi.`
            : 'Sinkronisasi terakhir gagal — data Anda tetap aman tersimpan lokal dan akan dicoba lagi otomatis. Klik untuk mencoba lagi.'
          : state === 'idle'
            ? 'Menunggu sinkronisasi pertama dengan server. Klik untuk sinkronisasi sekarang.'
            : lastSyncTime
              ? `Sinkron terakhir ${formatClock(lastSyncTime)}. Klik untuk sinkron ulang.`
              : 'Tersinkron dengan cloud. Klik untuk sinkron ulang.';

  const canManualSync = isAuthenticated && !isGuest && state !== 'syncing' && !isOffline;

  return (
    <button
      type="button"
      onClick={canManualSync ? runSync : undefined}
      disabled={!canManualSync}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-colors ${
        canManualSync ? 'cursor-pointer hover:opacity-90 active:scale-[0.98]' : 'cursor-default'
      } ${BADGE_STYLES[state]}`}
      title={tooltipText}
    >
      {state === 'local' && <Cloud size={11} className="opacity-70" />}
      {state === 'offline' && <Cloud size={11} className="opacity-70" />}
      {state === 'idle' && <Cloud size={11} className="opacity-70" />}
      {state === 'error' && <AlertTriangle size={11} className="opacity-80" />}
      {state === 'synced' && <CheckCircle2 size={11} className="opacity-70" />}
      {state === 'syncing' && <RefreshCw size={11} className="animate-spin opacity-80" />}
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span className="font-medium">
        {BADGE_LABELS[state]}
        {state === 'synced' && lastSyncTime ? ` ${formatClock(lastSyncTime)}` : ''}
      </span>
    </button>
  );
};

