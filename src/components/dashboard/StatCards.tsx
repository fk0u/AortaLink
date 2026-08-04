/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import React, { useState } from 'react';
import { BPSummaryStats } from '../../types/blood-pressure';
import { classifyBP, classifyPulse } from '../../utils/bp-classifier';
import { formatDateIndonesian } from '../../utils/formatters';
import { playClickSound } from '../../utils/audio-fx';
import { Activity, Heart, Calendar, ShieldCheck, Target, BookOpen, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { KnowledgeGuideModal } from '../common/KnowledgeGuideModal';

interface StatCardsProps {
  stats: BPSummaryStats;
  onOpenNewReading: () => void;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats, onOpenNewReading }) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const latest = stats.latestReading;
  const latestCategory = latest ? classifyBP(latest.systolic, latest.diastolic) : null;
  const pulseStatus = classifyPulse(stats.avgPulse);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        
        {/* Card 1: Latest Reading / Fresh Onboarding Widget */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="md:col-span-2 relative overflow-hidden hallmark-card p-5 md:p-6 flex flex-col justify-between"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-gradient-to-bl from-teal-400/10 via-sky-400/5 to-transparent rounded-full blur-2xl pointer-events-none"></div>

          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 min-w-0">
                  {latest ? 'Pengukuran Terakhir (Real Data)' : 'Selamat Datang di AortaLink'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsGuideOpen(true);
                  }}
                  className="hallmark-button-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5 active:scale-95 min-h-11"
                  title="Panduan Medis Cara Ukur Tensi"
                >
                  <BookOpen className="w-3.5 h-3.5 text-teal-500" />
                  Panduan Medis
                </button>

                {latest && (
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDateIndonesian(latest.timestamp)}
                  </span>
                )}
              </div>
            </div>

            {latest ? (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[2.5rem] sm:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                      {latest.systolic} / {latest.diastolic}
                    </span>
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      mmHg
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
                      {latest.pulse} BPM (Nadi)
                    </span>
                    {latest.position && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold capitalize">
                        {latest.position} • {latest.arm || 'kiri'}
                      </span>
                    )}
                  </div>
                </div>

                {/* AHA Category Badge */}
                {latestCategory && (
                  <div className="shrink-0 space-y-1 text-right">
                    <span className={`hallmark-badge ${latestCategory.badgeClass} shadow-sm`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${latestCategory.colorClass}`}></span>
                      {latestCategory.label}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* Fresh Onboarding Card for New Real Users */
              <div className="mt-6 py-6 px-4 text-center space-y-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Siap Mencatat Tekanan Darah Real Anda
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Belum ada data pengukuran tekanan darah. AortaLink bebas dari data sampel/palsu. Mulai rekam medis Anda sekarang!
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onOpenNewReading();
                    }}
                    className="hallmark-button-primary px-5 py-3 text-xs inline-flex items-center gap-2 active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    Catat Tensi Pertama Anda
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recommendation Quote Tip */}
          {latestCategory && (
            <div className={`mt-6 p-4 rounded-2xl border ${latestCategory.bgLightClass} ${latestCategory.borderClass} flex items-start gap-3`}>
              <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${latestCategory.textClass}`} />
              <div>
                <h5 className={`text-xs font-extrabold ${latestCategory.textClass}`}>
                  Saran Medis Klinis:
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {latestCategory.recommendation}
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Card 2 & 3 Column: Period Average & Pulse Summary */}
        <div className="space-y-5 flex flex-col justify-between">
          
          {/* Average BP & MAP Widget */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="hallmark-card p-4 md:p-5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 min-w-0">
                Rata-rata Tekanan Darah
              </span>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-lg">
                {stats.totalReadings} data real
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[1.75rem] sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                  {stats.avgSystolic || '--'} / {stats.avgDiastolic || '--'}
                </span>
                <span className="text-xs font-bold text-slate-400 ml-1.5">mmHg</span>
              </div>
            </div>

            {/* MAP & Pulse Pressure Indicators */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px]">
                <span className="text-slate-400 block font-semibold">Rata MAP:</span>
                <span className="font-extrabold text-sky-600 dark:text-sky-400">{stats.avgMAP || '--'} mmHg</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px]">
                <span className="text-slate-400 block font-semibold">Selisih PP:</span>
                <span className="font-extrabold text-teal-600 dark:text-teal-400">{stats.avgPulsePressure || '--'} mmHg</span>
              </div>
            </div>
          </motion.div>

          {/* Goal Compliance Rate Widget */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="hallmark-card p-4 md:p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Capaian Target Tensi
                </span>
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                {stats.totalReadings > 0 ? `${stats.targetComplianceRate}%` : '0%'}
              </span>
            </div>

            <div className="mt-3 w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${stats.totalReadings > 0 ? stats.targetComplianceRate : 0}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-right font-medium">
              {stats.totalReadings > 0 ? `${stats.targetComplianceRate}% pengukuran memenuhi target` : 'Belum ada data pengukuran'}
            </p>
          </motion.div>

        </div>
      </div>

      <KnowledgeGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </>
  );
};
