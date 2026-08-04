import React from 'react';
import { ClinicalAlert } from '../../types/blood-pressure';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertOctagon, Activity, ShieldAlert } from 'lucide-react';

interface ClinicalAlertBannerProps {
  alerts: ClinicalAlert[];
  onDismiss?: (id: string) => void;
}

export const ClinicalAlertBanner: React.FC<ClinicalAlertBannerProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <AnimatePresence>
        {alerts.map((alert) => {
          const isCritical = alert.severity === 'critical';
          const isWarning = alert.severity === 'warning';

          const bgClass = isCritical
            ? 'bg-rose-500/10 dark:bg-rose-950/40 border-rose-500/30 text-rose-900 dark:text-rose-200'
            : isWarning
            ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30 text-amber-900 dark:text-amber-200'
            : 'bg-teal-500/10 dark:bg-teal-950/40 border-teal-500/30 text-teal-900 dark:text-teal-200';

          const iconColor = isCritical
            ? 'text-rose-600 dark:text-rose-400'
            : isWarning
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-teal-600 dark:text-teal-400';

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-4 rounded-2xl border ${bgClass} backdrop-blur-sm shadow-sm transition-all`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 shadow-sm ${iconColor} shrink-0 mt-0.5`}>
                  {isCritical ? (
                    <AlertOctagon className="w-5 h-5 animate-pulse" />
                  ) : isWarning ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Activity className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                      <span>{alert.title}</span>
                      {alert.valueString && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-white/70 dark:bg-slate-900/70 border border-current">
                          {alert.valueString}
                        </span>
                      )}
                    </h4>
                  </div>
                  <p className="text-xs font-medium mt-1 opacity-90 leading-relaxed">
                    {alert.message}
                  </p>
                  <div className="mt-2 text-[11px] font-semibold flex items-center gap-1.5 opacity-80 border-t border-current/10 pt-2">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>Rekomendasi Klinis: {alert.recommendation}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
