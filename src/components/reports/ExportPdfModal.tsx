import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import { useReadings } from '../../hooks/useReadings';
import { generateClinicalReportPDF, ReportVersionType } from '../../utils/pdf-generator';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, CheckCircle2, AlertCircle, Calendar, CalendarDays, ShieldCheck, Activity } from '../icons/AppIcons';
import { db } from '../../db';

export const ExportPdfModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.isExportPdfModalOpen);
  const closeModal = useAppStore((state) => state.closeExportPdfModal);
  const addToast = useAppStore((state) => state.addToast);
  const { activeProfile } = useProfiles();
  const { readings, stats } = useReadings();

  const [selectedVersion, setSelectedVersion] = useState<ReportVersionType>('comprehensive');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExportPDF = async () => {
    playClickSound();
    if (!activeProfile || readings.length === 0) {
      addToast({ type: 'warning', title: 'Tidak Ada Data', message: 'Belum ada data tensi untuk dibuatkan laporan.' });
      return;
    }

    try {
      setIsGenerating(true);
      
      // Fetch actual medications & lab results for active profile
      const medications = await db.medications.where('profileId').equals(activeProfile.id).toArray();
      const labResults = await db.labResults.where('profileId').equals(activeProfile.id).sortBy('timestamp');

      // Generate complete clinical PDF for selected version
      generateClinicalReportPDF({
        profile: activeProfile,
        readings,
        stats,
        medications,
        labResults,
        version: selectedVersion
      });

      // Trigger Celebration Confetti
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      playSuccessChime();
      addToast({
        type: 'success',
        title: 'Laporan Klinis Terunduh!',
        message: `Laporan ${selectedVersion === 'weekly' ? 'Mingguan (7 Hari)' : selectedVersion === 'monthly' ? 'Bulanan (30 Hari)' : 'Komprehensif'} berhasil diunduh.`
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

  const versionOptions: {
    id: ReportVersionType;
    title: string;
    badge: string;
    desc: string;
    icon: any;
    recommended?: boolean;
  }[] = [
    {
      id: 'comprehensive',
      title: '1. Laporan Komprehensif Berangkap',
      badge: 'Paling Lengkap • Seluruh Riwayat',
      desc: 'Mencakup seluruh riwayat rekam medis dari awal, analisis sirkadian, elastisitas vaskular (Pulse Pressure), obat riil, hasil lab RS lengkap (eGFR), saran DPJP, dan tabel observasi longitudinal.',
      icon: ShieldCheck,
      recommended: true
    },
    {
      id: 'weekly',
      title: '2. Laporan Evaluasi Mingguan',
      badge: 'Monitoring Rutin • 7 Hari Terakhir',
      desc: 'Fokus pada evaluasi variabilitas tensi 7 hari terakhir, kepatuhan terapi, fluktuasi diurnal, korelasi obat mingguan, saran titrasi gaya hidup, dan tabel observasi ringkas.',
      icon: Calendar
    },
    {
      id: 'monthly',
      title: '3. Laporan Evaluasi Bulanan',
      badge: 'Evaluasi Terapi • 30 Hari Terakhir',
      desc: 'Meninjau stabilitas kardiovaskular 1 bulan penuh, tren penurunan sirkadian, kepatuhan minum obat 30 hari, korelasi hasil lab berkala, dan saran pencegahan komplikasi.',
      icon: CalendarDays
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-[#1c1c1e] rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Ekspor Laporan Rekam Medis (PDF)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Standar HL7 FHIR R4 (LOINC 85354-9) • Panduan ESH / AHA
                </p>
              </div>
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

          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Version Selection Cards */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Pilih Versi Laporan Klinis:
              </label>

              {versionOptions.map((opt) => {
                const isSelected = selectedVersion === opt.id;
                const IconComponent = opt.icon;

                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      playClickSound();
                      setSelectedVersion(opt.id);
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-50/90 dark:bg-teal-950/50 border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                        : 'bg-slate-50/70 dark:bg-white/5 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-xl ${isSelected ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                            {opt.title}
                          </h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            isSelected
                              ? 'bg-teal-200 dark:bg-teal-900 text-teal-900 dark:text-teal-200'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}>
                            {opt.badge}
                          </span>
                        </div>
                      </div>

                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mt-2 pl-8">
                      {opt.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Complete Content Inclusions Guarantee */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Isi Lengkap Setiap Dokumen PDF:
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  Demografi &amp; Target Usia
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  Regimen Obat Riil Pasien
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  Lab RS Lengkap &amp; eGFR
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  Dipping Sirkadian &amp; MAP
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  CDSS Rekomendasi Klinis
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  Tabel Observasi &amp; Paraf DPJP
                </span>
              </div>
            </div>

            {readings.length === 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Belum ada data pengukuran. Silakan catat tensi terlebih dahulu.
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="p-5 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#1c1c1e] shrink-0">
            <button
              onClick={handleExportPDF}
              disabled={isGenerating || readings.length === 0}
              className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-xl shadow-teal-600/25 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isGenerating 
                ? 'Memproses Laporan PDF...' 
                : `Unduh ${selectedVersion === 'weekly' ? 'Laporan Mingguan' : selectedVersion === 'monthly' ? 'Laporan Bulanan' : 'Laporan Komprehensif'} (PDF)`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
