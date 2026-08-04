import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import { useReadings } from '../../hooks/useReadings';
import { generateDoctorPDF } from '../../utils/pdf-generator';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, CheckCircle2, AlertCircle } from 'lucide-react';

export const ExportPdfModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.isExportPdfModalOpen);
  const closeModal = useAppStore((state) => state.closeExportPdfModal);
  const addToast = useAppStore((state) => state.addToast);
  const { activeProfile } = useProfiles();
  const { readings, stats } = useReadings();

  const [isGenerating, setIsGenerating] = useState(false);

  const handleExportPDF = async () => {
    playClickSound();
    if (!activeProfile || readings.length === 0) {
      addToast({ type: 'warning', title: 'Tidak Ada Data', message: 'Belum ada data tensi untuk dibuatkan laporan.' });
      return;
    }

    try {
      setIsGenerating(true);
      
      // Generate PDF
      generateDoctorPDF(activeProfile, readings, stats);

      // Trigger Celebration Confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      playSuccessChime();
      addToast({
        type: 'success',
        title: 'Laporan Dokter Siap!',
        message: 'File PDF berhasil diunduh ke perangkat Anda.'
      });

      closeModal();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Gagal Membuat PDF',
        message: 'Terjadi kesalahan saat memproses laporan.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] sm:pb-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Laporan Medis Dokter (PDF)
              </h3>
            </div>
            <button
              onClick={() => {
                playClickSound();
                closeModal();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Preview Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Ringkasan Dokumen
                </span>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 px-2.5 py-0.5 rounded-md">
                  {readings.length} data pengukuran
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <span className="text-slate-500 block">Nama Pasien:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{activeProfile?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Rata-rata Tensi:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{stats.avgSystolic}/{stats.avgDiastolic} mmHg</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Denyut Nadi Rata-rata:</span>
                  <span className="font-bold text-rose-500">{stats.avgPulse} BPM</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Rentang Tensi:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{stats.minSystolic}/{stats.minDiastolic} - {stats.maxSystolic}/{stats.maxDiastolic}</span>
                </div>
              </div>
            </div>

            {/* Feature Checklist */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Fitur Laporan Medis:
              </h5>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Header resmi &amp; data identitas profil pasien
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Peringatan Klinis Otomatis (Auto-Flags: Krisis &amp; Variabilitas)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Tabel lengkap seluruh pencatatan beserta kategori AHA
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Kolom paraf &amp; catatan evaluasi klinis dokter
                </li>
              </ul>
            </div>

            {readings.length === 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Belum ada data pengukuran. Silakan catat tensi terlebih dahulu.
              </div>
            )}

            {/* Actions */}
            <div className="pt-2">
              <button
                onClick={handleExportPDF}
                disabled={isGenerating || readings.length === 0}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-sky-500/25 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {isGenerating ? 'Memproses PDF...' : 'Unduh Laporan PDF (1-Klik)'}
              </button>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
