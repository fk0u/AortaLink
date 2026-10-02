import React, { useState } from 'react';
import { BPSummaryStats } from '../../types/blood-pressure';
import { classifyBP, classifyPulse } from '../../utils/bp-classifier';
import { formatDateIndonesian } from '../../utils/formatters';
import { playClickSound } from '../../utils/audio-fx';
import { speakTextIndonesian } from '../../utils/speech-reader';
import { 
  Activity, 
  Heart, 
  Calendar, 
  BookOpen, 
  Volume2, 
  HeartPulse
} from '../icons/AppIcons';
import { motion } from 'framer-motion';
import { KnowledgeGuideModal } from '../common/KnowledgeGuideModal';
import { useProfiles } from '../../hooks/useProfiles';

interface StatCardsProps {
  stats: BPSummaryStats;
  onOpenNewReading: () => void;
  onOpenRestTimer?: () => void;
}

export const StatCards: React.FC<StatCardsProps> = ({ 
  stats, 
  onOpenNewReading
}) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const { activeProfile } = useProfiles();

  const latest = stats.latestReading;
  const latestCategory = latest
    ? classifyBP(latest.systolic, latest.diastolic, activeProfile?.guidelinePreference, {
        isHomeMeasurement: latest.measurement_context === 'Home'
      })
    : null;
  const pulseStatus = classifyPulse(stats.avgPulse);

  // Mean Arterial Pressure (MAP) = (2 * Diastolic + Systolic) / 3
  const mapValue = latest ? Math.round((2 * latest.diastolic + latest.systolic) / 3) : null;
  // Pulse Pressure (PP) = Systolic - Diastolic
  const pulsePressure = latest ? latest.systolic - latest.diastolic : null;

  const getGlowClass = (catKey?: string) => {
    switch (catKey) {
      case 'optimal':
      case 'normal': return 'glow-normal border-emerald-500/30 dark:border-emerald-500/40 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]';
      case 'elevated': return 'glow-elevated border-amber-500/30 dark:border-amber-500/40 bg-amber-500/[0.03] dark:bg-amber-500/[0.05]';
      case 'stage1': return 'glow-stage1 border-orange-500/30 dark:border-orange-500/40 bg-orange-500/[0.03] dark:bg-orange-500/[0.05]';
      case 'stage2': return 'glow-stage2 border-rose-500/30 dark:border-rose-500/40 bg-rose-500/[0.03] dark:bg-rose-500/[0.05]';
      case 'stage3':
      case 'crisis': return 'glow-crisis border-rose-600/40 dark:border-rose-600/50 bg-rose-600/[0.06] dark:bg-rose-600/[0.08]';
      default: return 'border-teal-500/20 bg-white dark:bg-slate-900';
    }
  };

  const handleSpeak = () => {
    playClickSound();
    if (!latest) {
      speakTextIndonesian('Belum ada data pengukuran tekanan darah.');
      return;
    }
    const catLabel = latestCategory ? latestCategory.label : '';
    const pulseDesc = typeof latest.pulse === 'number' ? `, dengan denyut nadi ${latest.pulse} detak per menit` : '';
    const text = `Tekanan darah ${activeProfile?.name || 'Pasien'} adalah ${latest.systolic} per ${latest.diastolic} milimeter raksa${pulseDesc}. Kategori ${catLabel}.`;
    speakTextIndonesian(text);
  };

  return (
    <>
      <div className="space-y-4">
        
        {/* MATERIAL 3 HERO CARD: DYNAMIC BLOOD PRESSURE GAUGE */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className={`m3-card-hero p-5 sm:p-6 ${getGlowClass(latestCategory?.key)}`}
        >
          {/* Ambient lighting */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-400/10 dark:bg-teal-400/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-500/25 shrink-0">
                  <Activity size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                    {latest ? 'Pengukuran Terakhir (Real-time)' : 'Jurnal Tensi Kosong'}
                  </span>
                  {latest && (
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Calendar size={12} className="text-teal-500" />
                      {formatDateIndonesian(latest.timestamp)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons: Medical Guide */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setIsGuideOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 text-[11px] font-bold inline-flex items-center gap-1.5 active:scale-95 transition-all"
                  title="Panduan Medis Cara Ukur Tensi"
                >
                  <BookOpen size={14} className="text-teal-500" />
                  <span>Panduan Medis</span>
                </button>
              </div>
            </div>

            {/* Main Numeric Presentation: Large Systolic/Diastolic + Pulse */}
            {latest ? (
              <div className="pt-1">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                  
                  {/* BP Numbers */}
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900 dark:text-slate-50">
                        {latest.systolic} / {latest.diastolic}
                      </span>
                      <span className="text-xs font-black uppercase text-slate-400 dark:text-slate-500">
                        mmHg
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                      {/* Pulse BPM */}
                      {typeof latest.pulse === 'number' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-900/60">
                          <Heart size={14} className="text-rose-500 fill-rose-500 animate-pulse" />
                          {latest.pulse} BPM
                        </span>
                      )}

                      {/* Position & Arm */}
                      {latest.position && (
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#2c2c2e] px-2 py-0.5 rounded-lg capitalize">
                          {latest.position} • {latest.arm || 'kiri'}
                        </span>
                      )}

                      {/* Measurement Context */}
                      {latest.measurement_context && (
                        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60">
                          {latest.measurement_context}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Category Status Pill */}
                  {latestCategory && (
                    <div className="sm:text-right shrink-0">
                      <span className={`m3-chip ${latestCategory.badgeClass} shadow-sm text-xs font-black py-1.5 px-3`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${latestCategory.colorClass} animate-pulse`} />
                        {latestCategory.label}
                      </span>
                    </div>
                  )}

                </div>

                {/* Split Visual Meter Bar: Systolic & Diastolic */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Systolic Gauge */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span>Sistolik ({latest.systolic})</span>
                        <span className={latest.systolic <= 120 ? 'text-emerald-500' : 'text-amber-500'}>
                          Target &le; 120
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#2c2c2e] overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            latest.systolic <= 120 ? 'bg-emerald-500' :
                            latest.systolic <= 129 ? 'bg-amber-500' :
                            latest.systolic <= 139 ? 'bg-orange-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(15, (latest.systolic / 180) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {/* Diastolic Gauge */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <span>Diastolik ({latest.diastolic})</span>
                        <span className={latest.diastolic <= 80 ? 'text-emerald-500' : 'text-amber-500'}>
                          Target &le; 80
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-[#2c2c2e] overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            latest.diastolic <= 80 ? 'bg-emerald-500' :
                            latest.diastolic <= 89 ? 'bg-orange-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(15, (latest.diastolic / 120) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Calculated Clinical Metrics: MAP & Pulse Pressure */}
                  <div className="pt-2 flex items-center gap-2 flex-wrap text-[11px]">
                    {mapValue && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-900/60">
                        <HeartPulse size={12} className="text-teal-500" />
                        MAP: {mapValue} mmHg (Perfusi Normal 70-105)
                      </span>
                    )}

                    {pulsePressure && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#2c2c2e] text-slate-700 dark:text-slate-300 font-bold">
                        Tekanan Nadi: {pulsePressure} mmHg (Normal 30-50)
                      </span>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              /* Empty Jurnal State */
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-inner">
                  <Activity size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200">
                    Mulai Catat Tekanan Darah Pertama
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Aplikasi ini 100% bebas dari data dummy. Tekan tombol di bawah untuk mencatat tensi Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onOpenNewReading();
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 text-white font-extrabold text-xs shadow-lg shadow-teal-500/25 active:scale-95 transition-all"
                >
                  + Catat Pengukuran Real
                </button>
              </div>
            )}

          </div>
        </motion.div>

        {/* SECONDARY METRICS: 7-DAY AVERAGE & PULSE HEALTH */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          
          {/* Card: Rata-Rata Sistolik/Diastolik */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Rata-Rata 7 Hari
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-slate-100">
                {stats.avgSystolic || '-'}/{stats.avgDiastolic || '-'}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">mmHg</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {stats.totalReadings} pengukuran
            </p>
          </div>

          {/* Card: Rata-Rata Nadi / Heart Rate */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Rata-Rata Nadi
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-black font-mono text-rose-500">
                {stats.avgPulse || '-'}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">BPM</span>
            </div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              {pulseStatus.label}
            </p>
          </div>

          {/* Card: Rentang Min - Max Tensi */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Rentang Min &mdash; Max
            </span>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono pt-0.5">
              {stats.minSystolic ? `${stats.minSystolic}/${stats.minDiastolic}` : '-'} &mdash; {stats.maxSystolic ? `${stats.maxSystolic}/${stats.maxDiastolic}` : '-'}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              Variabilitas tekanan darah
            </p>
          </div>

        </div>

      </div>

      {/* Panduan Medis Knowledge Modal */}
      <KnowledgeGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </>
  );
};
