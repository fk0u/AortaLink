import React from 'react';
import { BPReading } from '../../types/blood-pressure';
import { classifyBP } from '../../utils/bp-classifier';
import { formatDateIndonesian } from '../../utils/formatters';
import { playClickSound } from '../../utils/audio-fx';
import { Heart, Edit3, Trash2, Tag, Clock } from '../icons/AppIcons';
import { motion } from 'framer-motion';

interface ReadingCardProps {
  reading: BPReading;
  onEdit: (reading: BPReading) => void;
  onDelete: (id: string) => void;
}

export const ReadingCard: React.FC<ReadingCardProps> = ({ reading, onEdit, onDelete }) => {
  const category = classifyBP(reading.systolic, reading.diastolic);
  
  // Calculate MAP & Pulse Pressure
  const mapValue = Math.round((2 * reading.diastolic + reading.systolic) / 3);
  const pulsePressure = reading.systolic - reading.diastolic;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="group relative overflow-hidden rounded-[22px] bg-white dark:bg-[#1c1c1e] border border-slate-200/80 dark:border-white/10 p-4 shadow-sm hover:shadow-md transition-all duration-200"
    >
      {/* Category Indicator Accent Strip */}
      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${category.colorClass}`} />

      <div className="pl-2 space-y-2.5">
        
        {/* Header: BP Values, Category Pill & Actions */}
        <div className="flex items-start justify-between gap-2">
          
          {/* BP Numeric Headline */}
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-50 font-mono tracking-tight">
                {reading.systolic} / {reading.diastolic}
              </span>
              <span className="text-[11px] font-black uppercase text-slate-400">
                mmHg
              </span>
            </div>

            {/* Timestamp & Pulse */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock size={12} className="text-slate-400" />
                {formatDateIndonesian(reading.timestamp)}
              </span>

              <span className="inline-flex items-center gap-1 font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-md text-[11px]">
                <Heart size={12} className="fill-rose-500" />
                {reading.pulse} BPM
              </span>
            </div>
          </div>

          {/* Category Badge & Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${category.badgeClass}`}>
              {category.label}
            </span>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                onEdit(reading);
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90"
              title="Edit Catatan"
              aria-label="Edit catatan"
            >
              <Edit3 size={15} />
            </button>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                if (reading.id) onDelete(reading.id);
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all active:scale-90"
              title="Hapus Catatan"
              aria-label="Hapus catatan"
            >
              <Trash2 size={15} />
            </button>
          </div>

        </div>

        {/* Clinical Parameters: Context, Position, MAP, Pulse Pressure */}
        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
          {reading.measurement_context && (
            <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
              {reading.measurement_context}
            </span>
          )}

          {reading.position && (
            <span className="capitalize px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-400">
              {reading.position} • {reading.arm || 'kiri'}
            </span>
          )}

          <span className="px-2 py-0.5 rounded-md font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
            MAP: {mapValue} mmHg
          </span>

          <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-400">
            PP: {pulsePressure} mmHg
          </span>
        </div>

        {/* Tags */}
        {reading.tags && reading.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            {reading.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md"
              >
                <Tag size={10} className="text-teal-500" />
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Clinical Note / Doctor Notes */}
        {reading.notes && (
          <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-1 border-t border-slate-100 dark:border-white/10">
            &ldquo;{reading.notes}&rdquo;
          </p>
        )}

      </div>
    </motion.article>
  );
};
