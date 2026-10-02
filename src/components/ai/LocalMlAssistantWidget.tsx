/* Hallmark & Minimalist UI · On-Device Clinical ML Assistant Modal */
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, X, Send, HeartPulse, Sparkles, TrendingUp, TrendingDown, Minus, CheckCircle2, AlertTriangle, Info, FlaskConical } from '../icons/AppIcons';
import { useAppStore } from '../../store/useAppStore';
import { useFocusTrap } from '../../utils/modal-a11y';
import { useProfiles } from '../../hooks/useProfiles';
import { useReadings } from '../../hooks/useReadings';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { playClickSound } from '../../utils/audio-fx';
import { runClinicalMlAnalysis, ML_DISCLAIMER, ML_ENGINE_VERSION, type MlInsight } from '../../services/ml/ml-engine';
import { useResearchStore } from '../../store/useResearchStore';
import {
  getCuratedQuestions,
  answerLocalQuestion,
  resolveFreeTextIntent,
  getCapabilityAnswer,
  type LocalIntent,
  type LocalAssistantAnswer
} from '../../services/ml/local-assistant';

interface ConversationEntry {
  question: string;
  answer: LocalAssistantAnswer;
}

const INSIGHT_STYLE: Record<MlInsight['priority'], { border: string; bg: string; icon: React.ReactNode }> = {
  critical: {
    border: 'border-rose-300 dark:border-rose-800',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    icon: <AlertTriangle size={15} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
  },
  warning: {
    border: 'border-amber-300 dark:border-amber-800',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    icon: <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
  },
  positive: {
    border: 'border-emerald-300 dark:border-emerald-800',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    icon: <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
  },
  info: {
    border: 'border-slate-200 dark:border-slate-700',
    bg: 'bg-slate-50 dark:bg-white/10',
    icon: <Info size={15} className="text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
  }
};

function TrendGlyph({ direction }: { direction: 'rising' | 'falling' | 'stable' }) {
  if (direction === 'rising') return <TrendingUp size={14} className="text-rose-600 dark:text-rose-400" />;
  if (direction === 'falling') return <TrendingDown size={14} className="text-emerald-600 dark:text-emerald-400" />;
  return <Minus size={14} className="text-slate-500 dark:text-slate-400" />;
}

