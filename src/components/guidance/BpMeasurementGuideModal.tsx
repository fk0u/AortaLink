import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Check, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  X, 
  Sparkles, 
  Activity, 
  ShieldCheck, 
  Timer
} from '../icons/AppIcons';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import { useAppStore } from '../../store/useAppStore';

interface BpMeasurementGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRestTimer: () => void;
  onOpenReadingForm: () => void;
}

export const BpMeasurementGuideModal: React.FC<BpMeasurementGuideModalProps> = ({
  isOpen,
  onClose,
  onStartRestTimer,
  onOpenReadingForm
}) => {
  const [checklist, setChecklist] = useState({
    rested: false,
    noBladder: false,
    noCaffeine: false,
    properPosture: false
  });

  const allChecked = checklist.rested && checklist.noBladder && checklist.noCaffeine && checklist.properPosture;

  const toggleCheck = (key: keyof typeof checklist) => {
    playClickSound();
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10 rounded-t-[32px] sm:rounded-[32px] max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Panduan Cara Mengukur Tekanan Darah yang Benar"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Heart size={20} className="fill-teal-500" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">Panduan Ukur Tensi yang Benar</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Standar PERHI (Dokter Hipertensi) & Kemenkes RI</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { playClickSound(); onClose(); }}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-5 overflow-y-auto space-y-5 text-sm">
            {/* Intro Alert */}
            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/40 flex items-start gap-3">
              <Sparkles size={18} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <p className="text-xs text-sky-900 dark:text-sky-200 leading-relaxed font-medium">
                Mengukur tensi dengan cara yang salah bisa membuat hasil <strong className="font-bold">10–20 mmHg lebih tinggi</strong> dari aslinya. Ikuti 4 langkah mudah di bawah ini agar hasilnya akurat.
              </p>
            </div>

            {/* Visual Step-by-Step */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                4 Langkah Emas Pengukuran Rumah
              </h3>

              <div className="grid gap-2.5">
                {/* Step 1 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 flex gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">Duduk Rileks & Tenang 5 Menit</h4>
                    <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                      Duduk di tempat yang tenang, sandarkan punggung pada kursi. Jangan merokok, minum kopi/teh, atau berolahraga 30 menit sebelumnya.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 flex gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">Posisi Manset Sejajar Jantung</h4>
                    <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                      Pasang manset pada lengan atas (2-3 cm di atas lekukan siku). Pastikan lengan bertumpu di meja sehingga manset berada tepat sejajar tinggi dada/jantung.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 flex gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">Kaki Menapak Rata di Lantai</h4>
                    <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                      Jangan menyilangkan kaki. Telapak kaki harus menapak rata di lantai agar pembuluh darah tidak terhimpit.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/5 flex gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white font-black flex items-center justify-center shrink-0 text-xs">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">Jangan Bicara Selama Pengukuran</h4>
                    <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                      Bernapaslah dengan santai dan normal. Berbicara atau menggerakkan tangan saat alat bekerja dapat menaikkan hasil tensi seketika.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Pre-Flight Checklist */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                  Cek Kesiapan Anda Sekarang
                </h4>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleCheck('rested')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-amber-500/20 text-left transition-colors"
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${checklist.rested ? 'bg-emerald-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}>
                    {checklist.rested && <Check size={13} strokeWidth={3} />}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Sudah duduk tenang & istirahat 5 menit
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleCheck('noBladder')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-amber-500/20 text-left transition-colors"
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${checklist.noBladder ? 'bg-emerald-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}>
                    {checklist.noBladder && <Check size={13} strokeWidth={3} />}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Kandung kemih kosong (sudah buang air kecil)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleCheck('noCaffeine')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-amber-500/20 text-left transition-colors"
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${checklist.noCaffeine ? 'bg-emerald-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}>
                    {checklist.noCaffeine && <Check size={13} strokeWidth={3} />}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Tidak merokok atau minum kopi/teh dalam 30 menit
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleCheck('properPosture')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-amber-500/20 text-left transition-colors"
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${checklist.properPosture ? 'bg-emerald-600 text-white' : 'border border-slate-300 dark:border-slate-600'}`}>
                    {checklist.properPosture && <Check size={13} strokeWidth={3} />}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Manset pas di lengan atas dan sejajar dada
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
                onStartRestTimer();
              }}
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Timer size={16} />
              <span>Mulai Timer Rileks 5 Menit</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSuccessChime();
                onClose();
                onOpenReadingForm();
              }}
              className="flex-1 px-4 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span>{allChecked ? 'Siap! Catat Angka Tensi' : 'Saya Sudah Siap Ukur'}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
