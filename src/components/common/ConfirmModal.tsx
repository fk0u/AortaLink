import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from '../icons/AppIcons';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  isDangerous = false,
  onConfirm,
  onCancel
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            className="bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/10 space-y-4 my-auto relative z-10"
          >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDangerous ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {message}
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2.5 text-sm font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl text-white shadow-md active:scale-95 transition-all ${
                isDangerous
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
                  : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/25'
              }`}
            >
              {confirmText}
            </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
