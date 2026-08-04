import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import { db } from '../../db';
import { Reminder } from '../../types/blood-pressure';
import { useLiveQuery } from 'dexie-react-hooks';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Plus, Clock, Pill, Activity, Trash2, Check } from 'lucide-react';
import { scheduleReminder, syncAllReminders, cancelScheduledNotification } from '../../services/notifications/push-service';

export const ReminderModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.isReminderModalOpen);
  const closeModal = useAppStore((state) => state.closeReminderModal);
  const addToast = useAppStore((state) => state.addToast);
  const { activeProfileId } = useProfiles();

  const reminders = useLiveQuery(
    async () => {
      if (!activeProfileId) return [];
      return await db.reminders.where('profileId').equals(activeProfileId).toArray();
    },
    [activeProfileId],
    [] as Reminder[]
  );

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [title, setTitle] = useState('Ukur Tensi Pagi Hari');
  const [type, setType] = useState<'measurement' | 'medication'>('measurement');
  const [time, setTime] = useState('07:00');
  const [dosage, setDosage] = useState('');
  const [notes, setNotes] = useState('');

  const dayNames = ['Ming', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const toggleDay = (dayIndex: number) => {
    playClickSound();
    if (selectedDays.includes(dayIndex)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
    } else {
      setSelectedDays([...selectedDays, dayIndex].sort());
    }
  };

  const handleToggleReminder = async (rem: Reminder) => {
    playClickSound();
    if (!rem.id) return;
    await db.reminders.update(rem.id, { enabled: !rem.enabled });
    
    // Update notification scheduling
    const updatedReminder = await db.reminders.get(rem.id);
    if (updatedReminder) {
      if (updatedReminder.enabled) {
        scheduleReminder(updatedReminder);
      } else {
        cancelScheduledNotification(rem.id);
      }
    }
    
    addToast({
      type: 'info',
      title: rem.enabled ? 'Pengingat Dimatikan' : 'Pengingat Diaktifkan',
      message: `${rem.title} jam ${rem.time}`
    });
  };

  const handleDeleteReminder = async (id?: number) => {
    playClickSound();
    if (!id) return;
    
    // Cancel any scheduled notification first
    cancelScheduledNotification(id);
    
    await db.reminders.delete(id);
    addToast({ type: 'success', title: 'Pengingat Dihapus', message: 'Jadwal pengingat telah dihapus.' });
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfileId || !title.trim()) return;

    try {
      const newId = await db.reminders.add({
        profileId: activeProfileId,
        title,
        type,
        time,
        days: selectedDays,
        enabled: true,
        dosage: type === 'medication' ? dosage : undefined,
        notes
      });

      // Schedule push notification for this reminder
      try {
        const addedReminder = await db.reminders.get(newId);
        if (addedReminder) {
          scheduleReminder(addedReminder);
        }
      } catch (notifErr) {
        console.warn('[HeartSync] Could not schedule notification:', notifErr);
      }

      playSuccessChime();
      addToast({
        type: 'success',
        title: 'Pengingat Berhasil Disimpan',
        message: `${title} jam ${time} aktif.`
      });

      setIsAddingNew(false);
      setTitle('Ukur Tensi Pagi Hari');
      setTime('07:00');
      setDosage('');
      setNotes('');
    } catch (error) {
      addToast({ type: 'error', title: 'Gagal Menyimpan', message: 'Terjadi kesalahan saat menambah pengingat.' });
    }
  };

  const requestNotificationPermission = async () => {
    playClickSound();
    if (!('Notification' in window)) {
      addToast({ type: 'warning', title: 'Tidak Didukung', message: 'Browser ini tidak mendukung notifikasi.' });
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      playSuccessChime();
      new Notification('AortaLink Pengingat Aktif', {
        body: 'Notifikasi pengingat tensi & obat berhasil diaktifkan di perangkat Anda!',
        icon: '/favicon.svg'
      });
      addToast({ type: 'success', title: 'Izin Notifikasi Diberikan', message: 'Uji coba notifikasi telah dikirim.' });
    } else {
      addToast({ type: 'error', title: 'Izin Ditolak', message: 'Notifikasi diizinkan oleh pengguna.' });
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
              <div className="p-2 rounded-xl bg-amber-105 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Jadwal Pengingat
              </h3>
            </div>
            <button
              onClick={() => {
                playClickSound();
                closeModal();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            
            {/* Notification Permission Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-500/20 flex items-center justify-between gap-3">
              <div className="text-xs">
                <h5 className="font-bold text-amber-800 dark:text-amber-300">
                  Notifikasi Browser
                </h5>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Aktifkan notifikasi lokal agar pengingat berbunyi di jam yang ditentukan.
                </p>
              </div>
              <button
                onClick={requestNotificationPermission}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shrink-0 shadow-md transition-all active:scale-95"
              >
                Uji Notifikasi
              </button>
            </div>

            {!isAddingNew ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Jadwal Terpasang ({reminders.length})
                  </span>
                  <button
                    onClick={() => {
                      playClickSound();
                      setIsAddingNew(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Jadwal
                  </button>
                </div>

                <div className="space-y-2">
                  {reminders.map((r) => (
                    <div
                      key={r.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        r.enabled
                          ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${r.type === 'medication' ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400' : 'bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400'}`}>
                          {r.type === 'medication' ? <Pill className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {r.title}
                            </h4>
                            <span className="text-xs font-extrabold text-amber-605 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                              {r.time}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {r.type === 'medication' ? `Obat: ${r.dosage || '-'}` : 'Pemeriksaan Tensi Rutin'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleReminder(r)}
                          className={`w-11 h-6 rounded-full transition-colors relative ${r.enabled ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                        >
                          <span className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${r.enabled ? 'left-5.5' : 'left-0.5'}`}></span>
                        </button>
                        <button
                          onClick={() => handleDeleteReminder(r.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition-all active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Add New Reminder Form */
              <form onSubmit={handleCreateReminder} className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Tambah Jadwal Pengingat Baru
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIsAddingNew(false);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Batal
                  </button>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                    Jenis Pengingat
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setType('measurement');
                        setTitle('Cek Tensi Rutin');
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                        type === 'measurement'
                          ? 'bg-teal-55 dark:bg-teal-950/60 border-teal-500 text-teal-600 dark:text-teal-400'
                          : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500'
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      Ukur Tensi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setType('medication');
                        setTitle('Minum Obat Amlodipine');
                      }}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                        type === 'medication'
                          ? 'bg-purple-55 dark:bg-purple-950/60 border-purple-500 text-purple-600 dark:text-purple-400'
                          : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500'
                      }`}
                    >
                      <Pill className="w-4 h-4" />
                      Minum Obat
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                    Judul Pengingat
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Cek Tensi Pagi Hari / Minum Obat"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-105 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                      Waktu Jam (HH:mm)
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-105 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                      required
                    />
                  </div>

                  {type === 'medication' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                        Dosis Obat
                      </label>
                      <input
                        type="text"
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        placeholder="Contoh: 1 tablet (5mg)"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-105 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Days Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                    Ulangi Hari
                  </label>
                  <div className="flex gap-1 justify-between">
                    {dayNames.map((day, idx) => {
                      const isSelected = selectedDays.includes(idx);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(idx)}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${
                            isSelected
                              ? 'bg-amber-500 text-white shadow-md'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-450'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIsAddingNew(false);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-md transition-all active:scale-[0.98]"
                  >
                    Simpan Jadwal
                  </button>
                </div>
              </form>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
