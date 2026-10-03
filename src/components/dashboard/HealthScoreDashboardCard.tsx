/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import React from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, ArrowRight, ShieldCheck, AlertCircle, Info, Sparkles, CheckCircle2 } from '../icons/AppIcons';
import { useProfiles } from '../../hooks/useProfiles';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { calculateAortaLinkHealthScore } from '../../services/health-score/health-score-engine';
import { playClickSound } from '../../utils/audio-fx';

interface HealthScoreDashboardCardProps {
  onOpenModal: () => void;
}

export const HealthScoreDashboardCard: React.FC<HealthScoreDashboardCardProps> = ({ onOpenModal }) => {
  const { activeProfileId, activeProfile } = useProfiles();

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
    () => (activeProfileId ? db.medicationLogs.where('profileId').equals(activeProfileId).toArray() : []),
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

  const habits = useLiveQuery(
    () => (activeProfileId ? db.habits.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const report = calculateAortaLinkHealthScore({
    profile: activeProfile,
    readings,
    medications,
    medicationLogs,
    labResults,
    sodiumLogs,
    habits
  });

  const availableCount = report.completedMetricsCount;
  const isComplete = report.status === 'complete';
  const totalScore = report.totalScore;

  const getStatusBadge = () => {
    if (!isComplete) {
      return {
        label: `${availableCount}/8 Parameter`,
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700'
      };
    }
    if (totalScore !== null && totalScore >= 80) {
      return {
        label: 'Kesehatan Ideal',
        color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
      };
    }
    if (totalScore !== null && totalScore >= 50) {
      return {
        label: 'Kesehatan Sedang',
        color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-700'
      };
    }
    return {
      label: 'Perlu Perhatian',
      color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-700'
    };
  };

  const badge = getStatusBadge();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="hallmark-card p-5 relative overflow-hidden bg-gradient-to-br from-white via-slate-50/60 to-slate-100/40 dark:from-[#1c1c1e] dark:via-[#1c1c1e] dark:to-[#242428] border border-slate-200/80 dark:border-white/10 shadow-sm"
    >
      {/* Background ambient pulse */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-rose-500/10 dark:bg-rose-500/15 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/20 shrink-0">
            <HeartPulse className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                AortaLink Health Score
              </h3>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                AHA LE8
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Life's Essential 8 • Guideline AHA Circulation 2022
            </p>
          </div>
        </div>

        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {/* Score / Completion Metric */}
      <div className="pt-4 pb-2">
        <div className="flex items-baseline justify-between mb-2">
          {isComplete && totalScore !== null ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {totalScore}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                / 100 poin
              </span>
            </div>
          ) : (
            <div>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Data Belum Lengkap ({availableCount}/8)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Skor total dihitung hanya jika ke-8 parameter terisi.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenModal();
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
          >
            <span>Buka Rincian</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress bar of available metrics */}
        <div className="w-full bg-slate-100 dark:bg-white/10 rounded-full h-2 overflow-hidden mb-3">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              isComplete
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-amber-400 to-rose-400'
            }`}
            style={{ width: `${(availableCount / 8) * 100}%` }}
          />
        </div>

        {/* Mini 8-metric chips */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-1">
          {Object.values(report.metrics).map((m) => {
            const hasData = m.score !== null;
            return (
              <div
                key={m.id}
                title={`${m.name}: ${hasData ? `${m.score} pts (${m.valueDisplay})` : 'Belum tercatat'}`}
                className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-center transition-all ${
                  hasData
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60'
                    : 'bg-slate-50/70 dark:bg-white/5 border-dashed border-slate-300 dark:border-white/15 opacity-75'
                }`}
              >
                <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate w-full">
                  {m.name.split(' ')[0]}
                </span>
                <span className="text-[10px] font-black mt-0.5">
                  {hasData ? (
                    <span className="text-emerald-700 dark:text-emerald-400">{m.score}</span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer / Transparency pledge */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>Tanpa tebakan AI • Deterministik &amp; Transparan</span>
        </span>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onOpenModal();
          }}
          className="font-bold text-slate-700 dark:text-slate-300 hover:underline"
        >
          {isComplete ? 'Lihat Evaluasi Dokter' : 'Lengkapi Data'}
        </button>
      </div>
    </motion.div>
  );
};
