import React from 'react';
import { BPReading } from '../../types/blood-pressure';
import { classifyBP } from '../../utils/bp-classifier';
import { motion } from 'framer-motion';
import { Heart, ShieldCheck, Activity } from '../icons/AppIcons';

interface AppleHealthRingsProps {
  readings: BPReading[];
}

export const AppleHealthRings: React.FC<AppleHealthRingsProps> = ({ readings }) => {
  if (!readings || readings.length === 0) return null;

  let normalCount = 0;
  let elevatedCount = 0;
  let stage1Count = 0;
  let stage2Count = 0;

  readings.forEach((r) => {
    const cat = classifyBP(r.systolic, r.diastolic);
    if (cat.key === 'normal') normalCount++;
    else if (cat.key === 'elevated') elevatedCount++;
    else if (cat.key === 'stage1') stage1Count++;
    else stage2Count++;
  });

  const total = readings.length;
  const normalPct = Math.round((normalCount / total) * 100);
  const elevatedPct = Math.round((elevatedCount / total) * 100);
  const stage1Pct = Math.round((stage1Count / total) * 100);
  const stage2Pct = Math.round((stage2Count / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="hallmark-card p-6 relative overflow-hidden bg-gradient-to-br from-white via-slate-50/50 to-slate-100/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/20">
            <Heart className="w-4 h-4 fill-white" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              Distribusi Kategori Apple Health
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Persentase klasifikasi AHA dari {total} data pengukuran real
            </p>
          </div>
        </div>
        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
          {normalPct}% Normal
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
        
        {/* Normal Ring Card */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
            Normal
          </span>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200">
            {normalPct}%
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">
            {normalCount} Pengukuran
          </span>
        </div>

        {/* Elevated Ring Card */}
        <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
            Meningkat
          </span>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-200">
            {elevatedPct}%
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-semibold">
            {elevatedCount} Pengukuran
          </span>
        </div>

        {/* Stage 1 Ring Card */}
        <div className="p-3.5 rounded-2xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200/60 dark:border-orange-800/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400 block">
            Hipertensi 1
          </span>
          <div className="text-2xl font-black text-orange-900 dark:text-orange-200">
            {stage1Pct}%
          </div>
          <span className="text-[10px] text-orange-600 dark:text-orange-400 block font-semibold">
            {stage1Count} Pengukuran
          </span>
        </div>

        {/* Stage 2 Ring Card */}
        <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
            Hipertensi 2 / Krisis
          </span>
          <div className="text-2xl font-black text-rose-900 dark:text-rose-200">
            {stage2Pct}%
          </div>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-semibold">
            {stage2Count} Pengukuran
          </span>
        </div>

      </div>
    </motion.div>
  );
};
