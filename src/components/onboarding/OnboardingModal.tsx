/* First-run guided onboarding — four steps, real actions, honest copy. */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRound, Pill, Plus, ArrowRight, Check, Heart, Shield } from '../icons/AppIcons';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import { useAppStore } from '../../store/useAppStore';

export const ONBOARDING_DONE_KEY = 'aortalink_onboarding_done';

interface OnboardingModalProps {
  open: boolean;
  onOpenProfile: () => void;
  onOpenMedication: () => void;
  onOpenReading: () => void;
  onFinish: () => void;
}

interface Step {
  title: string;
  description: string;
  actionLabel: string;
  icon: React.ReactNode;
  action: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  open,
  onOpenProfile,
  onOpenMedication,
  onOpenReading,
  onFinish
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const openScreeningModal = useAppStore((state) => state.openScreeningModal);

  const steps: Step[] = [
    {
      title: 'Lengkapi profil & target',
      description:
        'Isi nama, usia, dan target tekanan darah Anda. Semua analisis ML (tren, risiko, kepatuhan) dipersonalisasi dari angka-angka ini.',
      actionLabel: 'Buka Profil',
      icon: <UserRound size={18} />,
      action: onOpenProfile
    },
    {
      title: 'Skrining kesehatan & risiko aorta (FHIR R4)',
      description:
        'Catat tinggi, berat badan (BMI otomatis), gaya hidup, serta 16 faktor risiko vaskular & aorta berbasis standar HL7 FHIR R4. Bisa dilewati dan diisi bertahap kapan saja.',
      actionLabel: 'Mulai Skrining',
      icon: <Shield size={18} />,
      action: () => openScreeningModal()
    },
    {
      title: 'Daftarkan obat rutin (opsional)',
      description:
        'Tambahkan regimen obat Anda beserta jadwalnya. Dengan ini model kepatuhan dapat menghitung kaitan langsung antara kepatuhan minum obat dan kontrol tensi Anda.',
      actionLabel: 'Tambah Obat',
      icon: <Pill size={18} />,
      action: onOpenMedication
    },
    {
      title: 'Catat pengukuran pertama',
      description:
        'Gunakan protokol istirahat 5 menit, duduk tenang, lalu ukur. Mulai titik ini seluruh mesin analisis bekerja dari data asli Anda — bukan angka contoh.',
      actionLabel: 'Catat Tensi',
      icon: <Plus size={18} />,
      action: onOpenReading
    }
  ];

  if (!open) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const handleAction = () => {
    playClickSound();
    setCompleted((prev) => (prev.includes(stepIndex) ? prev : [...prev, stepIndex]));
    step.action();
    if (!isLast) {
      setStepIndex((i) => i + 1);
    }
  };

  const handleNext = () => {
    playClickSound();
    if (!isLast) {
      setStepIndex((i) => i + 1);
    }
  };

  const handleFinish = () => {
    playSuccessChime();
    try {
      localStorage.setItem(ONBOARDING_DONE_KEY, new Date().toISOString());
    } catch {
      // storage unavailable — onboarding will simply show again
    }
    onFinish();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10 rounded-t-[32px] sm:rounded-[32px] max-w-md w-full shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Panduan memulai AortaLink"
        >
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Heart size={20} className="fill-white/90" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100">Selamat datang di AortaLink</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Empat langkah singkat untuk mulai memantau dengan benar.</p>
              </div>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    completed.includes(i) ? 'bg-emerald-500' : i === stepIndex ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* Step content */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200 dark:border-white/10 space-y-2.5">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  {step.icon}
                </div>
                <p className="text-sm font-black">
                  {stepIndex + 1}. {step.title}
                </p>
                {completed.includes(stepIndex) && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                    <Check size={12} /> Selesai
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{step.description}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAction}
                className="flex-1 px-4 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-md shadow-teal-600/20 active:scale-95 transition-all"
              >
                {step.actionLabel}
              </button>
              {!isLast ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-3 py-3 rounded-2xl bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300 font-extrabold text-sm active:scale-95 transition-all flex items-center gap-1"
                  aria-label="Lewati langkah ini"
                >
                  Lewati <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-4 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-sm active:scale-95 transition-all"
                >
                  Selesai
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full text-center text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              Lewati panduan — saya sudah paham
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
