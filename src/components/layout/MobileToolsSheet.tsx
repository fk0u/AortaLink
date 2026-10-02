import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  X, 
  UserRound, 
  Settings, 
  Bell, 
  FileText, 
  Database, 
  ShieldCheck, 
  Plus,
  BrainCircuit,
  Sparkles
} from '../icons/AppIcons';
import { useAppStore } from '../../store/useAppStore';
import { useResearchStore } from '../../store/useResearchStore';
import { FlaskConical, ChevronRight } from 'lucide-react';
import { playClickSound } from '../../utils/audio-fx';

export const MobileToolsSheet: React.FC = () => {
  const navigate = useNavigate();
  const isOpen = useAppStore((state) => state.isMobileToolsSheetOpen);
  const closeSheet = useAppStore((state) => state.closeMobileToolsSheet);
  const openReadingModal = useAppStore((state) => state.openReadingModal);
  const openProfileModal = useAppStore((state) => state.openProfileModal);
  const openReminderModal = useAppStore((state) => state.openReminderModal);
  const openExportPdfModal = useAppStore((state) => state.openExportPdfModal);
  const openConsentModal = useResearchStore((state) => state.openConsentModal);
  const isResearchActive = useResearchStore((state) => state.isActive);

  const goTo = (to: '/profile' | '/settings' | '/reports' | '/reminders' | '/backup' | '/') => {
    playClickSound();
    closeSheet();
    navigate({ to });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur */}
          <motion.div
            aria-label="Tutup menu alat"
            className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => {
              playClickSound();
              closeSheet();
            }}
          />

          {/* Material 3 Bottom Sheet Container */}
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="Menu Alat Tambahan AortaLink"
            className="fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-y-auto px-3 pb-safe pt-2 bg-white dark:bg-[#1c1c1e] border-t border-slate-200/90 dark:border-white/10 rounded-t-[32px] shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.9 }}
          >
            {/* Grabber Handle */}
            <div className="m3-bottom-sheet-grabber" />

            <div className="max-w-lg mx-auto pb-6 space-y-4">
              
              {/* Sheet Header */}
              <div className="flex items-center justify-between px-2 pt-1 border-b border-slate-100 dark:border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    AortaLink Hub
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    Peralatan &amp; Pengaturan
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    closeSheet();
                  }}
                  className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-[#2c2c2e] flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-all"
                  aria-label="Tutup"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Category 1: Manajemen Akun & Klinis */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-2">
                  Profil &amp; Rekam Medis
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      closeSheet();
                      openProfileModal();
                    }}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200/70 dark:border-white/10 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="p-2 rounded-xl bg-teal-500 text-white shrink-0">
                      <UserRound size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100">Kelola Profil</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Pasien &amp; Keluarga</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      closeSheet();
                      openExportPdfModal();
                    }}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200/70 dark:border-white/10 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="p-2 rounded-xl bg-sky-500 text-white shrink-0">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100">Laporan PDF</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Format Dokter</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* AI & Intelligence */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-2">
                  Analitik Kesehatan (ML On-Device)
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      closeSheet();
                      useAppStore.getState().openAiModal();
                    }}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-900/60 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="p-2 rounded-xl bg-teal-600 text-white shrink-0 shadow-sm">
                      <BrainCircuit size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>Asisten Analisis Klinis (ML Lokal)</span>
                        <Sparkles size={12} className="text-amber-500" />
                      </p>
                      <p className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold">Mesin statistik on-device • tanpa server eksternal</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Category 2: Terapi & Jadwal */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-2">
                  Terapi &amp; Pengingat
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      closeSheet();
                      openReminderModal();
                    }}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200/70 dark:border-white/10 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
                      <Bell size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100">Alarm Tensi</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Jadwal Harian</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo('/settings')}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200/70 dark:border-white/10 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="p-2 rounded-xl bg-purple-500 text-white shrink-0">
                      <Settings size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100">Pengaturan</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Tema &amp; Preferensi</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Category 3: Ekosistem & Backup */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-2">
                  Cloud &amp; Keamanan Data
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => goTo('/backup')}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200/70 dark:border-white/10 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="p-2 rounded-xl bg-indigo-500 text-white shrink-0">
                      <Database size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100">Backup JSON</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Ekspor &amp; Pulihkan</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo('/settings')}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200/70 dark:border-white/10 active:scale-[0.98] transition-all text-left"
                  >
                    <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100">Audit Keamanan</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Hash Chain EMR</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Category 4: Mode Riset / Akademik */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-2 flex items-center gap-1.5">
                  <FlaskConical size={12} />
                  <span>Penelitian &amp; Akademik</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    closeSheet();
                    openConsentModal();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold shrink-0">
                      <FlaskConical size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>Mode Riset / Akademik (SaMD)</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 uppercase font-mono font-bold">
                          {isResearchActive ? 'Aktif' : 'Terkunci'}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Informed consent partisipan, log algoritma, dan dataset riset
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                </button>
              </div>

              {/* Big Direct Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    closeSheet();
                    openReadingModal();
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 text-white font-black text-sm shadow-xl shadow-teal-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={20} strokeWidth={3} />
                  Input Pengukuran Tensi Baru
                </button>
              </div>

            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
};
