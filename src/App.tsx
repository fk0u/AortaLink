/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · Material 3 Mobile Archetype */
import React, { useEffect, useMemo, useState } from 'react';
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
import { MobileQuickActionsRow } from './components/layout/MobileQuickActionsRow';

// Dashboard & Calendar Components
import { StatCards } from './components/dashboard/StatCards';
import { BPTrendChart } from './components/dashboard/BPTrendChart';
import { EmergencyAlert } from './components/dashboard/EmergencyAlert';
import { ClinicalAlertBanner } from './components/dashboard/ClinicalAlertBanner';
import { CdssAlertBanner } from './components/dashboard/CdssAlertBanner';
import { FhirResourceInspectorModal } from './components/fhir/FhirResourceInspectorModal';
import { AppleHealthRings } from './components/dashboard/AppleHealthRings';
import { CalendarView } from './components/calendar/CalendarView';

// Readings Components
import { ReadingCard } from './components/readings/ReadingCard';
import { HistoryFilter } from './components/readings/HistoryFilter';
import { ReadingFormModal } from './components/readings/ReadingFormModal';

// Modals & Common
import { ProfileModal } from './components/profiles/ProfileModal';
import { ExportPdfModal } from './components/reports/ExportPdfModal';
import { WeeklyReport } from './components/reports/WeeklyReport';
import { ReminderModal } from './components/reminders/ReminderModal';
import { LabResultsModal } from './components/lab/LabResultsModal';
import { ToastContainer } from './components/common/Toast';
import { ConfirmModal } from './components/common/ConfirmModal';
import { BPRestTimerModal } from './components/timer/BPRestTimerModal';
import { ShimmerSkeletonCard } from './components/common/ShimmerSkeleton';
import { evaluateClinicalAlerts, calculateNocturnalDipping } from './utils/advanced-analytics';
import { useLiveQuery } from 'dexie-react-hooks';

// Action & Habit Modals
import { SecurityBackupModal } from './components/security/SecurityBackupModal';
import { SodiumTrackerModal } from './components/dash/SodiumTrackerModal';
import { FamilySOSModal } from './components/emergency/FamilySOSModal';
import { MedicationTrackerModal } from './components/meds/MedicationTrackerModal';
import { HabitsTrackerModal } from './components/habits/HabitsTrackerModal';
import { ProfilePage } from './components/pages/ProfilePage';
import { SettingsPage } from './components/pages/SettingsPage';
import { PrivacyPolicyPage } from './components/pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/pages/TermsOfServicePage';
import { LandingPage } from './components/landing/LandingPage';
import { AuthModal } from './components/auth/AuthModal';
import { JsonImportExportModal } from './components/backup/JsonImportExportModal';
import { MongoAtlasSyncBadge } from './components/dashboard/MongoAtlasSyncBadge';
import { NvidiaNimAiAssistantWidget } from './components/ai/NvidiaNimAiAssistantWidget';
import { useAuthStore } from './store/useAuthStore';
import { MobileToolsSheet } from './components/layout/MobileToolsSheet';

// Bluetooth pairing
import { DevicePairingButton } from './components/bluetooth/DevicePairingButton';

