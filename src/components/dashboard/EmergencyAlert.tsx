import React from 'react';
import { BPReading } from '../../types/blood-pressure';
import { classifyBP } from '../../utils/bp-classifier';
import { AlertOctagon, PhoneCall, ShieldAlert } from '../icons/AppIcons';
import { motion } from 'framer-motion';

interface EmergencyAlertProps {
  latestReading?: BPReading;
}

export const EmergencyAlert: React.FC<EmergencyAlertProps> = ({ latestReading }) => {
  if (!latestReading) return null;

  const category = classifyBP(latestReading.systolic, latestReading.diastolic);
  
  // Show emergency alert only for true Hypertensive Crisis (>=180/120)
  if (category.key !== 'crisis') {
    return null;
  }

  const isCrisis = true;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-3xl p-5 border shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isCrisis
          ? 'bg-purple-950/90 text-white border-purple-600 shadow-purple-900/30'
          : 'bg-rose-950/90 text-white border-rose-600 shadow-rose-900/30'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-2xl shrink-0 ${isCrisis ? 'bg-purple-800 animate-pulse' : 'bg-rose-800'}`}>
          {isCrisis ? <AlertOctagon size={28} className="text-purple-200" /> : <ShieldAlert size={28} className="text-rose-200" />}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-extrabold tracking-wide">
              {isCrisis ? 'PERINGATAN: KRISIS HIPERTENSI' : 'PERHATIAN: HIPERTENSI TAHAP 2'}
            </h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-bold">
              {latestReading.systolic}/{latestReading.diastolic} mmHg
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed max-w-2xl">
            {isCrisis
              ? 'Tekanan darah Anda berada di atas 180/120 mmHg. Duduk tenang, hindari aktivitas fisik berlebih, dan SEGERA hubungi atau kunjungi fasilitas kesehatan terdekat (IGD).'
              : 'Tekanan darah Anda cukup tinggi (≥ 140/90 mmHg). Sangat disarankan untuk beristirahat, minum air putih, dan berkonsultasi dengan dokter untuk evaluasi dosis obat.'}
          </p>
        </div>
      </div>

      <div className="shrink-0 w-full md:w-auto flex items-center gap-3">
        <a
          href="tel:119"
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-rose-900 font-bold text-xs shadow-lg hover:bg-slate-100 transition-colors"
        >
          <PhoneCall size={16} className="text-rose-600" />
          Panggil Ambulans (119)
        </a>
      </div>
    </motion.div>
  );
};
