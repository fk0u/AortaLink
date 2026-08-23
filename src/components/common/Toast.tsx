import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from '../icons/AppIcons';
import { motion, AnimatePresence } from 'framer-motion';

export const ToastContainer: React.FC = () => {
  const toasts = useAppStore((state) => state.toasts);
  const removeToast = useAppStore((state) => state.removeToast);

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 md:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          const getIcon = () => {
            switch (toast.type) {
              case 'success':
                return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
              case 'warning':
                return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
              case 'error':
                return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
              default:
                return <Info className="w-5 h-5 text-sky-500 shrink-0" />;
            }
          };

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 backdrop-blur-md"
            >
              {getIcon()}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {toast.title}
                </h4>
                {toast.message && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
