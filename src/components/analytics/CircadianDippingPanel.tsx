import React, { useMemo } from 'react';
import { BPReading, CircadianDippingReport } from '../../types/blood-pressure';
import { calculateNocturnalDipping, separateCircadianReadings } from '../../utils/advanced-analytics';
import { motion } from 'framer-motion';
import { Sun, Moon, Activity, AlertTriangle, CheckCircle2, TrendingDown, ArrowDown, ArrowUp } from 'lucide-react';

interface CircadianDippingPanelProps {
  readings: BPReading[];
}

export const CircadianDippingPanel: React.FC<CircadianDippingPanelProps> = ({ readings }) => {
  const report = useMemo(() => calculateNocturnalDipping(readings), [readings]);
  const { daytime, nighttime } = useMemo(() => separateCircadianReadings(readings), [readings]);

  const hasData = daytime.length > 0 && nighttime.length > 0;

  const patternConfig = {
    dipper: { color: 'emerald', icon: CheckCircle2, emoji: '✅' },
    non_dipper: { color: 'amber', icon: AlertTriangle, emoji: '⚠️' },
    riser: { color: 'rose', icon: ArrowUp, emoji: '🔴' },
    extreme_dipper: { color: 'sky', icon: TrendingDown, emoji: '⚡' }
  };

  const cfg = patternConfig[report.pattern] || patternConfig.dipper;
  const PatternIcon = cfg.icon;

  // Dipping bar width (capped at 100% for visual)
  const dippingBarWidth = Math.min(Math.abs(report.sysDippingPercent), 30);
  const normalRangeStart = (10 / 30) * 100;
  const normalRangeEnd = (20 / 30) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="hallmark-card p-4 md:p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              Analisis Pola Sirkadian (Nocturnal Dipping)
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Perbandingan tekanan darah siang hari (06:00-21:59) vs malam hari (22:00-05:59)
            </p>
          </div>
        </div>
        {hasData && (
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border
            ${cfg.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : ''}
            ${cfg.color === 'amber' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' : ''}
            ${cfg.color === 'rose' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' : ''}
            ${cfg.color === 'sky' ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800' : ''}
          `}>
            {cfg.emoji} {report.label}
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-2">
          <Moon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Data Belum Cukup</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
            Diperlukan minimal 1 pengukuran siang hari (06:00-21:59) dan 1 pengukuran malam hari (22:00-05:59) untuk analisis nocturnal dipping.
          </p>
        </div>
      ) : (
        <>
          {/* Day vs Night Comparison Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Daytime */}
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                <Sun className="w-3.5 h-3.5" /> Siang Hari
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                {report.daytimeAvgSystolic}<span className="text-slate-400 font-bold">/</span>{report.daytimeAvgDiastolic}
                <span className="text-[10px] font-bold text-slate-400 ml-1">mmHg</span>
              </div>
              <div className="text-[10px] text-slate-500">
                MAP: <strong>{report.daytimeAvgMAP} mmHg</strong> · {daytime.length} pengukuran
              </div>
            </div>

            {/* Nighttime */}
            <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                <Moon className="w-3.5 h-3.5" /> Malam Hari
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100">
                {report.nighttimeAvgSystolic}<span className="text-slate-400 font-bold">/</span>{report.nighttimeAvgDiastolic}
                <span className="text-[10px] font-bold text-slate-400 ml-1">mmHg</span>
              </div>
              <div className="text-[10px] text-slate-500">
                MAP: <strong>{report.nighttimeAvgMAP} mmHg</strong> · {nighttime.length} pengukuran
              </div>
            </div>
          </div>

          {/* Dipping Percentage Visual Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>Sistolik Dipping</span>
              <span className={`text-xs font-black
                ${report.sysDippingPercent >= 10 && report.sysDippingPercent <= 20 ? 'text-emerald-600 dark:text-emerald-400' : ''}
                ${report.sysDippingPercent < 10 && report.sysDippingPercent >= 0 ? 'text-amber-600 dark:text-amber-400' : ''}
                ${report.sysDippingPercent < 0 ? 'text-rose-600 dark:text-rose-400' : ''}
                ${report.sysDippingPercent > 20 ? 'text-sky-600 dark:text-sky-400' : ''}
              `}>
                {report.sysDippingPercent > 0 ? '-' : '+'}{Math.abs(report.sysDippingPercent)}%
              </span>
            </div>

            {/* Visual dipping bar */}
            <div className="relative h-6 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              {/* Normal range indicator (10-20%) */}
              <div
                className="absolute top-0 h-full bg-emerald-100 dark:bg-emerald-900/30 opacity-60"
                style={{ left: `${normalRangeStart}%`, width: `${normalRangeEnd - normalRangeStart}%` }}
              />
              {/* Actual dipping bar */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(dippingBarWidth / 30) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`absolute top-0 h-full rounded-full
                  ${report.sysDippingPercent >= 10 && report.sysDippingPercent <= 20 ? 'bg-emerald-500' : ''}
                  ${report.sysDippingPercent < 10 && report.sysDippingPercent >= 0 ? 'bg-amber-500' : ''}
                  ${report.sysDippingPercent < 0 ? 'bg-rose-500' : ''}
                  ${report.sysDippingPercent > 20 ? 'bg-sky-500' : ''}
                `}
              />
              {/* Scale labels */}
              <div className="absolute inset-0 flex items-center justify-between px-2 text-[8px] font-bold text-slate-400">
                <span>0%</span>
                <span>10%</span>
                <span>20%</span>
                <span>30%</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[9px] text-slate-400">
              <span className="inline-block w-2.5 h-2.5 rounded bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700" />
              Zona Normal (10-20%)
            </div>
          </div>

          {/* Clinical Advice */}
          <div className={`p-3.5 rounded-2xl border text-xs space-y-1
            ${cfg.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60' : ''}
            ${cfg.color === 'amber' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60' : ''}
            ${cfg.color === 'rose' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60' : ''}
            ${cfg.color === 'sky' ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/60' : ''}
          `}>
            <div className="flex items-center gap-1.5 font-extrabold text-slate-900 dark:text-slate-100">
              <PatternIcon className="w-4 h-4 shrink-0" />
              {report.description}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              <strong>Rekomendasi:</strong> {report.clinicalAdvice}
            </p>
          </div>
        </>
      )}
    </motion.div>
  );
};
