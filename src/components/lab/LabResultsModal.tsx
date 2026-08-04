import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FlaskConical, Plus, Trash2, Calendar, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface LabResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LabResultsModal: React.FC<LabResultsModalProps> = ({ isOpen, onClose }) => {
  const { activeProfileId } = useProfiles();
  const addToast = useAppStore((state) => state.addToast);

  // Form states
  const [uricAcid, setUricAcid] = useState<number>(6.2);
  const [bloodUrea, setBloodUrea] = useState<number>(28);
  const [serumCreatinine, setSerumCreatinine] = useState<number>(0.9);
  const [dateStr, setDateStr] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
        notes
      });

      playSuccessChime();
      addToast({
        type: 'success',
        title: 'Hasil Lab Tersimpan',
        message: `Asam Urat: ${uricAcid} mg/dL, Ureum: ${bloodUrea} mg/dL, Kreatinin: ${serumCreatinine} mg/dL.`
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

              <div>
                <input
                  type="text"
                  placeholder="Catatan tambahan (Contoh: Puasa 8 jam sebelum cek darah)..."
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
                {isSubmitting ? 'Menyimpan...' : 'Simpan Hasil Lab'}
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
