/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · Apple Native APK/IPA Archetype */
import React, { useEffect, useState } from 'react';
import { useRouterState, useNavigate } from '@tanstack/react-router';
import { seedInitialData, db } from './db';
import { useProfiles } from './hooks/useProfiles';
import { useReadings } from './hooks/useReadings';
import { useAppStore } from './store/useAppStore';
import { getScreenKey, isPrimaryTab, primaryTabPaths } from './utils/navigation';
import { speakTextIndonesian } from './utils/speech-reader';
import { classifyBP } from './utils/bp-classifier';
import { playClickSound, playSuccessChime } from './utils/audio-fx';

// Layout
import { Header } from './components/layout/Header';
import { Navigation, NavTab } from './components/layout/Navigation';

// Dashboard & Calendar Components
import { StatCards } from './components/dashboard/StatCards';
import { BPTrendChart } from './components/dashboard/BPTrendChart';
import { EmergencyAlert } from './components/dashboard/EmergencyAlert';
import { AppleHealthRings } from './components/dashboard/AppleHealthRings';
import { CalendarView } from './components/calendar/CalendarView';

// Readings Components
import { ReadingCard } from './components/readings/ReadingCard';
import { HistoryFilter } from './components/readings/HistoryFilter';
import { ReadingFormModal } from './components/readings/ReadingFormModal';

// Modals & Common
import { ProfileModal } from './components/profiles/ProfileModal';
import { ExportPdfModal } from './components/reports/ExportPdfModal';
import { ReminderModal } from './components/reminders/ReminderModal';
import { ToastContainer } from './components/common/Toast';
import { ConfirmModal } from './components/common/ConfirmModal';
import { BPRestTimerModal } from './components/timer/BPRestTimerModal';
import { ShimmerSkeletonCard } from './components/common/ShimmerSkeleton';

// Action & Habit Modals
import { SecurityBackupModal } from './components/security/SecurityBackupModal';
import { SodiumTrackerModal } from './components/dash/SodiumTrackerModal';
import { FamilySOSModal } from './components/emergency/FamilySOSModal';
import { MedicationTrackerModal } from './components/meds/MedicationTrackerModal';
import { HabitsTrackerModal } from './components/habits/HabitsTrackerModal';
import { ProfilePage } from './components/pages/ProfilePage';
import { SettingsPage } from './components/pages/SettingsPage';
import { MobileToolsSheet } from './components/layout/MobileToolsSheet';

// Bluetooth pairing
import { DevicePairingButton } from './components/bluetooth/DevicePairingButton';

// Gamification
import { StreakBadges } from './components/gamification/StreakBadges';

// Icons
import {
  Plus,
  FileText,
  Bell,
  Heart,
  Download,
  Calendar as CalendarIcon,
  Sparkles,
  ArrowRight,
  Timer,
  Volume2,
  Utensils,
  AlertTriangle,
  Pill,
  Moon,
  RefreshCw,
  Clock
} from 'lucide-react';

