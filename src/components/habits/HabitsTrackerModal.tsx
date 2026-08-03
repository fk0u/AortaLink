import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Moon,
  Sun,
  Monitor,
  Footprints,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Heart
} from 'lucide-react';
import { useProfiles } from '../../hooks/useProfiles';
import { useAppStore } from '../../store/useAppStore';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { HabitLog } from '../../types/blood-pressure';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import { format } from 'date-fns';

interface HabitsTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HabitsTrackerModal: React.FC<HabitsTrackerModalProps> = ({ isOpen, onClose }) => {
  const { activeProfileId, activeProfile } = useProfiles();
  const addToast = useAppStore((state) => state.addToast);

  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sleepTime, setSleepTime] = useState('22:30');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [screenTimeHours, setScreenTimeHours] = useState(6);
  const [outdoorMinutes, setOutdoorMinutes] = useState(30);
  const [activityNotes, setActivityNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingLogs, setExistingLogs] = useState<HabitLog[]>([]);
  const sleepLogs = useLiveQuery(() => activeProfileId ? db.sleepLogs.where('profileId').equals(activeProfileId).reverse().limit(7).toArray() : [], [activeProfileId]) || [];

  // Calculate total sleep duration
  const calculateSleepDuration = (start: string, end: string): number => {
    try {
      const [sH, sM] = start.split(':').map(Number);
      const [wH, wM] = end.split(':').map(Number);
      let sMinutes = sH * 60 + sM;
      let wMinutes = wH * 60 + wM;
      if (wMinutes <= sMinutes) {
        wMinutes += 24 * 60; // crossed midnight
      }
      const diffMinutes = wMinutes - sMinutes;
      return Math.round((diffMinutes / 60) * 10) / 10;
    } catch {
      return 8;
    }
  };

  const sleepHours = calculateSleepDuration(sleepTime, wakeTime);

  // Load existing habit logs for active profile
  useEffect(() => {
    async function loadHabits() {
      if (!activeProfileId) return;
      try {
        const logs = await db.habits
          .where('profileId')
          .equals(activeProfileId)
          .reverse()
          .limit(7)
          .toArray();
        setExistingLogs(logs);
      } catch (err) {
        console.error('Error loading habit logs:', err);
      }
    }
    if (isOpen) {
      loadHabits();
    }
  }, [isOpen, activeProfileId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfileId) {
      addToast({ type: 'error', title: 'Gagal', message: 'Tidak ada profil aktif.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const newHabit: HabitLog = {
        profileId: activeProfileId,
        date: dateStr,
        sleepTime,
        wakeTime,
        sleepHours,
        screenTimeHours: Number(screenTimeHours),
        outdoorMinutes: Number(outdoorMinutes),
        activityNotes,
        timestamp: new Date().toISOString()
      };

      await db.habits.add(newHabit);
      await db.sleepLogs.add({ profileId: activeProfileId, date: dateStr, sleepHours, screenTimeHours: Number(screenTimeHours), outdoorMinutes: Number(outdoorMinutes) });
      playSuccessChime();
      addToast({
        type: 'success',
        title: 'Kebiasaan Tersimpan',
        message: `Tidur ${sleepHours} jam & layar ${screenTimeHours} jam dicatat di jurnal.`
      });

      // Reload list
      const logs = await db.habits
        .where('profileId')
        .equals(activeProfileId)
        .reverse()
        .limit(7)
        .toArray();
      setExistingLogs(logs);

      onClose();
    } catch (err) {
      addToast({ type: 'error', title: 'Gagal Simpan', message: 'Terjadi kesalahan saat menyimpan kebiasaan.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Pelacak Kebiasaan &amp; Gaya Hidup
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Jam Tidur, Waktu Layar HP/PC &amp; Aktivitas Luar ({activeProfile?.name})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
            
            {/* Date Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Tanggal Pencatatan Kebiasaan:
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                required
              />
            </div>

            {/* 1. Sleep Schedule & Duration */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs">
                  <Moon className="w-4 h-4" />
                  <span>Kualitas &amp; Durasi Tidur</span>
                </div>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-700">
                  {sleepHours} Jam Tidur
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Jam Tidur Malam:
                  </label>
                  <input
                    type="time"
                    value={sleepTime}
                    onChange={(e) => setSleepTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Jam Bangun Pagi:
                  </label>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    required
                  />
                </div>
              </div>

              {sleepHours < 6 && (
                <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 text-rose-700 dark:text-rose-300 flex items-start gap-2 text-[10px]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Peringatan Medis: Tidur kurang dari 6 jam berisiko meningkatkan lonjakan tensi pagi hari hingga 25%.</span>
                </div>
              )}
            </div>

            {/* 2. Screen Time (HP & Komputer) */}
            <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-extrabold text-xs">
                  <Monitor className="w-4 h-4" />
                  <span>Durasi Layar (HP / Komputer)</span>
                </div>
                <span className="text-xs font-black text-sky-600 dark:text-sky-400">
                  {screenTimeHours} Jam / Hari
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={16}
                step={0.5}
                value={screenTimeHours}
                onChange={(e) => setScreenTimeHours(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
              <p className="text-[10px] text-slate-500">
                Terapkan aturan 20-20-20 untuk mengurangi ketegangan syaraf mata dan kecemasan postural.
              </p>
            </div>

            {/* 3. Outdoor & Exercise Activity */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs">
                  <Footprints className="w-4 h-4" />
                  <span>Aktivitas Luar Ruangan &amp; Berjalan</span>
                </div>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {outdoorMinutes} Menit
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={180}
                step={5}
                value={outdoorMinutes}
                onChange={(e) => setOutdoorMinutes(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <p className="text-[10px] text-slate-500">
                Paparan sinar matahari pagi &amp; jalan santai 30 menit terbukti menurunkan elastisitas pembuluh darah kaku.
              </p>
            </div>

            {/* Additional Activity Notes */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Catatan Aktivitas Khusus (Opsional):
              </label>
              <textarea
                value={activityNotes}
                onChange={(e) => setActivityNotes(e.target.value)}
                placeholder="Contoh: Jalan pagi 30 menit, minum teh herbal tanpa gula..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="hallmark-button-primary w-full py-3.5 text-xs inline-flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Log Kebiasaan Real'}
            </button>

            {/* Historical Habit Logs */}
            {existingLogs.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="font-extrabold text-slate-700 dark:text-slate-300 block">
                  Riwayat Kebiasaan 7 Hari Terakhir:
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {existingLogs.map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {h.date}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Tidur: {h.sleepHours}h ({h.sleepTime} - {h.wakeTime}) • Layar: {h.screenTimeHours}h
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                        {h.outdoorMinutes}m Outdoor
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
