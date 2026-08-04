import React, { useState, useMemo } from 'react';
import { useProfiles } from '../../hooks/useProfiles';
import { useReadings } from '../../hooks/useReadings';
import { calculateAscvdRisk, buildAscvdRecord } from '../../utils/ascvd-calculator';
import { db } from '../../db';
import { useAppStore } from '../../store/useAppStore';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HeartPulse, Save, AlertTriangle, CheckCircle2, Info, TrendingUp } from 'lucide-react';

interface AscvdCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AscvdCalculatorModal: React.FC<AscvdCalculatorModalProps> = ({ isOpen, onClose }) => {
  const { activeProfile } = useProfiles();
  const { stats } = useReadings();
  const addToast = useAppStore((state) => state.addToast);

  const [age, setAge] = useState(activeProfile?.age || 55);
  const [gender, setGender] = useState<'male' | 'female'>(activeProfile?.gender === 'female' ? 'female' : 'male');
  const [race, setRace] = useState<'white' | 'african_american' | 'other'>('other');
  const [totalCholesterol, setTotalCholesterol] = useState(200);
  const [hdlCholesterol, setHdlCholesterol] = useState(50);
  const [systolicBP, setSystolicBP] = useState(stats.avgSystolic || 130);
  const [onBPTreatment, setOnBPTreatment] = useState(true);
  const [diabetes, setDiabetes] = useState(false);
  const [smoker, setSmoker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const result = useMemo(() => calculateAscvdRisk({
    age, gender, race, totalCholesterol, hdlCholesterol, systolicBP, onBPTreatment, diabetes, smoker
  }), [age, gender, race, totalCholesterol, hdlCholesterol, systolicBP, onBPTreatment, diabetes, smoker]);

  const handleSave = async () => {
    if (!activeProfile) return;
    playClickSound();
    setIsSaving(true);
    try {
      const record = buildAscvdRecord(
        { age, gender, race, totalCholesterol, hdlCholesterol, systolicBP, onBPTreatment, diabetes, smoker },
        result,
        activeProfile.id
      );
      await db.ascvdProfiles.add(record as any);
      playSuccessChime();
      addToast({ type: 'success', title: 'Disimpan!', message: `Skor ASCVD ${result.riskPercent}% tersimpan ke profil ${activeProfile.name}.` });
      onClose();
    } catch (err) {
      addToast({ type: 'error', title: 'Gagal Menyimpan', message: 'Terjadi kesalahan saat menyimpan hasil kalkulasi.' });
    } finally {
      setIsSaving(false);
    }
  };

  const riskColor = result.riskLevel === 'low' ? 'emerald' : result.riskLevel === 'borderline' ? 'amber' : result.riskLevel === 'intermediate' ? 'orange' : 'rose';

  // Gauge angle (0-180 degrees, mapped from 0-40% risk)
  const gaugeAngle = Math.min(result.riskPercent / 40 * 180, 180);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] sm:pb-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500 to-orange-500 text-white shadow-md shadow-rose-500/20">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Kalkulator Risiko ASCVD 10 Tahun
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Pooled Cohort Equations (ACC/AHA 2013)
                </p>
              </div>
            </div>
            <button onClick={() => { playClickSound(); onClose(); }} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 space-y-5">

