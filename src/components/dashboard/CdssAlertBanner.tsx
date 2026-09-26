import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ShieldAlert, Sparkles, Activity } from '../icons/AppIcons';
import { ClinicalAlert, CircadianDippingReport } from '../../types/blood-pressure';

interface CdssAlertBannerProps {
  alerts: ClinicalAlert[];
  dippingReport?: CircadianDippingReport;
  fhirCount?: number;
  onOpenFhirInspector?: () => void;
}

export const CdssAlertBanner: React.FC<CdssAlertBannerProps> = ({
  alerts,
  dippingReport,
  onOpenFhirInspector
}) => {
  const hasValidDipping = dippingReport && dippingReport.label !== 'Data Tidak Cukup';
  const hasAlerts = alerts && alerts.length > 0;

  if (!hasAlerts && !hasValidDipping) {
    return null;
  }

  const hasCritical = alerts.some((a) => a.severity === 'critical') || dippingReport?.pattern === 'riser';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className={`p-3.5 sm:p-4 rounded-2xl border shadow-sm transition-all space-y-2.5 ${
          hasCritical
            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-100'
            : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 text-amber-950 dark:text-amber-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg shrink-0 ${
              hasCritical ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              {hasCritical ? <ShieldAlert size={14} /> : <Activity size={14} />}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                <span>Catatan Evaluasi Medis</span>
                <Sparkles size={12} className="text-amber-500" />
              </h4>
            </div>
          </div>
        </div>

        {/* Dipping summary note if abnormal */}
        {hasValidDipping && dippingReport.pattern !== 'dipper' && (
          <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-900 dark:text-slate-100">
              <span>Ritme Sirkadian: {dippingReport.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                {dippingReport.sysDippingPercent.toFixed(1)}%
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {dippingReport.description}
            </p>
          </div>
        )}

        {/* Alert items (single clean list) */}
        {hasAlerts && (
          <div className="space-y-1.5">
            {alerts.slice(0, 2).map((alert) => (
              <div
                key={alert.id}
                className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-1"
              >
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle size={13} className={alert.severity === 'critical' ? 'text-rose-500' : 'text-amber-500'} />
                    <span>{alert.title}</span>
                  </div>
                  {alert.valueString && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300">
                      {alert.valueString}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {alert.message}
                </p>
                {alert.recommendation && (
                  <p className="text-[10px] text-teal-700 dark:text-teal-400 font-medium">
                    Saran: {alert.recommendation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {onOpenFhirInspector && (
          <button
            type="button"
            onClick={onOpenFhirInspector}
            className="self-start text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 hover:underline"
          >
            Lihat Resource FHIR Terkait →
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
