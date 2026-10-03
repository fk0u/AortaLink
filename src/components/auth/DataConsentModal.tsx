import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, CheckCircle2 } from '../icons/AppIcons';
import { useFocusTrap } from '../../utils/modal-a11y';

interface DataConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const DataConsentModal: React.FC<DataConsentModalProps> = ({ isOpen, onClose, onAccept }) => {
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);
  
  const [consentProcess, setConsentProcess] = useState(false);
  const [consentStoreLocal, setConsentStoreLocal] = useState(false);
  const [consentSyncCloud, setConsentSyncCloud] = useState(false);
  const [consentDeleteRights, setConsentDeleteRights] = useState(false);

  const allChecked = consentProcess && consentStoreLocal && consentSyncCloud && consentDeleteRights;

  const handleAccept = () => {
    if (allChecked) {
      onAccept();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
        <motion.div
          ref={trapRef}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-[#1c1c1e] border border-slate-200/90 dark:border-white/10 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-auto flex flex-col text-slate-900 dark:text-slate-100 max-h-[92vh]"
        >
          <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center shadow-md shadow-teal-600/25 text-white">
                <ShieldCheck size={20} className="fill-white" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Persetujuan Pemrosesan Data
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Sesuai UU No. 27 Tahun 2022 (UU PDP)
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-justify">
              Berdasarkan Undang-Undang Pelindungan Data Pribadi (UU PDP), kami memerlukan persetujuan eksplisit Anda sebelum mengumpulkan, memproses, dan menyimpan data kesehatan pribadi Anda pada platform AortaLink.
            </p>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200/80 dark:border-white/10 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={consentProcess}
                  onChange={(e) => setConsentProcess(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                />
                <span className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                  Saya setuju AortaLink mengumpulkan dan memproses data kesehatan pribadi saya untuk keperluan rekam medis elektronik.
                </span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200/80 dark:border-white/10 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={consentStoreLocal}
                  onChange={(e) => setConsentStoreLocal(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                />
                <span className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                  Saya setuju data saya disimpan secara lokal (offline-first) pada perangkat dan peramban (browser) yang saya gunakan saat ini.
                </span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200/80 dark:border-white/10 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={consentSyncCloud}
                  onChange={(e) => setConsentSyncCloud(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                />
                <span className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                  Saya setuju data direplikasi dan diamankan (enkripsi) ke peladen awan (cloud server) AortaLink untuk tujuan pencadangan (backup) dan sinkronisasi lintas perangkat.
                </span>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-[#2c2c2e] border border-slate-200/80 dark:border-white/10 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={consentDeleteRights}
                  onChange={(e) => setConsentDeleteRights(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                />
                <span className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-200 font-medium">
                  Saya memahami bahwa saya memiliki hak penuh untuk meminta penghapusan permanen atas seluruh data pribadi dan rekam medis saya (Hak Hapus Data).
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleAccept}
              disabled={!allChecked}
              className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={14} />
              <span>Saya Mengerti & Menyetujui Seluruh Poin (UU PDP)</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
