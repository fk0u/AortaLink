import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, CheckCircle2, Heart, AlertCircle, Info, ShieldCheck } from '../icons/AppIcons';

interface KnowledgeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeGuideModal: React.FC<KnowledgeGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-[#1c1c1e] rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Panduan Medis &amp; Tata Cara Ukur Tensi Benar
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Standar klinis AHA / WHO untuk hasil pengukuran yang akurat
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            
            {/* Step-by-step prep guide */}
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-500" />
                2. Tata Cara Mengukur Tekanan Darah yang Akurat di Rumah
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 space-y-1">
                  <span className="font-bold text-teal-600 dark:text-teal-400">1. Istirahat 5 Menit</span>
                  <p className="text-slate-500">Duduk tenang di kursi dengan punggung tersandar dan kaki menempel di lantai. Jangan mengobrol saat diukur.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 space-y-1">
                  <span className="font-bold text-teal-600 dark:text-teal-400">2. Hindari Stimulan</span>
                  <p className="text-slate-500">Jangan minum kopi/kafein, merokok, atau berolahraga berat 30 menit sebelum pengukuran.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 space-y-1">
                  <span className="font-bold text-teal-600 dark:text-teal-400">3. Posisi Lengan Sejajar Jantung</span>
                  <p className="text-slate-500">Letakkan lengan di atas meja sehingga manset tensimeter berada setinggi posisi jantung Anda.</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 space-y-1">
                  <span className="font-bold text-teal-600 dark:text-teal-400">4. Ukur 2 Kali berturut-turut</span>
                  <p className="text-slate-500">Beri jeda 1-2 menit antar pengukuran untuk mendapatkan hasil rata-rata yang stabil.</p>
                </div>
              </div>
            </div>

            {/* Medical Metrics Explanation */}
            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 space-y-2">
              <h4 className="text-sm font-bold text-sky-900 dark:text-sky-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-600" />
                Mengenal Istilah Klinis Penting
              </h4>
              <ul className="space-y-2 text-sky-950 dark:text-sky-200">
                <li>
                  <strong>Sistolik (Tekanan Atas):</strong> Tekanan saat jantung berdetak memompa darah ke seluruh tubuh.
                </li>
                <li>
                  <strong>Diastolik (Tekanan Bawah):</strong> Tekanan di dalam pembuluh darah saat jantung beristirahat di antara detakan.
                </li>
                <li>
                  <strong>Mean Arterial Pressure (MAP):</strong> Tekanan rata-rata perfusi organ vital tubuh. Nilai normal berkisar antara 70 - 100 mmHg.
                </li>
                <li>
                  <strong>Pulse Pressure (Selisih Tensi):</strong> Selisih antara Sistolik dan Diastolik. Selisih &gt; 60 mmHg menunjukkan potensi kekakuan pembuluh darah arteri.
                </li>
              </ul>
            </div>

            {/* Diet DASH & Lifestyle Recommendations */}
            <div className="space-y-2">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                Gaya Hidup &amp; Diet DASH untuk Pengendalian Hipertensi
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-300">
                <li>Batasi asupan garam/natrium maksimal 1 sendok teh (5 gram garam) per hari.</li>
                <li>Perbanyak konsumsi sayuran hijau, buah-buahan segar, dan makanan kaya Kalium.</li>
                <li>Lakukan aktivitas fisik ringan-sedang seperti jalan kaki 30 menit sehari.</li>
                <li>Kelola stres dengan meditasi, pernapasan dalam, dan waktu tidur berkualitas 7-8 jam.</li>
              </ul>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
