import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAppStore } from '../../store/useAppStore';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import { createBackupFilename, createBackupPayload, downloadJsonFile, normalizeBackupPayload, restoreBackupPayload } from '../../utils/backup';
import { ArrowLeft, CloudUpload, Download, Palette, RefreshCw, ShieldCheck, Smartphone, Upload, Wifi, Database, FileJson, MoonStar, SunMedium, CircleGauge, Bell, BellOff } from 'lucide-react';
import {
  isNotificationSupported,
  requestNotificationPermission,
  getNotificationPermission,
  areNotificationsActive,
  setNotificationEnabled,
  loadNotificationPreference,
  sendTestNotification,
} from '../../services/notifications/push-service';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void> | void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const addToast = useAppStore((state) => state.addToast);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Notification toggle state
  const [notificationsEnabled, setNotificationsEnabledState] = useState<boolean>(false);
  const [notificationsSupported, setNotificationsSupported] = useState<boolean>(false);
  const [notificationsPermitted, setNotificationsPermitted] = useState<boolean>(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as InstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Initialize notification state
    const supported = isNotificationSupported();
    setNotificationsSupported(supported);
    if (supported) {
      const permitted = getNotificationPermission() === 'granted';
      setNotificationsPermitted(permitted);
      const enabled = loadNotificationPreference();
      setNotificationsEnabledState(enabled);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const themeOptions = useMemo(
    () => [
      { key: 'light' as const, label: 'Terang', icon: <SunMedium className="w-4 h-4" /> },
      { key: 'dark' as const, label: 'Gelap', icon: <MoonStar className="w-4 h-4" /> },
      { key: 'system' as const, label: 'Sistem', icon: <CircleGauge className="w-4 h-4" /> }
    ],
    []
  );

  const handleExport = async () => {
    playClickSound();
    try {
      setIsExporting(true);
      const payload = await createBackupPayload();
      downloadJsonFile(createBackupFilename(), payload);
      playSuccessChime();
      addToast({ type: 'success', title: 'Backup Diekspor', message: 'File JSON backup berhasil diunduh.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Gagal Ekspor', message: 'Tidak dapat membuat file backup.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    playClickSound();
    try {
      setIsImporting(true);
      const text = await file.text();
      const payload = normalizeBackupPayload(JSON.parse(text));
      const shouldReplace = window.confirm('Impor akan mengganti seluruh data lokal yang ada. Lanjutkan?');
      if (!shouldReplace) {
        return;
      }

      await restoreBackupPayload(payload);
      playSuccessChime();
      addToast({ type: 'success', title: 'Backup Dipulihkan', message: 'Data berhasil diimpor ulang dari file JSON.' });
      window.location.reload();
    } catch (error) {
      addToast({ type: 'error', title: 'Gagal Impor', message: error instanceof Error ? error.message : 'File backup tidak dapat dibaca.' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      addToast({ type: 'info', title: 'PWA Siap', message: 'Gunakan menu browser untuk memasang aplikasi ini.' });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        setIsStandalone(true);
        addToast({ type: 'success', title: 'PWA Terpasang', message: 'AortaLink berhasil dipasang sebagai aplikasi.' });
      }
      setDeferredPrompt(null);
    } catch (error) {
      addToast({ type: 'error', title: 'Gagal Memasang', message: 'Browser tidak mengizinkan prompt instalasi.' });
    }
  };

  const handleNotificationToggle = async () => {
    playClickSound();
    // If turning on and permission not yet granted, request it first
    if (!notificationsEnabled) {
      if (!notificationsPermitted) {
        const permission = await requestNotificationPermission();
        if (permission === 'granted') {
          setNotificationsPermitted(true);
          setNotificationsEnabledState(true);
          setNotificationEnabled(true);
          await sendTestNotification();
          addToast({ type: 'success', title: 'Notifikasi Diaktifkan', message: 'Notifikasi pengingat tensi & obat berhasil diaktifkan.' });
        } else {
          addToast({ type: 'warning', title: 'Izin Ditolak', message: 'Notifikasi tidak dapat diaktifkan tanpa izin browser.' });
        }
        return;
      }
      setNotificationsEnabledState(true);
      setNotificationEnabled(true);
      await sendTestNotification();
      addToast({ type: 'success', title: 'Notifikasi Diaktifkan', message: 'Notifikasi pengingat tensi & obat berhasil diaktifkan.' });
    } else {
      setNotificationsEnabledState(false);
      setNotificationEnabled(false);
      addToast({ type: 'info', title: 'Notifikasi Dimatikan', message: 'Notifikasi pengingat telah dinonaktifkan.' });
    }
  };

  return (
    <section className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              navigate({ to: '/' });
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Dashboard
          </button>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Sistem &amp; Cadangan
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
              Halaman Pengaturan
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Kelola tampilan, backup data, dan status PWA dari satu layar.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              fileInputRef.current?.click();
            }}
            disabled={isImporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-extrabold text-xs text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? 'Mengimpor...' : 'Impor Backup'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 text-white font-extrabold text-xs shadow-lg shadow-teal-500/20 active:scale-95 transition-all disabled:opacity-60"
            disabled={isExporting}
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Mengekspor...' : 'Ekspor Backup'}
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        aria-label="Impor file backup JSON"
        title="Impor file backup JSON"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImportFile(file);
          }
          event.target.value = '';
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <article className="hallmark-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Tema Tampilan</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pilih mode visual yang paling nyaman dipakai.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {themeOptions.map((option) => {
              const isActive = theme === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setTheme(option.key);
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border font-extrabold text-sm transition-all active:scale-95 ${
                    isActive
                      ? 'bg-teal-500 text-white border-teal-500 shadow-md shadow-teal-500/20'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              );
            })}
          </div>
        </article>

        <article className="hallmark-card p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Status PWA</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Instalasi aplikasi dan koneksi offline-first.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mode Aplikasi</p>
              <p className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">{isStandalone ? 'Terpasang' : 'Browser'}</p>
            </div>
            <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Koneksi</p>
              <p className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">{isOnline ? 'Online' : 'Offline'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleInstall}
              disabled={isStandalone}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-sm active:scale-95 transition-all disabled:opacity-60"
            >
              <CloudUpload className="w-4 h-4" />
              {isStandalone ? 'Sudah Terpasang' : 'Pasang Aplikasi'}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-extrabold text-sm text-slate-700 dark:text-slate-200 active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Muat Ulang Aplikasi
            </button>
          </div>
        </article>

        {/* Notifikasi Card */}
        {notificationsSupported && (
          <article className="hallmark-card p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Notifikasi</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {notificationsPermitted ? 'Pengingat tensi & obat aktif.' : 'Aktifkan izin browser untuk notifikasi pengingat.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {notificationsEnabled ? 'Notifikasi Aktif' : 'Notifikasi Mati'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {notificationsEnabled
                    ? 'Anda akan menerima pengingat sesuai jadwal.'
                    : 'Aktifkan untuk menerima pengingat terjadwal.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleNotificationToggle}
                className={`relative w-14 h-8 rounded-full transition-colors focus:outline-none ${
                  notificationsEnabled ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
                role="switch"
                aria-checked={notificationsEnabled}
                aria-label="Toggle notifikasi"
              >
                <span
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                    notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </article>
        )}

        <article className="hallmark-card p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Backup Data Lokal</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Simpan dan pulihkan seluruh data profil, tensi, pengingat, dan kebiasaan.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileJson className="w-3 h-3" /> Format
              </p>
              <p className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">JSON backup</p>
            </div>
            <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Wifi className="w-3 h-3" /> Sinkronisasi
              </p>
              <p className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">Offline-first lokal</p>
            </div>
            <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3" /> Aksi Aman
              </p>
              <p className="mt-1 font-extrabold text-slate-900 dark:text-slate-100">Konfirmasi sebelum timpa data</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
};
