import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Activity, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Plus, 
  Timer, 
  BookOpen, 
  HelpCircle, 
  Stethoscope, 
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Minus
} from '../icons/AppIcons';
import { BPReading } from '../../types/blood-pressure';
import { classifyBP } from '../../utils/bp-classifier';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import { useAppStore } from '../../store/useAppStore';

interface PatientFriendlyHeroCardProps {
  latestReading: BPReading | null;
  onOpenNewReading: () => void;
  onOpenRestTimer: () => void;
  onOpenGuide: () => void;
  onOpenGlossary: () => void;
}

export const PatientFriendlyHeroCard: React.FC<PatientFriendlyHeroCardProps> = ({
  latestReading,
  onOpenNewReading,
  onOpenRestTimer,
  onOpenGuide,
  onOpenGlossary
}) => {
  const userExperienceMode = useAppStore((state) => state.userExperienceMode);
  const setUserExperienceMode = useAppStore((state) => state.setUserExperienceMode);

  const category = useMemo(() => {
    if (!latestReading) return null;
    return classifyBP(latestReading.systolic, latestReading.diastolic);
  }, [latestReading]);

  // Layman interpretation copy & visual styling
  const laymanSummary = useMemo(() => {
    if (!latestReading || !category) {
      return {
        badgeColor: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
        dotColor: 'bg-teal-500',
        statusTitle: 'Mulai Pantau Tensi Anda',
        simpleMeaning: 'Belum ada catatan tensi terbaru. Mengukur secara berkala membantu menjaga kesehatan jantung dan pembuluh darah Anda.',
        dailyTip: 'Tips awal: Duduk santai selama 5 menit sebelum melakukan pengukuran pertama Anda hari ini.',
        alertLevel: 'info'
      };
    }

    const { systolic, diastolic } = latestReading;

    if (systolic >= 180 || diastolic >= 120) {
      return {
        badgeColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        dotColor: 'bg-rose-600 animate-pulse',
        statusTitle: 'Sangat Tinggi (Krisis Hipertensi)',
        simpleMeaning: 'Tekanan darah Anda berada di zona sangat tinggi. Jangan panik, duduk tenang 5 menit lalu ukur ulang. Bila tetap tinggi atau disertai nyeri dada/sesak, segera ke IGD.',
        dailyTip: 'Penting: Hubungi dokter keluarga Anda atau layanan darurat 119 bila merasa tidak enak badan.',
        alertLevel: 'danger'
      };
    }

    if (systolic >= 140 || diastolic >= 90) {
      return {
        badgeColor: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
        dotColor: 'bg-orange-500',
        statusTitle: 'Tinggi (Perlu Perhatian)',
        simpleMeaning: 'Tekanan darah Anda sedang di atas batas normal. Tubuh memberi sinyal agar Anda mengurangi garam, menghindari stres, dan rutin kontrol ke dokter.',
        dailyTip: 'Tips hari ini: Batasi makanan tinggi garam/micin dan luangkan waktu tidur minimal 7 jam malam ini.',
        alertLevel: 'warning'
      };
    }

    if (systolic >= 130 || diastolic >= 80) {
      return {
        badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        dotColor: 'bg-amber-500',
        statusTitle: 'Mulai Meningkat (Waspada)',
        simpleMeaning: 'Tekanan darah sedikit di atas batas ideal. Ini saat terbaik untuk memperbaiki pola makan dan jalan santai sebelum menjadi darah tinggi permanen.',
        dailyTip: 'Tips hari ini: Kurangi minuman manis dan ganti camilan gorengan dengan buah segar tinggi kalium seperti pisang.',
        alertLevel: 'caution'
      };
    }

    if (systolic >= 120 && diastolic < 80) {
      return {
        badgeColor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
        dotColor: 'bg-sky-500',
        statusTitle: 'Sedikit di Atas Ideal',
        simpleMeaning: 'Tekanan darah Anda masih dalam kategori aman, namun sedikit meningkat. Pertahankan hidrasi air putih dan olahraga ringan.',
        dailyTip: 'Tips hari ini: Minum 2 liter air putih dan lakukan peregangan santai selama 10 menit.',
        alertLevel: 'normal'
      };
    }

    // Normal (<120 and <80)
    return {
      badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      dotColor: 'bg-emerald-500',
      statusTitle: 'Bagus Sekali! Tensi Normal',
      simpleMeaning: 'Jantung dan pembuluh darah Anda bekerja dengan santai dan optimal. Terus pertahankan kebiasaan sehat ini!',
      dailyTip: 'Tips hari ini: Tetap pertahankan pola makan rendah garam dan jalan kaki 20–30 menit hari ini.',
      alertLevel: 'success'
    };
  }, [latestReading, category]);

  const toggleMode = () => {
    playClickSound();
    const next = userExperienceMode === 'patient' ? 'clinical' : 'patient';
    setUserExperienceMode(next);
  };

  return (
    <div className="rounded-[28px] bg-white dark:bg-[#1c1c1e] border border-slate-200/90 dark:border-white/10 p-5 md:p-6 shadow-sm space-y-5 transition-all">
      {/* Top Header Row with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-teal-600/20">
            <Heart size={18} className="fill-white" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
              Kesehatan Jantung & Tensi Anda
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {userExperienceMode === 'patient' ? 'Mode Ramah Pasien & Keluarga' : 'Mode Klinisi (Dokter/Peneliti)'}
            </p>
          </div>
        </div>

        {/* Mode Switcher Pill */}
        <button
          type="button"
          onClick={toggleMode}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95"
          title="Beralih antara Mode Pasien Awam dan Mode Klinisi"
        >
          {userExperienceMode === 'patient' ? (
            <>
              <Stethoscope size={13} className="text-teal-600 dark:text-teal-400" />
              <span>Ganti ke Mode Dokter</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
              <span>Ganti ke Mode Awam</span>
            </>
          )}
        </button>
      </div>

      {/* Main Status Display */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Left Column: Big Numbers & Status Badge */}
        <div className="md:col-span-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${laymanSummary.badgeColor}`}>
              <span className={`w-2 h-2 rounded-full ${laymanSummary.dotColor}`} />
              {laymanSummary.statusTitle}
            </span>
            {latestReading && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                {new Date(latestReading.timestamp).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
          </div>

          {latestReading ? (
            <div className="flex items-baseline gap-3">
              <div className="space-y-0.5">
                <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {latestReading.systolic}
                  <span className="text-slate-400 font-light mx-1">/</span>
                  {latestReading.diastolic}
                </span>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1.5">
                  mmHg
                </span>
              </div>

              {typeof latestReading.pulse === 'number' && (
                <div className="pl-4 border-l border-slate-200 dark:border-white/10 flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Activity size={16} className="text-rose-500 shrink-0" />
                  <div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{latestReading.pulse}</span>
                    <span className="text-[10px] text-slate-400 block -mt-1">detak/mnt</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-2">
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                Belum ada data tensi tercatat
              </p>
            </div>
          )}

          {/* Simple Meaning for Layman */}
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {laymanSummary.simpleMeaning}
          </p>
        </div>

        {/* Right Column: Daily Practical Tip */}
        <div className="md:col-span-6 p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/30 space-y-2">
          <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
            <Sparkles size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
            <h4 className="text-xs font-black uppercase tracking-wider">
              Anjuran Praktis Hari Ini
            </h4>
          </div>
          <p className="text-xs text-teal-950 dark:text-teal-100 leading-relaxed">
            {laymanSummary.dailyTip}
          </p>
        </div>
      </div>

      {/* Quick Action Buttons for Lay Users */}
      <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => { playSuccessChime(); onOpenNewReading(); }}
          className="p-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm shadow-teal-600/20 active:scale-95 transition-all col-span-2 sm:col-span-1"
        >
          <Plus size={16} strokeWidth={2.6} />
          <span>Catat Tensi Baru</span>
        </button>

        <button
          type="button"
          onClick={() => { playClickSound(); onOpenRestTimer(); }}
          className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <Timer size={15} className="text-teal-600 dark:text-teal-400" />
          <span>Rileks 5 Menit</span>
        </button>

        <button
          type="button"
          onClick={() => { playClickSound(); onOpenGuide(); }}
          className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <BookOpen size={15} className="text-sky-600 dark:text-sky-400" />
          <span>Cara Ukur Benar</span>
        </button>

        <button
          type="button"
          onClick={() => { playClickSound(); onOpenGlossary(); }}
          className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <HelpCircle size={15} className="text-amber-600 dark:text-amber-400" />
          <span>Kamus Tensi</span>
        </button>
      </div>
    </div>
  );
};
