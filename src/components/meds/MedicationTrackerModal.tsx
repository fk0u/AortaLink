import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { useProfiles } from '../../hooks/useProfiles';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pill, CheckCircle2, Plus, Clock, AlertCircle, Sparkles, Flame } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  takenToday: boolean;
}

interface MedicationTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MedicationTrackerModal: React.FC<MedicationTrackerModalProps> = ({
  isOpen,
  onClose
}) => {
  const { activeProfile } = useProfiles();
  const medicationLogs = useLiveQuery(() => activeProfile?.id ? db.medicationLogs.where('profileId').equals(activeProfile.id).toArray() : [], [activeProfile?.id]) || [];
  const [meds, setMeds] = useState<Medication[]>([
    { id: '1', name: 'Amlodipine', dosage: '5 mg', time: '08:00 Pagi', takenToday: true },
    { id: '2', name: 'Valsartan', dosage: '80 mg', time: '20:00 Malam', takenToday: false }
  ]);
  const [streakDays, setStreakDays] = useState(7);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedTime, setNewMedTime] = useState('08:00');

  const persistMedication = (next: Medication[]) => { if (activeProfile?.id) db.medicationLogs.add({ profileId: activeProfile.id, date: new Date().toISOString().slice(0, 10), takenCount: next.filter(m => m.takenToday).length, totalCount: next.length }); };

  const toggleTaken = (id: string) => {
    playClickSound();
    setMeds((prev) => { const next = prev.map((m) => {
        if (m.id === id) {
          const nextState = !m.takenToday;
          if (nextState) playSuccessChime();
          return { ...m, takenToday: nextState };
        }
        return m;
      }); persistMedication(next); return next; });
  };

  const handleAddMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName) return;
    playSuccessChime();
    const newMed: Medication = {
      id: Date.now().toString(),
      name: newMedName,
      dosage: newMedDosage || '1 tablet',
      time: `${newMedTime}`,
      takenToday: false
    };
    const next = [...meds, newMed]; setMeds(next); persistMedication(next);
    setNewMedName('');
    setNewMedDosage('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] sm:pb-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-white">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Jadwal Minum Obat Hipertensi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pengingat Dosis &amp; Tracker Kepatuhan Obat Real
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
            
            {/* Streak & Adherence Badge */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                  <Flame className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <span className="text-xs font-black text-amber-900 dark:text-amber-300 block">
                    {streakDays} Hari Disiplin Minum Obat!
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Kepatuhan minum obat menurunkan risiko krisis 80%
                  </span>
                </div>
              </div>
            </div>

            {/* List of Medications */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Daftar Obat Hari Ini:
              </label>
              <div className="space-y-2">
                {meds.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      m.takenToday
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${m.takenToday ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                        <Pill className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-black text-sm text-slate-900 dark:text-slate-100">{m.name} ({m.dosage})</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {m.time}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleTaken(m.id)}
                      className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all active:scale-95 flex items-center gap-1 ${
                        m.takenToday
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {m.takenToday ? 'Sudah Diminum' : 'Tandai Minum'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Medication Form */}
            <form onSubmit={handleAddMed} className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Tambah Obat Baru:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nama Obat (e.g. Amlodipine)"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  required
                />
                <input
                  type="text"
                  placeholder="Dosis (e.g. 5 mg / 1 tab)"
                  value={newMedDosage}
                  onChange={(e) => setNewMedDosage(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
              </div>
              <button
                type="submit"
                className="hallmark-button-primary w-full py-2.5 text-xs inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Simpan Ke Jadwal Obat
              </button>
            </form>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
