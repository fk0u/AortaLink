/* Hallmark & Minimalist UI · Google Gemini AI Clinical Specialist Modal */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, X, Send, Sparkles, HeartPulse, RefreshCw } from '../icons/AppIcons';
import { queryGeminiAi } from '../../services/ai/gemini-ai-service';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import { useReadings } from '../../hooks/useReadings';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { calculateNocturnalDipping } from '../../utils/advanced-analytics';
import { playClickSound } from '../../utils/audio-fx';

export const NvidiaNimAiAssistantWidget: React.FC = () => {
  const isOpen = useAppStore((state) => state.isAiModalOpen);
  const closeModal = useAppStore((state) => state.closeAiModal);
  const [promptInput, setPromptInput] = useState('');
  const [responseOutput, setResponseOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useAppStore((state) => state.addToast);

  const { activeProfile } = useProfiles();
  const { rawReadings, stats } = useReadings();

  const userMeds = useLiveQuery(
    async () => {
      if (!activeProfile?.id) return [];
      return await db.medications.where('profileId').equals(activeProfile.id).toArray();
    },
    [activeProfile?.id]
  );

  const userLabs = useLiveQuery(
    async () => {
      if (!activeProfile?.id) return [];
      return await db.labResults.where('profileId').equals(activeProfile.id).sortBy('timestamp');
    },
    [activeProfile?.id]
  );

  const dippingReport = React.useMemo(() => calculateNocturnalDipping(rawReadings || []), [rawReadings]);

  const handleSendPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim()) return;

    const currentQuestion = promptInput.trim();
    setPromptInput('');
    setIsLoading(true);
    setResponseOutput('');

    try {
      const readingsSummary = rawReadings && rawReadings.length > 0
        ? `Total ${rawReadings.length} pengukuran. Rata-rata ${stats.avgSystolic}/${stats.avgDiastolic} mmHg (MAP ${stats.avgMAP} mmHg, Pulse Pressure ${stats.avgPulsePressure} mmHg). Tensi terbaru: ${stats.latestReading?.systolic}/${stats.latestReading?.diastolic} mmHg (Nadi ${stats.latestReading?.pulse} bpm).`
        : 'Belum ada data pengukuran tekanan darah.';

      const medsList = userMeds && userMeds.length > 0
        ? userMeds.map((m) => `${m.name} ${m.dosage} (${m.drugClass}, jadwal ${m.schedule})`)
        : [];

      const latestLab = userLabs && userLabs.length > 0 ? userLabs[userLabs.length - 1] : null;
      const labSummary = latestLab
        ? `Asam Urat: ${latestLab.uricAcid} mg/dL, Kreatinin: ${latestLab.serumCreatinine} mg/dL, Ureum: ${latestLab.bloodUrea} mg/dL, Catatan: ${latestLab.notes || '-'}`
        : 'Belum ada pemeriksaan laboratorium.';

      await queryGeminiAi(
        {
          patientName: activeProfile?.name || 'Pasien',
          patientAge: activeProfile?.age || 45,
          patientGender: activeProfile?.gender || 'male',
          targetSystolic: activeProfile?.targetSystolic || 120,
          targetDiastolic: activeProfile?.targetDiastolic || 80,
          readingsSummary,
          dippingPattern: `${dippingReport.label} (Penurunan Nokturnal: ${dippingReport.sysDippingPercent.toFixed(1)}%)`,
          medicationsList: medsList,
          labSummary,
          userQuestion: currentQuestion
        },
        (chunk) => {
          setResponseOutput((prev) => prev + chunk);
        }
      );
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Koneksi AI Terganggu',
        message: 'Gagal terhubung ke Google AI Studio Gemini API.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-t-[32px] sm:rounded-[32px] max-w-lg w-full shadow-2xl overflow-hidden flex flex-col h-[580px] max-h-[90vh] text-slate-900 dark:text-slate-100"
          >
            {/* Grabber Handle */}
            <div className="m3-bottom-sheet-grabber sm:hidden" />

            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-600 text-white shadow-sm">
                  <BrainCircuit size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-tight">
                    Spesialis AI Penyakit Dalam (Sp.PD)
                    <Sparkles size={12} className="text-amber-500" />
                  </h3>
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold font-mono">
                    Google AI Studio • Gemini 3.1 Flash Lite
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  closeModal();
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Content Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <div className="p-3 rounded-2xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-teal-900 dark:text-teal-200">
                  <HeartPulse size={14} className="text-teal-600" />
                  <span>Halo {activeProfile?.name || 'Pasien'}! Asisten Medis AI siap menganalisis data riil Anda.</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Tanyakan analisis tensi berdasarkan usia ({activeProfile?.age || '-'} th), evaluasi pola nocturnal dipping, dosis obat, atau hasil lab asam urat/kreatinin Anda.
                </p>
              </div>

              {responseOutput && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
                  {responseOutput}
                </div>
              )}

              {isLoading && !responseOutput && (
                <div className="flex items-center gap-2 p-3 text-xs text-slate-500">
                  <RefreshCw size={14} className="animate-spin text-teal-500" />
                  <span>Menganalisis rekam medis dengan Gemini 3.1 Flash Lite...</span>
                </div>
              )}
            </div>

            {/* Prompt Input Form */}
            <form onSubmit={handleSendPrompt} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0 flex items-center gap-2">
              <input
                type="text"
                placeholder="Tanyakan analisis tensi sesuai usia, obat, atau lab Anda..."
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={isLoading || !promptInput.trim()}
                className="p-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold shadow-md shadow-teal-600/20 active:scale-95 transition-all flex items-center justify-center"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