export function App() {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  const screenKey = getScreenKey(routerState.location.pathname);

  const activeTab: NavTab = isPrimaryTab(screenKey) ? screenKey : 'dashboard';
  const showPrimaryNavigation = isPrimaryTab(screenKey);

  const handleTabChange = (tab: NavTab) => {
    navigate({ to: primaryTabPaths[tab] });
  };

  const [isDbReady, setIsDbReady] = useState(false);
  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);

  // Quick Tools Modal States
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isSodiumModalOpen, setIsSodiumModalOpen] = useState(false);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isHabitsModalOpen, setIsHabitsModalOpen] = useState(false);

  const { activeProfile } = useProfiles();
  const { readings, rawReadings, stats, isLoading } = useReadings();

  // Cache & Reload Zustand Store States
  const isDataRefreshing = useAppStore((state) => state.isDataRefreshing);
  const cacheTimestamp = useAppStore((state) => state.cacheTimestamp);
  const setDataRefreshing = useAppStore((state) => state.setDataRefreshing);
  const setCacheDirty = useAppStore((state) => state.setCacheDirty);
  const addToast = useAppStore((state) => state.addToast);

  const openReadingModal = useAppStore((state) => state.openReadingModal);
  const openExportPdfModal = useAppStore((state) => state.openExportPdfModal);
  const openReminderModal = useAppStore((state) => state.openReminderModal);

  // Deleting reading confirmation state
  const [deletingReadingId, setDeletingReadingId] = useState<number | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('heartsync-theme');
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      setTheme(savedTheme);
    }
  }, [setTheme]);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const resolvedTheme = theme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : theme;
      root.classList.toggle('dark', resolvedTheme === 'dark');
      root.style.colorScheme = resolvedTheme;
      localStorage.setItem('heartsync-theme', theme);
    };

    applyTheme();

    const handleMediaChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [theme]);

  // Initialize DB
  useEffect(() => {
    async function init() {
      try {
        await seedInitialData();
      } catch (err) {
        console.error('Error initializing DB:', err);
      } finally {
        setIsDbReady(true);
      }
    }
    init();
  }, []);

  // Global Keyboard Shortcuts (Alt+N or Ctrl+N to open Reading Form)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openReadingModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openReadingModal]);

  const handleDeleteReading = async () => {
    if (!deletingReadingId) return;
    try {
      await db.readings.delete(deletingReadingId);
      addToast({
        type: 'success',
        title: 'Data Dihapus',
        message: 'Catatan tekanan darah berhasil dihapus.'
      });
      setCacheDirty(true);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Gagal Menghapus',
        message: 'Terjadi kesalahan saat menghapus data.'
      });
    } finally {
      setDeletingReadingId(null);
    }
  };

  const handleSpeakLatestReading = () => {
    playClickSound();
    const latest = stats.latestReading;
    const category = latest ? classifyBP(latest.systolic, latest.diastolic) : null;
    if (!latest) {
      speakTextIndonesian('Belum ada data pengukuran tekanan darah.');
      return;
    }
    const categoryText = category ? category.label : '';
    const speechMsg = `Tekanan darah ${activeProfile?.name || 'Pasien'} saat ini adalah ${latest.systolic} per ${latest.diastolic} milimeter raksa, dengan denyut nadi ${latest.pulse} detak per menit. Kategori ${categoryText}.`;
    speakTextIndonesian(speechMsg);
  };

  const handleManualCacheRefresh = () => {
    playClickSound();
    setDataRefreshing(true);
    setCacheDirty(true);

    setTimeout(() => {
      setDataRefreshing(false);
      playSuccessChime();
      addToast({
        type: 'success',
        title: 'Cache Database Diperbarui',
        message: 'Memuat data paling mutakhir dari IndexedDB secara real-time.'
      });
    }, 600);
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center animate-bounce shadow-xl shadow-teal-500/30">
          <Heart className="w-6 h-6 fill-white" />
        </div>
        <p className="text-sm font-bold text-slate-400">Memuat HeartSync...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-28 md:pb-8 transition-colors">
      
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Modals */}
      <ReadingFormModal />
      <ProfileModal />
      <ExportPdfModal />
      <ReminderModal />

      {/* Apple HIG Clean Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 md:space-y-8">

        {screenKey === 'profile' ? (
          <ProfilePage />
        ) : screenKey === 'settings' ? (
          <SettingsPage />
        ) : (
          <>
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
            
            {/* Apple SwiftUI Pull/Tap-to-Refresh & Cache Info Bar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1 text-xs">
              <div className="flex items-center gap-2 text-slate-400 font-semibold min-w-0">
                <Clock className="w-3.5 h-3.5" />
                <span className="min-w-0 truncate">Cache: {cacheTimestamp ? `Terakhir sinkron ${new Date(cacheTimestamp).toLocaleTimeString('id-ID')}` : 'Belum sinkron'}</span>
              </div>
              <button
                type="button"
                onClick={handleManualCacheRefresh}
                disabled={isDataRefreshing}
                className="inline-flex items-center gap-2 font-bold text-teal-600 dark:text-teal-400 hover:underline active:scale-95 transition-all self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDataRefreshing ? 'animate-spin' : ''}`} />
                {isDataRefreshing ? 'Menyinkronkan...' : 'Segarkan Data'}
              </button>
            </div>

            {/* Quick Rest Protocol Banner */}
            <div className="hallmark-card p-4 md:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gradient-to-r from-teal-500/10 via-sky-500/10 to-transparent border border-teal-500/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-2xl bg-teal-500 text-white shadow-md shadow-teal-500/20 shrink-0">
                  <Timer className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                    Protokol Istirahat Medis (5 Menit)
                  </h4>
                  <p className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                    Rilekskan pikiran dan tubuh sebelum melakukan pengukuran tekanan darah.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsRestTimerOpen(true);
                }}
                className="hallmark-button-secondary px-4 py-3 text-xs shrink-0 font-bold active:scale-95 min-h-11"
              >
                Mulai Timer
              </button>
            </div>

            {/* Emergency Crisis Alert */}
            <EmergencyAlert latestReading={stats.latestReading} />

            {/* Loader / Stat Cards */}
            {isLoading || isDataRefreshing ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                <div className="md:col-span-2">
                  <ShimmerSkeletonCard type="stats" />
                </div>
                <ShimmerSkeletonCard type="stats" />
              </div>
            ) : (
              <StatCards stats={stats} onOpenNewReading={() => openReadingModal()} />
            )}

            {/* Gamification: Streak & Badges */}
            {!isLoading && !isDataRefreshing && (
              <StreakBadges />
            )}

            {/* Apple Health Style Category Breakdown */}
            {isLoading || isDataRefreshing ? (
              <ShimmerSkeletonCard type="stats" />
            ) : (
              <AppleHealthRings readings={rawReadings || []} />
            )}

            {/* SwiftUI Quick Tools & Accessibility Grid */}
            <div className="space-y-4 md:space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Peralatan &amp; Pelacak Kebiasaan Gaya Hidup
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:gap-3">
                
                {/* Bluetooth BP Monitor Pairing */}
                <DevicePairingButton />

                {/* Habits & Sleep Tracker */}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsHabitsModalOpen(true);
                  }}
                  className="hallmark-card p-4 text-left active:scale-[0.98] transition-all space-y-2 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/10 min-h-32"
                >
                  <div className="p-2 rounded-xl bg-indigo-500 text-white w-fit shadow-md shadow-indigo-500/20">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">Kebiasaan &amp; Tidur</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Jam tidur, HP &amp; outdoor</p>
                  </div>
                </button>

                {/* Voice Assistant */}
                <button
                  type="button"
                  onClick={handleSpeakLatestReading}
                  className="hallmark-card p-4 text-left active:scale-[0.98] transition-all space-y-2 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-32"
                >
                  <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 w-fit">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">Asisten Suara</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Bacakan hasil tensi terakhir</p>
                  </div>
                </button>

                {/* Sodium Tracker */}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsSodiumModalOpen(true);
                  }}
                  className="hallmark-card p-4 text-left active:scale-[0.98] transition-all space-y-2 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-32"
                >
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 w-fit">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">Pelacak Garam</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Batas sodium harian DASH</p>
                  </div>
                </button>

                {/* Medication Routine */}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsMedModalOpen(true);
                  }}
                  className="hallmark-card p-4 text-left active:scale-[0.98] transition-all space-y-2 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer min-h-32"
                >
                  <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 w-fit">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">Jadwal Obat</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Disiplin konsumsi dosis</p>
                  </div>
                </button>

                {/* SOS Caregiver */}
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsSOSModalOpen(true);
                  }}
                  className="hallmark-card p-4 text-left active:scale-[0.98] transition-all space-y-2 flex flex-col justify-between hover:bg-slate-50 dark:hover:bg-slate-800 border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10 cursor-pointer min-h-32"
                >
                  <div className="p-2 rounded-xl bg-rose-500 text-white w-fit shadow-md shadow-rose-500/20">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">Kontak Darurat</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Kirim SOS WhatsApp</p>
                  </div>
                </button>

              </div>
            </div>

            {/* Responsive Dashboard Split Layout for Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-start">
              
              {/* Left Column: Trend Graph */}
              <div className="lg:col-span-2">
                {isLoading || isDataRefreshing ? (
                  <ShimmerSkeletonCard type="chart" />
                ) : (
                  <BPTrendChart readings={rawReadings || []} />
                )}
              </div>

              {/* Right Column: Recent Readings */}
              <div className="space-y-4 md:space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 min-w-0">
                    Catatan Terbaru ({activeProfile?.name || 'Pasien'})
                  </h3>
                  {readings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleTabChange('history')}
                      className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isLoading || isDataRefreshing ? (
                  <ShimmerSkeletonCard type="list" />
                ) : readings.length > 0 ? (
                    <div className="space-y-3">
                    {readings.slice(0, 3).map((r) => (
                      <ReadingCard
                        key={r.id}
                        reading={r}
                        onEdit={(readingToEdit) => openReadingModal(readingToEdit)}
                        onDelete={(id) => setDeletingReadingId(id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center hallmark-card space-y-2">
                    <Heart className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                    <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      Jurnal Masih Kosong
                    </h4>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Aplikasi bebas data mock. Tekan tombol + di bawah untuk memasukkan tensi real.
                    </p>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: HISTORY & CALENDAR VIEW */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Jurnal &amp; Kalender Tekanan Darah Real
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kalender bulanan interaktif, pencarian tanggal terdahulu, dan pencarian data
              </p>
            </div>

            {/* Interactive Calendar System */}
            <CalendarView readings={rawReadings || []} />

            {/* History Filter Bar */}
            <HistoryFilter />

            {/* Readings List Grid */}
            {isLoading || isDataRefreshing ? (
              <ShimmerSkeletonCard type="list" />
            ) : readings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {readings.map((r) => (
                  <ReadingCard
                    key={r.id}
                    reading={r}
                    onEdit={(readingToEdit) => openReadingModal(readingToEdit)}
                    onDelete={(id) => setDeletingReadingId(id)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-10 text-center hallmark-card space-y-2">
                <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <h4 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                  Tidak Ada Catatan
                </h4>
                <p className="text-xs text-slate-400">
                  Tidak ditemukan data yang sesuai dengan pencarian.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DOCTOR REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-4 animate-in fade-in duration-300 max-w-2xl mx-auto">
            <div className="text-center space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Laporan Medis PDF
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                Ekspor Laporan Dokter
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Format bersih 1-klik untuk dokter konsultasi.
              </p>
            </div>

            <div className="p-6 hallmark-card text-center space-y-4 bg-gradient-to-br from-white via-sky-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-sky-500/30">
                <FileText className="w-7 h-7" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Mencakup identitas <strong>{activeProfile?.name}</strong>, ringkasan rata-rata, rentang min/max, pengelompokkan AHA, dan tabel tensi asli.
              </p>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  openExportPdfModal();
                }}
                className="hallmark-button-primary w-full py-3.5 text-xs inline-flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                Buka Generator Laporan PDF
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: REMINDERS & SCHEDULES */}
        {activeTab === 'reminders' && (
          <div className="space-y-4 animate-in fade-in duration-300 max-w-2xl mx-auto">
            <div className="text-center space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 inline-flex items-center gap-1">
                <Bell className="w-3 h-3" /> Alarm Pengingat
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                Jadwal Pengingat Tensi &amp; Obat
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Atur waktu pengingat harian untuk pemeriksaan.
              </p>
            </div>

            <div className="p-6 hallmark-card text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
                <Bell className="w-7 h-7" />
              </div>
              <p className="text-xs text-slate-500">
                Pengingat akan membunyikan notifikasi lokal browser di waktu yang disesuaikan.
              </p>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  openReminderModal();
                }}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xl shadow-amber-500/25 inline-flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                Atur Jadwal Pengingat
              </button>
            </div>
          </div>
        )}

          </>
        )}

      </main>

      {/* Floating Bottom Navigation Bar (Hidden on desktop via Tailwind md:hidden inside component) */}
      {showPrimaryNavigation && <Navigation activeTab={activeTab} onTabChange={handleTabChange} />}

      <MobileToolsSheet />

      {/* Rest Protocol Modal */}
      <BPRestTimerModal
        isOpen={isRestTimerOpen}
        onClose={() => setIsRestTimerOpen(false)}
        onTimerComplete={() => openReadingModal()}
      />

      {/* Modals */}
      <SecurityBackupModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
      <SodiumTrackerModal
        isOpen={isSodiumModalOpen}
        onClose={() => setIsSodiumModalOpen(false)}
      />
      <FamilySOSModal
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
      />
      <MedicationTrackerModal
        isOpen={isMedModalOpen}
        onClose={() => setIsMedModalOpen(false)}
      />
      <HabitsTrackerModal
        isOpen={isHabitsModalOpen}
        onClose={() => setIsHabitsModalOpen(false)}
      />

      {/* Delete Reading Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingReadingId)}
        title="Hapus Catatan Tensi?"
        message="Apakah Anda yakin ingin menghapus data pengukuran ini dari jurnal? Aksi ini tidak dapat dibatalkan."
        isDangerous={true}
        confirmText="Ya, Hapus Catatan"
        onConfirm={handleDeleteReading}
        onCancel={() => setDeletingReadingId(null)}
      />

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200/80 dark:border-slate-800/80 py-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <p className="font-extrabold text-slate-700 dark:text-slate-300">
          HeartSync — Blood Pressure Tracker
        </p>
        <p className="text-[11px] font-medium">
          Apple Health Controlled Cache • Offline-First Secure Storage
        </p>
      </footer>
    </div>
  );
}