            {/* Risk Gauge Visual */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-40 h-20 overflow-hidden">
                {/* Background arc */}
                <div className="absolute inset-0 rounded-t-full border-[10px] border-b-0 border-slate-200 dark:border-slate-700" />
                {/* Colored arc */}
                <div
                  className={`absolute inset-0 rounded-t-full border-[10px] border-b-0 transition-all duration-700
                    ${riskColor === 'emerald' ? 'border-emerald-500' : ''}
                    ${riskColor === 'amber' ? 'border-amber-500' : ''}
                    ${riskColor === 'orange' ? 'border-orange-500' : ''}
                    ${riskColor === 'rose' ? 'border-rose-500' : ''}
                  `}
                  style={{
                    clipPath: `polygon(50% 100%, 50% 0%, ${50 + 50 * Math.cos(Math.PI - (gaugeAngle * Math.PI / 180))}% ${100 - 100 * Math.sin(Math.PI - (gaugeAngle * Math.PI / 180))}%)`
                  }}
                />
                {/* Center text */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                  <span className={`text-2xl font-black
                    ${riskColor === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : ''}
                    ${riskColor === 'amber' ? 'text-amber-600 dark:text-amber-400' : ''}
                    ${riskColor === 'orange' ? 'text-orange-600 dark:text-orange-400' : ''}
                    ${riskColor === 'rose' ? 'text-rose-600 dark:text-rose-400' : ''}
                  `}>
                    {result.riskPercent >= 0 ? `${result.riskPercent}%` : 'N/A'}
                  </span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-lg text-xs font-extrabold
                ${riskColor === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : ''}
                ${riskColor === 'amber' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : ''}
                ${riskColor === 'orange' ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300' : ''}
                ${riskColor === 'rose' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300' : ''}
              `}>
                {result.riskLabel}
              </span>
            </div>

            {/* Input Form */}
            <div className="space-y-3">
              <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Parameter Pasien</h5>

              {/* Age & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500">Usia (40-79)</span>
                  <input type="number" min={40} max={79} value={age} onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500">Jenis Kelamin</span>
                  <select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="male">Pria</option>
                    <option value="female">Wanita</option>
                  </select>
                </label>
              </div>

              {/* Race */}
              <label className="space-y-1 block">
                <span className="text-[10px] font-bold text-slate-500">Ras (untuk koefisien PCE)</span>
                <select value={race} onChange={(e) => setRace(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="other">Lainnya / Asia</option>
                  <option value="white">Kulit Putih (White)</option>
                  <option value="african_american">Afrika-Amerika</option>
                </select>
              </label>

              {/* Cholesterol */}
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500">Total Kolesterol (mg/dL)</span>
                  <input type="number" min={100} max={400} value={totalCholesterol} onChange={(e) => setTotalCholesterol(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500">HDL Kolesterol (mg/dL)</span>
                  <input type="number" min={20} max={100} value={hdlCholesterol} onChange={(e) => setHdlCholesterol(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </label>
              </div>

              {/* Systolic BP */}
              <label className="space-y-1 block">
                <span className="text-[10px] font-bold text-slate-500">Tekanan Darah Sistolik (mmHg) — Otomatis dari rata-rata</span>
                <input type="number" min={90} max={220} value={systolicBP} onChange={(e) => setSystolicBP(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </label>

              {/* Toggle switches */}
              <div className="space-y-2">
                {[
                  { label: 'Dalam Terapi Obat Antihipertensi', value: onBPTreatment, setter: setOnBPTreatment },
                  { label: 'Diabetes Melitus', value: diabetes, setter: setDiabetes },
                  { label: 'Perokok Aktif', value: smoker, setter: setSmoker }
                ].map(({ label, value, setter }) => (
                  <label key={label} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={value}
                      onClick={() => { playClickSound(); setter(!value); }}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${value ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </label>
                ))}
              </div>
            </div>

            {/* Result Description */}
            {result.riskPercent >= 0 && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2
                ${riskColor === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60' : ''}
                ${riskColor === 'amber' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60' : ''}
                ${riskColor === 'orange' ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/60' : ''}
                ${riskColor === 'rose' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60' : ''}
              `}>
                <p className="font-bold text-slate-900 dark:text-slate-100">{result.riskDescription}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong>Rekomendasi Klinis:</strong> {result.clinicalAdvice}
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-2 text-[10px] text-slate-500">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Kalkulator ini menggunakan formula Pooled Cohort Equations (ACC/AHA 2013) yang bersifat open-source. Hasil estimasi BUKAN pengganti diagnosis dokter spesialis.
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-5 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              onClick={handleSave}
              disabled={isSaving || result.riskPercent < 0}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-extrabold text-sm shadow-xl shadow-rose-500/25 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan...' : `Simpan Skor ASCVD (${result.riskPercent}%)`}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
