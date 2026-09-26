import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { BPReading, DateFilterRange } from '../../types/blood-pressure';
import { useAppStore } from '../../store/useAppStore';
import { formatDateShort, formatTimeOnly } from '../../utils/formatters';
import { classifyBP } from '../../utils/bp-classifier';
import { HeartWaveCanvas } from '../effects/HeartWaveCanvas';
import { AdvancedMetricsModal } from '../analytics/AdvancedMetricsModal';
import { TrendingUp, Calendar, Sparkles } from '../icons/AppIcons';
import { motion } from 'framer-motion';
import { playClickSound } from '../../utils/audio-fx';

interface BPTrendChartProps {
  readings: BPReading[];
}

export const BPTrendChart: React.FC<BPTrendChartProps> = ({ readings }) => {
  const dateFilter = useAppStore((state) => state.dateFilter);
  const setDateFilter = useAppStore((state) => state.setDateFilter);

  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  // Prepare chart data (chronological from oldest to newest)
  const chartData = [...readings].reverse().map((r) => ({
    id: r.id,
    dateStr: formatDateShort(r.timestamp),
    timeStr: formatTimeOnly(r.timestamp),
    systolic: r.systolic,
    diastolic: r.diastolic,
    pulse: r.pulse,
    rawReading: r
  }));

  const latestPulse = readings.length > 0 ? readings[0].pulse : 72;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const reading: BPReading = data.rawReading;
      const cat = classifyBP(reading.systolic, reading.diastolic);

      return (
        <div className="bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 text-xs space-y-1.5 min-w-[170px]">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-1">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {data.dateStr}, {data.timeStr}
            </span>
            <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-extrabold ${cat.badgeClass}`}>
              {cat.label}
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Sistolik:</span>
              <span className="font-extrabold text-sky-600 dark:text-sky-400">{reading.systolic} mmHg</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Diastolik:</span>
              <span className="font-extrabold text-teal-600 dark:text-teal-400">{reading.diastolic} mmHg</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Nadi:</span>
              <span className="font-semibold text-rose-500">{reading.pulse} BPM</span>
            </div>
          </div>

          {reading.notes && (
            <p className="text-[10px] text-slate-500 italic border-t border-slate-100 dark:border-white/10 pt-1">
              &ldquo;{reading.notes}&rdquo;
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="m3-surface-card p-4 sm:p-5 space-y-3 relative overflow-hidden"
      >
        {/* ECG Wave Background */}
        <div className="h-6 w-full opacity-35 overflow-hidden -mt-1">
          <HeartWaveCanvas bpm={latestPulse} />
        </div>

        {/* Header & Date Range Chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shrink-0">
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                Grafik Tren Tekanan Darah Real
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Kurva Sistolik &amp; Diastolik EMR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Advanced Analytics Trigger Button */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsAnalyticsModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-bold inline-flex items-center gap-1 active:scale-95 transition-all"
            >
              <Sparkles size={12} className="text-teal-500" />
              <span>Analisis Vaskular</span>
            </button>

            {/* Date Range Chips */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/10 rounded-xl text-[11px]">
              {(['7days', '30days', '90days', 'all'] as DateFilterRange[]).map((range) => {
                const labels: Record<string, string> = {
                  '7days': '7H',
                  '30days': '30H',
                  '90days': '90H',
                  'all': 'Semua'
                };
                const isSelected = dateFilter === range;

                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setDateFilter(range);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {labels[range]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        {chartData.length > 0 ? (
          <div className="h-64 sm:h-72 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="sysGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="diaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.15} />
                <XAxis
                  dataKey="dateStr"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[50, 200]}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Reference Safe Thresholds */}
                <ReferenceLine y={120} stroke="#f59e0b" strokeDasharray="3 3" />
                <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" />

                <Area type="monotone" dataKey="systolic" stroke="none" fill="url(#sysGradient)" />
                <Area type="monotone" dataKey="diastolic" stroke="none" fill="url(#diaGradient)" />

                <Line
                  type="monotone"
                  dataKey="systolic"
                  name="Sistolik"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#0284c7', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#0284c7', strokeWidth: 2, stroke: '#ffffff' }}
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  name="Diastolik"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl space-y-1.5">
            <Calendar size={28} className="text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Belum Ada Data Tren Tekanan Darah
            </p>
            <p className="text-[10px] text-slate-400 max-w-xs">
              Catatan tensi yang Anda masukkan akan langsung tergambar di kurva ini secara real-time.
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 pt-1.5 border-t border-slate-100 dark:border-white/10 text-[11px] font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="text-slate-700 dark:text-slate-300">Sistolik (Target &le; 120)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-700 dark:text-slate-300">Diastolik (Target &le; 80)</span>
          </div>
        </div>
      </motion.div>

      <AdvancedMetricsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
      />
    </>
  );
};
