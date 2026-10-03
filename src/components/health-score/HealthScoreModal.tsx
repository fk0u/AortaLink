/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  HeartPulse,
  Activity,
  FlaskConical,
  Moon,
  Utensils,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp,
  User,
  ArrowRight
} from '../icons/AppIcons';
import { useProfiles } from '../../hooks/useProfiles';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { calculateAortaLinkHealthScore } from '../../services/health-score/health-score-engine';
import type { HealthScoreMetricId, HealthScoreMetricResult } from '../../types/health-score';

interface HealthScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReading?: () => void;
  onOpenLab?: () => void;
  onOpenProfile?: () => void;
  onOpenSodium?: () => void;
  onOpenHabits?: () => void;
}

export const HealthScoreModal: React.FC<HealthScoreModalProps> = ({
  isOpen,
  onClose,
  onOpenReading,
  onOpenLab,
  onOpenProfile,
  onOpenSodium,
  onOpenHabits
}) => {
  const { activeProfileId, activeProfile } = useProfiles();
  const [expandedMetric, setExpandedMetric] = useState<HealthScoreMetricId | null>(null);

  // Live queries for active patient
  const readings = useLiveQuery(
    () => (activeProfileId ? db.readings.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const medications = useLiveQuery(
    () => (activeProfileId ? db.medications.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const medicationLogs = useLiveQuery(
    () => (activeProfileId ? db.medicationLogs.toArray() : []),
    [activeProfileId]
  ) || [];

  const labResults = useLiveQuery(
    () => (activeProfileId ? db.labResults.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const sodiumLogs = useLiveQuery(
    () => (activeProfileId ? db.sodiumLogs.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const sleepLogs = useLiveQuery(
    () => (activeProfileId ? db.sleepLogs.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const habits = useLiveQuery(
    () => (activeProfileId ? db.habits.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const conditions = useLiveQuery(
    () => (activeProfileId ? db.conditions.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const hasDiabetes = conditions.some(
    (c) => c.name.toLowerCase().includes('diabet') || c.code === 'E11'
  );

  // Calculate AHA Life's Essential 8 Report
  const report = calculateAortaLinkHealthScore({
    profile: activeProfile || null,
    readings,
    medications,
    medicationLogs,
    labResults,
    sodiumLogs,
    sleepLogs,
    habits,
    hasDiabetes
  });

  if (!isOpen) return null;

  const toggleMetric = (id: HealthScoreMetricId) => {
    setExpandedMetric(expandedMetric === id ? null : id);
  };

  const getMetricIcon = (id: HealthScoreMetricId) => {
    switch (id) {
      case 'blood_pressure':
        return <HeartPulse className="w-4 h-4 text-rose-500" />;
      case 'nicotine':
        return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      case 'bmi':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'lipids':
        return <FlaskConical className="w-4 h-4 text-purple-500" />;
      case 'glucose':
        return <Activity className="w-4 h-4 text-amber-500" />;
      case 'physical_activity':
        return <Sparkles className="w-4 h-4 text-teal-500" />;
      case 'sleep':
        return <Moon className="w-4 h-4 text-indigo-500" />;
      case 'diet':
        return <Utensils className="w-4 h-4 text-orange-500" />;
    }
  };

  const metricActionMap: Record<HealthScoreMetricId, { label: string; action?: () => void }> = {
    blood_pressure: { label: 'Rekam Tensi', action: onOpenReading },
    nicotine: { label: 'Isi Profil Merokok', action: onOpenProfile },
    bmi: { label: 'Isi Tinggi & Berat', action: onOpenProfile },
    lipids: { label: 'Input Hasil Lab', action: onOpenLab },
    glucose: { label: 'Input Hasil Lab', action: onOpenLab },
    physical_activity: { label: 'Catat Olahraga', action: onOpenHabits },
    sleep: { label: 'Catat Jam Tidur', action: onOpenHabits },
    diet: { label: 'Catat Asupan Garam', action: onOpenSodium }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-[#1c1c1e] rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/60 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/20">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  AortaLink Health Score
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                    AHA Life's Essential 8
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Metrik Transparan Kesehatan Kardiovaskular • {activeProfile?.name || 'Pasien'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* Top Summary Banner */}
            <div
              className={`p-4 rounded-3xl border ${
                report.status === 'complete'
                  ? report.totalScore! >= 80
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                    : report.totalScore! >= 50
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                        report.status === 'complete'
                          ? report.totalScore! >= 80
                            ? 'bg-emerald-600 text-white'
                            : report.totalScore! >= 50
                            ? 'bg-amber-600 text-white'
                            : 'bg-rose-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {report.status === 'complete' ? report.categoryLabel : 'Menolak Menebak (Data Belum Lengkap)'}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {report.completedMetricsCount} / 8 Metrik Terisi
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                    {report.categoryDescription}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center justify-center shrink-0 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm min-w-[110px]">
                  {report.status === 'complete' ? (
                    <>
                      <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                        {report.totalScore}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Skor Total / 100
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                        {report.completedMetricsCount}/8
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">
                        Metrik Siap
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Progress bar for completeness */}
              <div className="mt-3.5 space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>Kelengkapan Data AHA Life's Essential 8</span>
                  <span>{Math.round((report.completedMetricsCount / 8) * 100)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-teal-500 transition-all duration-500"
                    style={{ width: `${(report.completedMetricsCount / 8) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 8 Metrics Cards Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Rincian 8 Metrik Esensial Jantung &amp; Aorta
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">0–100 Poin per Metrik</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(report.metrics) as HealthScoreMetricId[]).map((key) => {
                  const m = report.metrics[key];
                  const isExpanded = expandedMetric === key;

                  return (
                    <div
                      key={key}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2 hover:border-purple-300 dark:hover:border-purple-900 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                            {getMetricIcon(key)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100 block truncate">
                              {m.nameId}
                            </span>
                            <span className="text-[9px] text-slate-400 block truncate">{m.name}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {m.score !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                                m.score >= 80
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : m.score >= 50
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}
                            >
                              {m.score} / 100
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              Perlu Data
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleMetric(key)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Main Measured Value Display */}
                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span className="font-extrabold text-slate-700 dark:text-slate-200">{m.valueDisplay}</span>
                        {m.treatedAdjustmentApplied && (
                          <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400">
                            −20 penyesuaian terapi
                          </span>
                        )}
                      </div>

                      {/* Expandable Details & Explanations */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 space-y-1.5 text-[10px] animate-in fade-in duration-150">
                          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{m.details}</p>
                          <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 space-y-0.5">
                            <span className="font-bold text-slate-500 block text-[9px] uppercase tracking-wider">
                              Rekomendasi Klinis:
                            </span>
                            <p className="text-slate-700 dark:text-slate-200">{m.recommendation}</p>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                            <span>Sumber: {m.dataSource}</span>
                            <span>{m.guidelineSource}</span>
                          </div>
                        </div>
                      )}

                      {/* Quick fill button if missing */}
                      {!m.isAvailable && metricActionMap[key]?.action && (
                        <button
                          type="button"
                          onClick={metricActionMap[key].action}
                          className="w-full mt-1 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-[10px] flex items-center justify-center gap-1 transition-colors"
                        >
                          <span>{metricActionMap[key].label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Separate Clinical Indicators (Explicitly Not Blended to Avoid Double Counting) */}
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2.5">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Indikator Tambahan Terpisah (Bukan Bagian Skor LE8)
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Sesuai konsensus panel klinis AortaLink v3.0, risiko 10 tahun (ASCVD/PREVENT) dan tingkat kepatuhan obat
                ditampilkan terpisah sebagai metrik independen untuk menghindari perhitungan ganda (double-counting).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Kepatuhan Obat Harian
                    </span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      {report.separateIndicators.medicationAdherenceRatePercent !== null
                        ? `${report.separateIndicators.medicationAdherenceRatePercent}% Terpatuhi`
                        : 'Belum ada log obat'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                    Proses
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Estimasi Risiko 10-Tahun
                    </span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      Kalkulator ASCVD / PREVENT
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                    Risiko Klinis
                  </span>
                </div>
              </div>
            </div>

            {/* Disclaimer & Transparency Footer */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] leading-relaxed flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Catatan Regulasi Medis &amp; Transparansi:</strong>
                {report.disclaimer}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
