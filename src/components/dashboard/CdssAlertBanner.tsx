/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, Activity, FileText } from 'lucide-react';
import { ClinicalAlert, CircadianDippingReport } from '../../types/blood-pressure';

interface CdssAlertBannerProps {
  alerts: ClinicalAlert[];
  dippingReport?: CircadianDippingReport;
  fhirCount: number;
  onOpenFhirInspector?: () => void;
}

export const CdssAlertBanner: React.FC<CdssAlertBannerProps> = ({
  alerts,
  dippingReport,
  fhirCount,
  onOpenFhirInspector
}) => {
  if (alerts.length === 0 && !dippingReport) return null;

  const hasCritical = alerts.some((a) => a.severity === 'critical') || dippingReport?.pattern === 'riser';
  const hasWarning = alerts.some((a) => a.severity === 'warning') || dippingReport?.pattern === 'non_dipper';

  const bannerBg = hasCritical
    ? 'bg-gradient-to-r from-rose-900/90 via-rose-800/80 to-slate-900 text-rose-100 border-rose-700/50 shadow-rose-950/40'
    : hasWarning
    ? 'bg-gradient-to-r from-amber-900/90 via-amber-800/80 to-slate-900 text-amber-100 border-amber-700/50 shadow-amber-950/40'
    : 'bg-gradient-to-r from-teal-950/90 via-slate-900 to-emerald-950/90 text-teal-100 border-teal-800/50 shadow-teal-950/40';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`p-4 sm:p-5 rounded-3xl border shadow-xl backdrop-blur-xl relative overflow-hidden mb-6 ${bannerBg}`}
      >
        {/* Background Ambient Glow */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          
          {/* Main Title & Engine Info */}
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl shrink-0 mt-0.5 ${hasCritical ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse' : 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'}`}>
              {hasCritical ? <ShieldAlert className="w-6 h-6" /> : <BrainCircuit className="w-6 h-6" />}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 border border-white/20 backdrop-blur-md text-white">
                  AI CDSS Engine (HL7 FHIR R4)
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {fhirCount} FHIR Resources Indexed
                </span>
              </div>

              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                Evaluasi Klinis Elektronik & Rekomendasi Terapi
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>

              {dippingReport && (
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Pola Dipping Nocturnal: <strong className="text-white underline">{dippingReport.label}</strong> ({dippingReport.sysDippingPercent.toFixed(1)}% Penurunan Sistolik Malam Hari).
                </p>
              )}
            </div>
          </div>

          {/* Action Button: Open FHIR Inspector */}
          {onOpenFhirInspector && (
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenFhirInspector}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-extrabold text-xs transition-all active:scale-95 flex items-center gap-2 shadow-lg backdrop-blur-md"
              >
                <FileText className="w-4 h-4 text-teal-400" />
                Inspeksi Payload HL7 FHIR R4
              </button>
            </div>
          )}
        </div>

        {/* Active Alert Banners Grid */}
        {alerts.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 transition-all ${
                  alert.severity === 'critical'
                    ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                    : alert.severity === 'warning'
                    ? 'bg-amber-950/70 border-amber-500/50 text-amber-200'
                    : 'bg-slate-900/70 border-slate-700/50 text-slate-200'
                }`}
              >
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${alert.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'}`} />
                <div className="space-y-0.5 min-w-0">
                  <div className="font-extrabold text-white flex items-center justify-between gap-2">
                    <span>{alert.title}</span>
                    {alert.valueString && <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 font-mono">{alert.valueString}</span>}
                  </div>
                  <p className="text-[11px] opacity-90 leading-normal">{alert.message}</p>
                  <p className="text-[10px] text-teal-300 font-medium italic mt-1">💡 {alert.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