export const LocalMlAssistantWidget: React.FC = () => {
  const isOpen = useAppStore((state) => state.isAiModalOpen);
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);
  const closeModal = useAppStore((state) => state.closeAiModal);
  const [input, setInput] = useState('');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);

  const { activeProfile } = useProfiles();
  const { rawReadings } = useReadings();
  const { isActive: isResearchActive, openConsentModal } = useResearchStore();

  const medications = useLiveQuery(
    async () => {
      if (!activeProfile?.id) return [];
      return await db.medications.where('profileId').equals(activeProfile.id).toArray();
    },
    [activeProfile?.id]
  );

  const medicationLogs = useLiveQuery(
    async () => {
      if (!activeProfile?.id) return [];
      return await db.medicationLogs.where('profileId').equals(activeProfile.id).toArray();
    },
    [activeProfile?.id]
  );

  const sodiumLogs = useLiveQuery(
    async () => {
      if (!activeProfile?.id) return [];
      return await db.sodiumLogs.where('profileId').equals(activeProfile.id).toArray();
    },
    [activeProfile?.id]
  );

  const sleepLogs = useLiveQuery(
    async () => {
      if (!activeProfile?.id) return [];
      return await db.sleepLogs.where('profileId').equals(activeProfile.id).toArray();
    },
    [activeProfile?.id]
  );

  const labResults = useLiveQuery(
    async () => {
      if (!activeProfile?.id) return [];
      return await db.labResults.where('profileId').equals(activeProfile.id).reverse().sortBy('timestamp');
    },
    [activeProfile?.id]
  );

  const report = useMemo(() => {
    if (
      !isResearchActive ||
      medications === undefined ||
      medicationLogs === undefined ||
      sodiumLogs === undefined ||
      sleepLogs === undefined ||
      labResults === undefined
    ) {
      return null;
    }
    return runClinicalMlAnalysis({
      profile: activeProfile,
      readings: rawReadings,
      medications,
      medicationLogs,
      sodiumLogs,
      sleepLogs,
      labResults
    });
  }, [isResearchActive, activeProfile, rawReadings, medications, medicationLogs, sodiumLogs, sleepLogs, labResults]);

  const curatedQuestions = useMemo(() => getCuratedQuestions(), []);

  const askIntent = (intent: LocalIntent, question: string) => {
    if (!report) return;
    const latestLab = labResults && labResults.length > 0 ? labResults[0] : null;
    const answer = answerLocalQuestion(intent, report, {
      profile: activeProfile,
      medications: medications || [],
      latestLab
    });
    setConversation((prev) => [...prev, { question, answer }]);
  };

  const handleAsk = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || !report) return;
    playClickSound();

    const intent = resolveFreeTextIntent(text);
    if (intent) {
      askIntent(intent, text);
    } else {
      setConversation((prev) => [...prev, { question: text, answer: getCapabilityAnswer() }]);
    }
    setInput('');
  };

  const handleCurated = (intent: LocalIntent, label: string) => {
    playClickSound();
    askIntent(intent, label);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            ref={trapRef}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="bg-white dark:bg-[#1c1c1e] border border-slate-200/90 dark:border-white/10 rounded-t-[32px] sm:rounded-[32px] max-w-lg w-full shadow-2xl overflow-hidden flex flex-col h-[640px] max-h-[92vh] text-slate-900 dark:text-slate-100"
          >
            <div className="m3-bottom-sheet-grabber sm:hidden" />

            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-600 text-white shadow-sm">
                  <BrainCircuit size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-tight">
                    Asisten Analisis Klinis
                    <Sparkles size={12} className="text-amber-500" />
                  </h3>
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold font-mono">
                    Mesin ML Lokal v{ML_ENGINE_VERSION} • 100% on-device
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  closeModal();
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#2c2c2e] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
                aria-label="Tutup asisten analisis"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {/* Intro card */}
              <div className="p-3 rounded-2xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-teal-900 dark:text-teal-200">
                  <HeartPulse size={14} className="text-teal-600" />
                  <span>Halo {activeProfile?.name || 'Pasien'}! Mesin analisis ini belajar dari data asli Anda.</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Regresi tren, deteksi pola, dan model kepatuhan dijalankan langsung di perangkat Anda — tanpa server AI eksternal, tanpa jawaban karangan. Setiap jawaban mencantumkan sumber datanya.
                </p>
              </div>

              {!isResearchActive ? (
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3 text-center">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center font-bold">
                    <FlaskConical size={22} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Fitur SaMD Terkunci (Mode Publik)
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      Sesuai keputusan rilis non-alkes publik, model inferensi statistik dan prediksi pola on-device dikhususkan untuk Mode Riset & Akademik dengan Study ID dan Informed Consent terdaftar.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      closeModal();
                      openConsentModal();
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors shadow-sm"
                  >
                    Buka Pengaturan Mode Riset
                  </button>
                </div>
              ) : !report ? (
                <div className="p-3 text-xs text-slate-500">Memuat data rekam medis…</div>
              ) : (
                <>
                  {/* Trend snapshot */}
                  <div className="p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/10 space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <TrendGlyph direction={report.trend.direction} />
                      Snapshot Tren
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{report.trend.assessment}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{report.trend.confidenceNote}</p>
                  </div>

                  {/* Insights */}
                  {report.insights.map((insight) => {
                    const style = INSIGHT_STYLE[insight.priority];
                    return (
                      <div
                        key={insight.id}
                        className={`p-3 rounded-2xl border ${style.border} ${style.bg} flex gap-2 text-xs`}
                      >
                        {style.icon}
                        <div className="space-y-0.5">
                          <p className="font-black text-slate-900 dark:text-slate-100">{insight.title}</p>
                          <p className="leading-relaxed text-slate-700 dark:text-slate-300">{insight.body}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Conversation */}
                  {conversation.map((entry, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-end">
                        <p className="max-w-[85%] px-3 py-2 rounded-2xl rounded-br-md bg-teal-600 text-white text-xs leading-relaxed">
                          {entry.question}
                        </p>
                      </div>
                      <div className="flex justify-start">
                        <div className="max-w-[90%] px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-slate-100 dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                          {entry.answer.text}
                          <p className="mt-2 pt-1.5 border-t border-slate-200 dark:border-white/10 text-[9px] font-bold font-mono uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            Sumber: {entry.answer.sources.join(' • ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <p className="text-[10px] leading-relaxed text-slate-400 dark:text-slate-500 text-center px-2">
                    {ML_DISCLAIMER}
                  </p>
                </>
              )}
            </div>

            {/* Question chips + input */}
            <div className="border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#1c1c1e] shrink-0">
              {report && (
                <div className="px-3 pt-2.5 flex gap-1.5 overflow-x-auto">
                  {curatedQuestions.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleCurated(q.id, q.label)}
                      className="px-3 py-1.5 rounded-full bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={handleAsk} className="p-3 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Tanya tentang tren, pola, kepatuhan, atau lab Anda…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  aria-label="Pertanyaan untuk asisten analisis"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || !report}
                  className="p-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold shadow-md shadow-teal-600/20 active:scale-95 transition-all flex items-center justify-center"
                  aria-label="Kirim pertanyaan"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
