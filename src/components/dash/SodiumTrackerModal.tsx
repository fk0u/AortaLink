import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { useProfiles } from '../../hooks/useProfiles';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Utensils, AlertCircle, Plus, CheckCircle2, ShieldCheck, Flame } from 'lucide-react';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';

interface SodiumTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SodiumTrackerModal: React.FC<SodiumTrackerModalProps> = ({ isOpen, onClose }) => {
  const { activeProfile } = useProfiles();
  const [dailySodiumMg, setDailySodiumMg] = useState(0);
  const [logHistory, setLogHistory] = useState<Array<{ name: string; mg: number; time: string }>>([
    { name: 'Sarapan Nasi Uduk + Telur', mg: 400, time: '07:30' },
    { name: 'Buah Segar', mg: 250, time: '10:00' }
  ]);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemMg, setCustomItemMg] = useState(300);

  useEffect(() => {
    if (!isOpen || !activeProfile?.id) return;
    db.sodiumLogs.where('profileId').equals(activeProfile.id).filter(x => x.date === new Date().toISOString().slice(0, 10)).toArray().then(logs => { setDailySodiumMg(logs.reduce((sum, x) => sum + x.sodiumMg, 0)); setLogHistory(logs.flatMap(x => (x.items || []).map(name => ({ name, mg: x.sodiumMg, time: '' })))); });
  }, [isOpen, activeProfile?.id]);

  const recommendedLimit = 2000; // 2,000 mg DASH diet limit

  const handleAddSodium = (name: string, mg: number) => {
    playClickSound();
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setDailySodiumMg((prev) => prev + mg);
    setLogHistory((prev) => [{ name, mg, time: timeStr }, ...prev]);
    if (activeProfile?.id) db.sodiumLogs.add({ profileId: activeProfile.id, date: new Date().toISOString().slice(0, 10), sodiumMg: mg, items: [name] });
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName) return;
    handleAddSodium(customItemName, customItemMg);
    setCustomItemName('');
    playSuccessChime();
  };

  const pct = Math.min(100, Math.round((dailySodiumMg / recommendedLimit) * 100));

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
              <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Pelacak Garam / Natrium DASH Diet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tech For Good • Monitoring Garam Harian Pasien
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
            
            {/* Progress Bar Limit */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-600 dark:text-slate-300">Asupan Natrium Hari Ini:</span>
                <span className={`text-base ${dailySodiumMg > recommendedLimit ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-teal-600 dark:text-teal-400'}`}>
                  {dailySodiumMg} / {recommendedLimit} mg
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-teal-500'
                  }`}
                  style={{ width: `${pct}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {dailySodiumMg > recommendedLimit
                  ? '⚠️ Peringatan: Asupan garam Anda melebihi batas rekomendasi DASH (2.000 mg/hari).'
                  : '✅ Asupan garam Anda masih berada di batas aman DASH diet.'}
              </p>
            </div>

            {/* Quick Add Presets */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Tambah Cepat Makanan:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Mi Instan / Makanan Kemasan', mg: 1200 },
                  { name: 'Makanan Cepat Saji / Gorengan', mg: 700 },
                  { name: 'Kecap / Saus Tambahan', mg: 350 },
                  { name: 'Camilan Keripik Asin', mg: 450 }
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleAddSodium(item.name, item.mg)}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-left transition-all active:scale-95 space-y-0.5 border border-slate-200/60 dark:border-slate-700"
                  >
                    <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.name}</div>
                    <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">+{item.mg} mg</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Add Form */}
            <form onSubmit={handleAddCustom} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Input Makanan Custom:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nama Makanan (Contoh: Sup Ayam)"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                />
                <input
                  type="number"
                  placeholder="mg"
                  value={customItemMg}
                  onChange={(e) => setCustomItemMg(Number(e.target.value))}
                  className="w-20 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center"
                />
                <button
                  type="submit"
                  className="hallmark-button-primary px-3 py-2 text-xs shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Log History */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Jurnal Konsumsi Hari Ini ({logHistory.length}):
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {logHistory.map((item, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                      <span className="text-[10px] text-slate-400 block">{item.time}</span>
                    </div>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400">+{item.mg} mg</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
