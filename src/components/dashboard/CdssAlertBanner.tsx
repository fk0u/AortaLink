/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · Clean Minimalist Patient Guide Banner */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ShieldAlert, Sparkles, HeartPulse } from 'lucide-react';
import { ClinicalAlert, CircadianDippingReport } from '../../types/blood-pressure';

interface CdssAlertBannerProps {
  alerts: ClinicalAlert[];
  dippingReport?: CircadianDippingReport;
  fhirCount?: number;
  onOpenFhirInspector?: () => void;
}

export const CdssAlertBanner: React.FC<CdssAlertBannerProps> = ({
  alerts,
  dippingReport
}) => {
  // Check if dipping data is valid (not 'Data Tidak Cukup')
  const hasValidDipping = dippingReport && dippingReport.label !== 'Data Tidak Cukup';
  const hasAlerts = alerts && alerts.length > 0;

  // If no alerts and no valid dipping analysis, hide the banner completely for clean UX
  if (!hasAlerts && !hasValidDipping) {
    return null;
  }

  const hasCritical = alerts.some((a) => a.severity === 'critical') || dippingReport?.pattern === 'riser';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`p-4 sm:p-5 rounded-3xl border shadow-sm backdrop-blur-md relative overflow-hidden mb-5 transition-all ${
          hasCritical
            ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-100'
            : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/90 dark:border-amber-900/50 text-amber-950 dark:text-amber-100'
        }`}
      >
        <div className="flex flex-col gap-3">
          
          {/* Patient-Friendly Clean Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-2xl shrink-0 ${
                hasCritical 
                  ? 'bg-rose-500 text-white shadow-sm' 
                  : 'bg-amber-500 text-white shadow-sm'
              }`}>
                {hasCritical ? <ShieldAlert className="w-4 h-4" /> : <HeartPulse className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-xs font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase">
                  Catatan Evaluasi Kesehatan Pasien
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Rekomendasi pencegahan &amp; panduan medis mandiri
                </p>
              </div>
            </div>
          </div>

          {/* Valid Dipping Pattern Info (Only shown when real day/night data exists) */}
          {hasValidDipping && (
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  Ritme Tensi Malam Hari: {dippingReport.label}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                  {dippingReport.sysDippingPercent.toFixed(1)}% Penurunan
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {dippingReport.description}
              </p>
              <p className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold pt-0.5">
                💡 {dippingReport.clinicalAdvice}
              </p>
            </div>
          )}

          {/* Patient-Friendly Warning & Critical Alert List */}
          {hasAlerts && (
            <div className="space-y-2 pt-1">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                    alert.severity === 'critical'
                      ? 'bg-white/90 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100'
                      : 'bg-white/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
                  }`}
                >
                  <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                    alert.severity === 'critical' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                  }`} />
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center justify-between gap-2">
                      <span>{alert.title}</span>
                      {alert.valueString && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                          {alert.valueString}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                      {alert.message}
                    </p>
                    <p className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold pt-0.5">
                      💡 {alert.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