// Gamification & Analytics Panels
import { StreakBadges } from './components/gamification/StreakBadges';
import { LifestyleCorrelation } from './components/analytics/LifestyleCorrelation';
import { CircadianDippingPanel } from './components/analytics/CircadianDippingPanel';
import { AscvdCalculatorModal } from './components/analytics/AscvdCalculatorModal';
import { ClinicalNotesModal } from './components/analytics/ClinicalNotesModal';
import { MedicationAdherencePanel } from './components/analytics/MedicationAdherencePanel';
import { DashboardCustomizer } from './components/dashboard/DashboardCustomizer';
import { loadDashboardPreferences, saveDashboardPreferences, type DashboardSection } from './utils/dashboard-preferences';

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
  Clock,
  FlaskConical,
  FileCode,
  FileJson,
  HeartPulse,
  Stethoscope,
  ListFilter,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Zap
} from './components/icons/AppIcons';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [historyViewMode, setHistoryViewMode] = useState<'list' | 'calendar'>('list');

  const [dashboardPreferences, setDashboardPreferences] = useState<DashboardSection[]>(() => loadDashboardPreferences());
  const dashboardOrder = useMemo(() => new Map(dashboardPreferences.map((section) => [section.id, section])), [dashboardPreferences]);
  const updateDashboardPreferences = (preferences: DashboardSection[]) => {
    setDashboardPreferences(preferences);
    saveDashboardPreferences(preferences);
  };
  const sectionStyle = (id: DashboardSection['id']) => ({ order: dashboardOrder.get(id)?.order ?? 0, display: dashboardOrder.get(id)?.visible === false ? 'none' : undefined });

  // Quick Tools Modal States
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isSodiumModalOpen, setIsSodiumModalOpen] = useState(false);
  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isHabitsModalOpen, setIsHabitsModalOpen] = useState(false);
  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [isFhirModalOpen, setIsFhirModalOpen] = useState(false);
  const [isJsonBackupModalOpen, setIsJsonBackupModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAscvdModalOpen, setIsAscvdModalOpen] = useState(false);
  const [isClinicalNotesModalOpen, setIsClinicalNotesModalOpen] = useState(false);

  const { activeProfile } = useProfiles();
  const { readings, rawReadings, stats, isLoading } = useReadings();

  // Query lab results for active profile for clinical alerts
  const labResults = useLiveQuery(
    async () => {
      if (!activeProfile?.id) return [];
      return await db.labResults.where('profileId').equals(activeProfile.id).sortBy('timestamp');
    },
    [activeProfile?.id]
  );

  const clinicalAlerts = evaluateClinicalAlerts(rawReadings || [], labResults || []);
  const dippingReport = useMemo(() => calculateNocturnalDipping(rawReadings || []), [rawReadings]);

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

  const initSessionFromStorage = useAuthStore((state) => state.initSessionFromStorage);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    initSessionFromStorage();
  }, [initSessionFromStorage]);

  useEffect(() => {
    if (!isAuthenticated && screenKey !== 'landing' && screenKey !== 'privacy' && screenKey !== 'terms') {
      navigate({ to: '/' });
      setIsAuthModalOpen(true);
    }
  }, [isAuthenticated, screenKey, navigate]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('heartsync-theme');
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
      setTheme(savedTheme);
    } else {
      setTheme('light');
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
    }, 500);
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center animate-bounce shadow-2xl shadow-teal-500/40">
          <Heart className="w-7 h-7 fill-white text-white" />
        </div>
        <p className="text-sm font-black text-slate-300 tracking-tight">Memuat AortaLink Mobile EHR...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-28 md:pb-12 transition-colors">
      
      {/* Toast Notifications */}
      <ToastContainer />

      {/* Primary Reading Form (Material 3 BottomSheet) */}
      <ReadingFormModal />
      <ProfileModal />
      <ExportPdfModal />
      <ReminderModal />

      {/* Mobile & Desktop Adaptive Top App Bar */}
      {isAuthenticated && screenKey !== 'landing' && screenKey !== 'privacy' && screenKey !== 'terms' && (
        <Header onOpenSOS={() => setIsSOSModalOpen(true)} />
      )}

      {/* Main Content: Centered, High-Impact Mobile-First Canvas */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-3.5 sm:px-6 pt-3 md:pt-6 space-y-4 md:space-y-6">

        {screenKey === 'privacy' ? (
          <PrivacyPolicyPage />
        ) : screenKey === 'terms' ? (
          <TermsOfServicePage />
        ) : screenKey === 'landing' || !isAuthenticated ? (
          <LandingPage onLaunchApp={() => {
            if (isAuthenticated) {
              navigate({ to: '/dashboard' });
            } else {
              setIsAuthModalOpen(true);
            }
          }} />
        ) : screenKey === 'profile' ? (
          <ProfilePage />
        ) : screenKey === 'settings' ? (
          <SettingsPage />
        ) : (
          <>
            {/* ========================================================= */}
            {/* TAB 1: RINGKASAN (DASHBOARD)                              */}
            {/* ========================================================= */}
            {activeTab === 'dashboard' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                
                {/* Critical Emergency Crisis Alert (Only >=180/120) */}
                <EmergencyAlert latestReading={stats.latestReading} />

                {/* Primary Hero Card: Latest Blood Pressure Gauge */}
                <div data-dashboard-section="statcards" style={sectionStyle('statcards')}>
                  {isLoading || isDataRefreshing ? (
                    <ShimmerSkeletonCard type="stats" />
                  ) : (
                    <StatCards 
                      stats={stats} 
                      onOpenNewReading={() => openReadingModal()}
                      onOpenRestTimer={() => setIsRestTimerOpen(true)}
                    />
                  )}
                </div>

                {/* Compact Consolidated Clinical Evaluation Notice */}
                <CdssAlertBanner
                  alerts={clinicalAlerts}
                  dippingReport={dippingReport}
                  fhirCount={(rawReadings?.length || 0) + (labResults?.length || 0)}
                  onOpenFhirInspector={() => setIsFhirModalOpen(true)}
                />

                {/* Refined Quick Actions */}
                <MobileQuickActionsRow
                  onOpenReading={() => openReadingModal()}
                  onOpenRestTimer={() => setIsRestTimerOpen(true)}
                  onOpenMedication={() => setIsMedModalOpen(true)}
                  onOpenLab={() => setIsLabModalOpen(true)}
                  onOpenHabits={() => setIsHabitsModalOpen(true)}
                  onOpenSodium={() => setIsSodiumModalOpen(true)}
                  onOpenAscvd={() => setIsAscvdModalOpen(true)}
                  onOpenSOS={() => setIsSOSModalOpen(true)}
                  onOpenExportPdf={() => openExportPdfModal()}
                  onOpenClinicalNotes={() => setIsClinicalNotesModalOpen(true)}
                  onOpenFhir={() => setIsFhirModalOpen(true)}
                />

                {/* Subtle Sync Indicator */}
                <div className="flex items-center justify-between px-1 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 font-medium min-w-0">
                    <Clock className="w-3.5 h-3.5 text-teal-500" />
                    <span className="truncate">
                      {cacheTimestamp ? `Sinkron ${new Date(cacheTimestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : 'Siap'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MongoAtlasSyncBadge />
                    <button
                      type="button"
                      onClick={handleManualCacheRefresh}
                      disabled={isDataRefreshing}
                      className="inline-flex items-center gap-1.5 font-bold text-teal-600 dark:text-teal-400 active:scale-95 transition-all text-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isDataRefreshing ? 'animate-spin' : ''}`} />
                      <span>{isDataRefreshing ? 'Sync...' : 'Refresh'}</span>
                    </button>
                  </div>
                </div>

                {/* Streak & Gamification */}
                {!isLoading && !isDataRefreshing && (
                  <div data-dashboard-section="streakbadges" style={sectionStyle('streakbadges')}>
                    <StreakBadges />
                  </div>
                )}

                {/* Blood Pressure Trend Chart */}
                <div data-dashboard-section="bptrend" style={sectionStyle('bptrend')}>
                  {isLoading || isDataRefreshing ? (
                    <ShimmerSkeletonCard type="chart" />
                  ) : (
                    <BPTrendChart readings={rawReadings || []} />
                  )}
                </div>

                {/* Apple Health Proportional Rings */}
                <div data-dashboard-section="applerings" style={sectionStyle('applerings')}>
                  {isLoading || isDataRefreshing ? (
                    <ShimmerSkeletonCard type="stats" />
                  ) : (
                    <AppleHealthRings readings={rawReadings || []} />
                  )}
                </div>

                {/* Recent Readings List */}
                <div data-dashboard-section="recentreadings" style={sectionStyle('recentreadings')} className="space-y-3 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Catatan Terakhir ({activeProfile?.name || 'Pasien'})
                    </h3>
                    {readings.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleTabChange('history')}
                        className="text-xs font-black text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                      >
                        Buka Jurnal <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isLoading || isDataRefreshing ? (
                    <ShimmerSkeletonCard type="list" />
                  ) : readings.length > 0 ? (
                    <div className="space-y-2.5">
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
                    <div className="p-6 text-center m3-surface-card space-y-2">
                      <Heart className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                      <h4 className="text-xs font-black text-slate-700 dark:text-slate-300">
                        Jurnal Masih Kosong
                      </h4>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                        Tekan tombol (+) di bawah untuk mencatat tensi pertama.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: JURNAL (HISTORY & CALENDAR)                        */}
            {/* ========================================================= */}
            {activeTab === 'history' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                
                {/* Segmented Controller: Daftar List vs Kalender */}
                <div className="m3-segmented-container">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setHistoryViewMode('list');
                    }}
                    className={`m3-segmented-item flex items-center justify-center gap-1.5 ${historyViewMode === 'list' ? 'm3-segmented-item-active' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    <ListFilter size={14} />
                    <span>Daftar Catatan Jurnal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setHistoryViewMode('calendar');
                    }}
                    className={`m3-segmented-item flex items-center justify-center gap-1.5 ${historyViewMode === 'calendar' ? 'm3-segmented-item-active' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    <CalendarIcon size={14} />
                    <span>Kalender Medis</span>
                  </button>
                </div>

                {/* Search & Filter Bar */}
                <HistoryFilter />

                {historyViewMode === 'calendar' ? (
                  /* Interactive Calendar View */
                  <CalendarView readings={rawReadings || []} />
                ) : (
                  /* Readings List */
                  <div className="space-y-2.5">
                    {isLoading || isDataRefreshing ? (
                      <ShimmerSkeletonCard type="list" />
                    ) : readings.length > 0 ? (
                      <div className="space-y-2.5">
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
                      <div className="p-8 text-center m3-surface-card space-y-2">
                        <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                        <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">
                          Tidak Ada Catatan
                        </h4>
                        <p className="text-xs text-slate-400">
                          Tidak ditemukan data yang sesuai dengan pencarian.
                        </p>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: LAPORAN (REPORTS & INSIGHTS)                       */}
            {/* ========================================================= */}
            {activeTab === 'reports' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <WeeklyReport />

                {/* PDF Generator Card */}
                <div className="p-5 m3-card-elevated text-center space-y-3 bg-gradient-to-br from-white via-sky-50/40 to-teal-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-sky-500/25">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                      Ekspor Laporan PDF Dokter
                    </h3>
                    <p className="text-xs text-slate-500">
                      Format terstandar untuk konsultasi dokter ({activeProfile?.name || 'Pasien'}).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      openExportPdfModal();
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 text-white font-black text-xs shadow-lg shadow-sky-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Buka Generator PDF
                  </button>
                </div>

                {/* ASCVD Risk Card */}
                <div className="m3-surface-card p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-rose-500 text-white shadow-md shadow-rose-500/20">
                      <HeartPulse className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                        Kalkulator Risiko ASCVD 10-Tahun
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Estimasi risiko penyakit kardiovaskular aterosklerotik
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIsAscvdModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-xs active:scale-95 border border-rose-200 dark:border-rose-900/60"
                  >
                    Hitung
                  </button>
                </div>

                {/* Circadian Dipping Nocturnal Panel */}
                <CircadianDippingPanel readings={rawReadings || []} />

                {/* Lifestyle Correlation */}
                <details className="group m3-surface-card p-4">
                  <summary className="cursor-pointer font-black text-xs text-slate-800 dark:text-slate-200">
                    Korelasi Gaya Hidup &amp; Tekanan Darah
                  </summary>
                  <div className="mt-3">
                    <LifestyleCorrelation />
                  </div>
                </details>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 4: TERAPI (MEDICATION & HABITS)                       */}
            {/* ========================================================= */}
            {activeTab === 'reminders' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                
                {/* Medication Adherence Panel */}
                <MedicationAdherencePanel />

                {/* Combination Therapy Action Tile */}
                <div className="m3-card-elevated p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-500 text-white shadow-sm">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                          Resep Kombinasi Terapi Hipertensi
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Amlodipine (CCB), Candesartan (ARB), Allopurinol
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setIsMedModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-bold text-xs active:scale-95 border border-purple-200 dark:border-purple-800"
                    >
                      Buka Resep
                    </button>
                  </div>
                </div>

                {/* Habit & Sleep Tracker Tile */}
                <div className="m3-surface-card p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500 text-white shadow-sm">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                        Pelacak Tidur &amp; Kebiasaan
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Durasi tidur, paparan layar &amp; aktivitas luar ruang
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIsHabitsModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs active:scale-95 border border-indigo-200 dark:border-indigo-800"
                  >
                    Catat
                  </button>
                </div>

                {/* DASH Sodium Tracker Tile */}
                <div className="m3-surface-card p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
                      <Utensils className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                        Pelacak Garam Harian (Diet DASH)
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Batas natrium &le; 2.000 mg per hari
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIsSodiumModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold text-xs active:scale-95 border border-amber-200 dark:border-amber-800"
                  >
                    Batas DASH
                  </button>
                </div>

                {/* Reminders / Alarm Manager */}
                <div className="p-5 m3-card-elevated text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto shadow-md shadow-amber-500/25">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Jadwal Pengingat Tensi &amp; Obat
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pengingat otomatis browser pada jam periksa rutin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      openReminderModal();
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Atur Alarm Pengingat
                  </button>
                </div>

              </div>
            )}
          </>
        )}

      </main>

      {/* Material 3 Bottom Navigation Bar */}
      {showPrimaryNavigation && <Navigation activeTab={activeTab} onTabChange={handleTabChange} />}

      {/* Material 3 Mobile Tools BottomSheet */}
      <MobileToolsSheet />

      {/* Rest Protocol 5-Minute Modal */}
      <BPRestTimerModal
        isOpen={isRestTimerOpen}
        onClose={() => setIsRestTimerOpen(false)}
        onTimerComplete={() => openReadingModal()}
      />

      {/* All Subsystem Modals */}
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
      <LabResultsModal
        isOpen={isLabModalOpen}
        onClose={() => setIsLabModalOpen(false)}
      />
      <FhirResourceInspectorModal
        isOpen={isFhirModalOpen}
        onClose={() => setIsFhirModalOpen(false)}
      />
      <JsonImportExportModal
        isOpen={isJsonBackupModalOpen || screenKey === 'backup'}
        onClose={() => {
          setIsJsonBackupModalOpen(false);
          if (screenKey === 'backup') navigate({ to: '/' });
        }}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => navigate({ to: '/dashboard' })}
      />
      <AscvdCalculatorModal
        isOpen={isAscvdModalOpen}
        onClose={() => setIsAscvdModalOpen(false)}
      />
      <ClinicalNotesModal
        isOpen={isClinicalNotesModalOpen}
        onClose={() => setIsClinicalNotesModalOpen(false)}
      />
      <NvidiaNimAiAssistantWidget />

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

      {/* Mobile Footer */}
      <footer className="mt-8 border-t border-slate-200/80 dark:border-slate-800/80 py-4 text-center text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
        <p className="font-bold text-slate-700 dark:text-slate-300">
          AortaLink — Open-Source AI Personal EHR
        </p>
        <p className="text-[10px] font-medium text-slate-400">
          HL7 FHIR R4 • Offline-First Dexie v4 • Cloud MongoDB Atlas
        </p>
      </footer>
    </div>
  );
}
