import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pill, CheckCircle2, Plus, Shield, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import { format, isSameDay } from 'date-fns';
import { MedicationItem, MedicationSchedule, DrugClass } from '../../types/blood-pressure';

interface MedicationTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MedicationTrackerModal: React.FC<MedicationTrackerModalProps> = ({
  isOpen,
  onClose
}) => {
  const { activeProfileId } = useProfiles();
  const addToast = useAppStore((state) => state.addToast);

  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedClass, setNewMedClass] = useState<DrugClass>('Golongan CCB');
  const [newMedSchedule, setNewMedSchedule] = useState<MedicationSchedule>('pagi');
  const [newMedPurpose, setNewMedPurpose] = useState('');

  // Live Query medications for current profile
  const medications = useLiveQuery(
    async () => {
      if (!activeProfileId) return [];
      return await db.medications.where('profileId').equals(activeProfileId).toArray();
    },
    [activeProfileId]
  );

  // Live Query medication logs for today
  const todayLogs = useLiveQuery(
    async () => {
      if (!activeProfileId) return [];
      const logs = await db.medicationLogs.where('profileId').equals(activeProfileId).toArray();
      const today = new Date();
      return logs.filter((log) => (log.takenAt ? isSameDay(new Date(log.takenAt), today) : false));
    },
    [activeProfileId]
  );

  const isTakenToday = (medicationId?: number) => {
    if (!medicationId || !todayLogs) return false;
    return todayLogs.some((l) => l.medicationId === medicationId);
  };

  const toggleTaken = async (med: MedicationItem) => {
    if (!med.id || !activeProfileId) return;
    playClickSound();

    try {
      const taken = isTakenToday(med.id);

      if (taken) {
        // Delete today's log
        const logToDelete = todayLogs?.find((l) => l.medicationId === med.id);
        if (logToDelete?.id) {
          await db.medicationLogs.delete(logToDelete.id);
          addToast({ type: 'info', title: 'Status Diubah', message: `Membatalkan status konsumsi ${med.name}` });
        }
      } else {
        // Add new log with exact takenAt timestamp
        const nowIso = new Date().toISOString();
        await db.medicationLogs.add({
          profileId: activeProfileId,
          medicationId: med.id,
          medicationName: med.name,
          dosage: med.dosage,
          takenAt: nowIso,
          notes: `Konsumsi ${med.schedule} (${med.drugClass})`
        });
        playSuccessChime();
        addToast({
          type: 'success',
          title: 'Konsumsi Obat Dicatat!',
          message: `${med.name} ${med.dosage} (${med.drugClass}) diminum pada ${format(new Date(), 'HH:mm')}`
        });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Gagal memperbarui status obat.' });
    }
  };

  const handleAddMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName || !activeProfileId) return;

    try {
      await db.medications.add({
        profileId: activeProfileId,
        name: newMedName,
        dosage: newMedDosage || '1 tab',
        drugClass: newMedClass,
        schedule: newMedSchedule,
        purpose: newMedPurpose || `Kombinasi terapi (${newMedSchedule})`,
        createdAt: new Date().toISOString()
      });

      playSuccessChime();
      addToast({ type: 'success', title: 'Obat Ditambahkan', message: `${newMedName} ${newMedDosage} masuk ke regimen medis.` });

      setNewMedName('');
      setNewMedDosage('');
      setNewMedPurpose('');
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Gagal menambahkan obat baru.' });
    }
  };

  const handleDeleteMed = async (id?: number) => {
    if (!id) return;
    try {
      playClickSound();
      await db.medications.delete(id);
      addToast({ type: 'info', title: 'Obat Dihapus', message: 'Obat telah dihapus dari regimen.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Gagal menghapus obat.' });
    }
  };

  if (!isOpen) return null;

  const totalMeds = medications?.length || 0;
  const takenCount = medications?.filter((m) => isTakenToday(m.id)).length || 0;

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
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500 text-white shadow-md shadow-teal-500/20">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Regimen &amp; Tracker Medication (Combination Therapy)
                </h3>
                <p className="text-[11px] font-medium text-slate-400">
                  Presisi Klinis Dokter Spesialis Penyakit Dalam
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

          <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
            
            {/* Clinical Adherence Progress Badge */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent border border-teal-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-500 text-white shadow-md shadow-teal-500/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-black text-teal-900 dark:text-teal-300 block">
                    Kepatuhan Terapi Obat: {takenCount} / {totalMeds} Diminum Hari Ini
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {takenCount === totalMeds && totalMeds > 0
                      ? '100% Regimen obat hari ini telah dipenuhi!'
                      : 'Kombinasi terapi (CCB Pagi + ARB Malam) meredam lonjakan tensi nocturnal.'}
                  </span>
                </div>
              </div>
            </div>

            {/* List of Default & Custom Medications */}
            <div className="space-y-2">
              <label className="font-extrabold uppercase text-[11px] tracking-wider text-slate-700 dark:text-slate-300 block">
                Regimen Medis Utama Pengguna:
              </label>
              
              {(!medications || medications.length === 0) ? (
                <div className="p-4 text-center text-slate-400 border border-dashed rounded-xl">
                  Belum ada obat dalam regimen.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {medications.map((m) => {
                    const taken = isTakenToday(m.id);
                    return (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          taken
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${taken ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                            <Pill className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                                {m.name} {m.dosage}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                                {m.drugClass}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                {m.schedule}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                              {m.purpose}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleTaken(m)}
                            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all active:scale-95 flex items-center gap-1 ${
                              taken
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {taken ? 'Sudah Diminum' : 'Tandai Minum'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMed(m.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add New Medication Form */}
            <form onSubmit={handleAddMed} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="font-extrabold uppercase text-[11px] tracking-wider text-slate-700 dark:text-slate-300 block">
                Tambah Obat Baru ke Regimen:
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nama Obat (e.g. Bisoprolol)"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  required
                />
                <input
                  type="text"
                  placeholder="Dosis (e.g. 2.5 mg)"
                  value={newMedDosage}
                  onChange={(e) => setNewMedDosage(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newMedClass}
                  onChange={(e) => setNewMedClass(e.target.value as DrugClass)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  <option value="Golongan CCB">Golongan CCB</option>
                  <option value="Golongan ARB">Golongan ARB</option>
                  <option value="Penurun Asam Urat">Penurun Asam Urat</option>
                  <option value="Lainnya">Lainnya</option>
                </select>

                <select
                  value={newMedSchedule}
                  onChange={(e) => setNewMedSchedule(e.target.value as MedicationSchedule)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  <option value="pagi">Jadwal Pagi</option>
                  <option value="malam">Jadwal Malam</option>
                  <option value="pagi_malam">Pagi &amp; Malam</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="Tujuan Klinis / Penggunaan (Opsional)..."
                value={newMedPurpose}
                onChange={(e) => setNewMedPurpose(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              />

              <button
                type="submit"
                className="hallmark-button-primary w-full py-2.5 text-xs inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Simpan Obat Ke Regimen Klinis
              </button>
            </form>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
