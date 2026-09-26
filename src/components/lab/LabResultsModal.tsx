import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FlaskConical, Plus, Trash2, Calendar, ShieldAlert, CheckCircle2 } from '../icons/AppIcons';
import { timeService } from '../../services/time/time-service';
import { format } from 'date-fns';

interface LabResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper eGFR (CKD-EPI 2021 formula)
function calculateEGFR(creatinine: number, age: number = 45, gender: string = 'male'): number {
  if (!creatinine || creatinine <= 0) return 90;
  const isFemale = gender === 'female';
  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const minRatio = Math.min(creatinine / kappa, 1);
  const maxRatio = Math.max(creatinine / kappa, 1);
  const genderMultiplier = isFemale ? 1.012 : 1;
  const egfr = 142 * Math.pow(minRatio, alpha) * Math.pow(maxRatio, -1.200) * Math.pow(0.9938, age) * genderMultiplier;
  return Math.round(egfr * 10) / 10;
}

export const LabResultsModal: React.FC<LabResultsModalProps> = ({ isOpen, onClose }) => {
  const { activeProfileId, activeProfile } = useProfiles();
  const addToast = useAppStore((state) => state.addToast);

  // Form states - Renal & Gout
  const [uricAcid, setUricAcid] = useState<number>(6.2);
  const [bloodUrea, setBloodUrea] = useState<number>(28);
  const [serumCreatinine, setSerumCreatinine] = useState<number>(0.9);
  
  // Hospital Extended Parameters
  const [showExtended, setShowExtended] = useState<boolean>(false);
  const [totalCholesterol, setTotalCholesterol] = useState<number>(190);
  const [ldlCholesterol, setLdlCholesterol] = useState<number>(115);
  const [hdlCholesterol, setHdlCholesterol] = useState<number>(52);
  const [triglycerides, setTriglycerides] = useState<number>(140);
  const [fastingBloodSugar, setFastingBloodSugar] = useState<number>(95);
  const [hba1c, setHba1c] = useState<number>(5.6);
  const [potassium, setPotassium] = useState<number>(4.2);
  const [sodium, setSodium] = useState<number>(140);
  const [proteinuria, setProteinuria] = useState<'negatif' | 'trace' | '+1' | '+2' | '+3'>('negatif');

  const [dateStr, setDateStr] = useState<string>(() => timeService.getLocalDateString());
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto eGFR calculation
  const calculatedEGFR = calculateEGFR(serumCreatinine, activeProfile?.age || 45, activeProfile?.gender || 'male');

  // Query lab results for active profile
  const labResults = useLiveQuery(
    async () => {
      if (!activeProfileId) return [];
      return await db.labResults.where('profileId').equals(activeProfileId).sortBy('timestamp');
    },
    [activeProfileId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfileId) {
      addToast({ type: 'error', title: 'Gagal', message: 'Profil tidak aktif.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const isoTimestamp = new Date(`${dateStr}T10:00:00`).toISOString();

      await db.labResults.add({
        profileId: activeProfileId,
        timestamp: isoTimestamp,
        uricAcid: Number(uricAcid),
        bloodUrea: Number(bloodUrea),
        serumCreatinine: Number(serumCreatinine),
        eGfr: calculatedEGFR,
        totalCholesterol: showExtended ? Number(totalCholesterol) : undefined,
        ldlCholesterol: showExtended ? Number(ldlCholesterol) : undefined,
        hdlCholesterol: showExtended ? Number(hdlCholesterol) : undefined,
        triglycerides: showExtended ? Number(triglycerides) : undefined,
        fastingBloodSugar: showExtended ? Number(fastingBloodSugar) : undefined,
        hba1c: showExtended ? Number(hba1c) : undefined,
        potassium: showExtended ? Number(potassium) : undefined,
        sodium: showExtended ? Number(sodium) : undefined,
        proteinuria: showExtended ? proteinuria : undefined,
        notes
      });

      playSuccessChime();
      addToast({
        type: 'success',
        title: 'Hasil Lab Standar Rumah Sakit Tersimpan',
        message: `Asam Urat: ${uricAcid} mg/dL, Kreatinin: ${serumCreatinine} mg/dL (eGFR ${calculatedEGFR} mL/min).`
      });

      // Reset form
      setNotes('');
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Gagal menyimpan hasil laboratorium.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    try {
      playClickSound();
      await db.labResults.delete(id);
      addToast({ type: 'info', title: 'Dihapus', message: 'Catatan lab telah dihapus.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Gagal menghapus data lab.' });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Parameter Lab Sekunder (Renal & Gout)
                </h3>
                <p className="text-[11px] font-medium text-slate-400">
                  Ureum Darah, Kreatinin Darah & Asam Urat (Spesialis Penyakit Dalam)
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

          <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Input Hasil Lab Baru
                </span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Uric Acid */}
                <div className="bg-white dark:bg-slate-700/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1">
                  <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                    Asam Urat
                  </label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      step="0.1"
                      value={uricAcid}
                      onChange={(e) => setUricAcid(Number(e.target.value))}
                      className="w-full text-lg font-black text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                      required
                    />
                    <span className="text-[10px] text-slate-400 font-bold">mg/dL</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block">Normal &lt; 7.0</span>
                </div>

                {/* Blood Urea */}
                <div className="bg-white dark:bg-slate-700/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1">
                  <label className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase">
                    Ureum Darah
                  </label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      step="1"
                      value={bloodUrea}
                      onChange={(e) => setBloodUrea(Number(e.target.value))}
                      className="w-full text-lg font-black text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                      required
                    />
                    <span className="text-[10px] text-slate-400 font-bold">mg/dL</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block">Normal 15–45</span>
                </div>

                {/* Serum Creatinine */}
                <div className="bg-white dark:bg-slate-700/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 space-y-1">
                  <label className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase">
                    Kreatinin
                  </label>
                  <div className="flex items-baseline gap-1">
                    <input
                      type="number"
                      step="0.1"
                      value={serumCreatinine}
                      onChange={(e) => setSerumCreatinine(Number(e.target.value))}
                      className="w-full text-lg font-black text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                      required
                    />
                    <span className="text-[10px] text-slate-400 font-bold">mg/dL</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block">Normal 0.6–1.2</span>
                </div>
              </div>

              {/* Real-time eGFR CKD-EPI Badge */}
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-teal-900 dark:text-teal-300 block">
                    Kalkulasi Otomatis Laju Filtrasi Glomerulus (eGFR CKD-EPI 2021)
                  </span>
                  <span className="text-xs font-black text-teal-700 dark:text-teal-400">
                    {calculatedEGFR} mL/min/1.73m² • {calculatedEGFR >= 90 ? 'Stadium 1 (Fungsi Ginjal Normal/Optimal)' : calculatedEGFR >= 60 ? 'Stadium 2 (Penurunan Ringan)' : calculatedEGFR >= 45 ? 'Stadium 3a (Penurunan Sedang)' : 'Evaluasi Nefrologi'}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-200 dark:bg-teal-900 text-teal-900 dark:text-teal-200">
                  {activeProfile?.age || 45} Th • {activeProfile?.gender === 'female' ? 'Wanita' : 'Pria'}
                </span>
              </div>

              {/* Toggle Extended Hospital Parameters */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowExtended(!showExtended)}
                  className="text-[11px] font-extrabold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                  <span>{showExtended ? '− Sembunyikan Parameter Tambahan' : '+ Parameter Lab Lanjutan (Lipid, Gula Darah, Elektrolit & Urin)'}</span>
                </button>
              </div>

              {/* Extended Hospital Form Fields */}
              {showExtended && (
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Profil Lipid &amp; Kardiovaskular (AHA/ACC)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <label className="text-[9px] font-bold text-slate-500 block">Total Kolesterol</label>
                      <input
                        type="number"
                        value={totalCholesterol}
                        onChange={(e) => setTotalCholesterol(Number(e.target.value))}
                        className="w-full text-xs font-black bg-transparent focus:outline-none"
                      />
                      <span className="text-[8px] text-slate-400">&lt;200 mg/dL</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <label className="text-[9px] font-bold text-slate-500 block">LDL-C (Jahat)</label>
                      <input
                        type="number"
                        value={ldlCholesterol}
                        onChange={(e) => setLdlCholesterol(Number(e.target.value))}
                        className="w-full text-xs font-black bg-transparent focus:outline-none"
                      />
                      <span className="text-[8px] text-slate-400">&lt;100 mg/dL</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <label className="text-[9px] font-bold text-slate-500 block">HDL-C (Baik)</label>
                      <input
                        type="number"
                        value={hdlCholesterol}
                        onChange={(e) => setHdlCholesterol(Number(e.target.value))}
                        className="w-full text-xs font-black bg-transparent focus:outline-none"
                      />
                      <span className="text-[8px] text-slate-400">&gt;40 mg/dL</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <label className="text-[9px] font-bold text-slate-500 block">Trigliserida</label>
                      <input
                        type="number"
                        value={triglycerides}
                        onChange={(e) => setTriglycerides(Number(e.target.value))}
                        className="w-full text-xs font-black bg-transparent focus:outline-none"
                      />
                      <span className="text-[8px] text-slate-400">&lt;150 mg/dL</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block pt-1">
                    Metabolik, Elektrolit &amp; Urin
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <label className="text-[9px] font-bold text-slate-500 block">Gula Darah Puasa</label>
                      <input
                        type="number"
                        value={fastingBloodSugar}
                        onChange={(e) => setFastingBloodSugar(Number(e.target.value))}
                        className="w-full text-xs font-black bg-transparent focus:outline-none"
                      />
                      <span className="text-[8px] text-slate-400">&lt;100 mg/dL</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <label className="text-[9px] font-bold text-slate-500 block">HbA1c (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={hba1c}
                        onChange={(e) => setHba1c(Number(e.target.value))}
                        className="w-full text-xs font-black bg-transparent focus:outline-none"
                      />
                      <span className="text-[8px] text-slate-400">&lt;5.7%</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <label className="text-[9px] font-bold text-slate-500 block">Kalium (K+)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={potassium}
                        onChange={(e) => setPotassium(Number(e.target.value))}
                        className="w-full text-xs font-black bg-transparent focus:outline-none"
                      />
                      <span className="text-[8px] text-slate-400">3.5–5.0 mEq</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <label className="text-[9px] font-bold text-slate-500 block">Natrium (Na+)</label>
                      <input
                        type="number"
                        value={sodium}
                        onChange={(e) => setSodium(Number(e.target.value))}
                        className="w-full text-xs font-black bg-transparent focus:outline-none"
                      />
                      <span className="text-[8px] text-slate-400">135–145 mEq</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <label className="text-[9px] font-bold text-slate-500 block">Proteinuria</label>
                      <select
                        value={proteinuria}
                        onChange={(e) => setProteinuria(e.target.value as any)}
                        className="w-full text-xs font-black bg-transparent focus:outline-none"
                      >
                        <option value="negatif">Negatif</option>
                        <option value="trace">Trace</option>
                        <option value="+1">+1 (30mg)</option>
                        <option value="+2">+2 (100mg)</option>
                        <option value="+3">+3 (300mg)</option>
                      </select>
                      <span className="text-[8px] text-slate-400">Urin Lengkap</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <input
                  type="text"
                  placeholder="Catatan laboratorium tambahan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="hallmark-button-primary w-full py-2.5 text-xs"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Rekam Lab Rumah Sakit'}
              </button>
            </form>

            {/* History Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Riwayat Parameter Laboratorium
              </h4>

              {(!labResults || labResults.length === 0) ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                  Belum ada catatan hasil laboratorium. Masukkan hasil tes darah di atas.
                </div>
              ) : (
                <div className="space-y-2">
                  {labResults.map((item) => {
                    const isHighUric = item.uricAcid > 7.0;
                    const isHighRenal = item.serumCreatinine > 1.2 || item.bloodUrea > 45;

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-500">
                              {format(new Date(item.timestamp), 'dd MMM yyyy')}
                            </span>
                            {isHighUric && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                Asam Urat Tinggi ({item.uricAcid} mg/dL)
                              </span>
                            )}
                            {isHighRenal && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                Ginjal Evaluasi
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                            <span>Asam Urat: <strong className={isHighUric ? 'text-rose-500' : 'text-emerald-500'}>{item.uricAcid}</strong> mg/dL</span>
                            <span>Ureum: <strong>{item.bloodUrea}</strong> mg/dL</span>
                            <span>Kreatinin: <strong>{item.serumCreatinine}</strong> mg/dL</span>
                          </div>
                          {item.notes && (
                            <p className="text-[10px] text-slate-400 italic">{item.notes}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
