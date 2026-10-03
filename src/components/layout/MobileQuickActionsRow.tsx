import React from 'react';
import {
  Pill,
  FlaskConical,
  Moon,
  HeartPulse,
  Utensils,
  AlertTriangle
} from '../icons/AppIcons';
import { playClickSound } from '../../utils/audio-fx';

interface MobileQuickActionsRowProps {
  onOpenReading: () => void;
  onOpenRestTimer: () => void;
  onOpenMedication: () => void;
  onOpenLab: () => void;
  onOpenHabits: () => void;
  onOpenSodium: () => void;
  onOpenAscvd: () => void;
  onOpenSOS: () => void;
  onOpenExportPdf: () => void;
  onOpenClinicalNotes: () => void;
  onOpenFhir: () => void;
  onOpenHealthScore?: () => void;
  onOpenKnowledgeBase?: () => void;
  onOpenRedFlagTriage?: () => void;
}

/**
 * iOS Health "Favorites" pattern: a 2-column grid of roomy, tappable tiles
 * (one thumb-reachable action per tile) plus a compact row of advanced tools.
 * The primary "record reading" action lives in the nav bar "+", not here.
 */
export const MobileQuickActionsRow: React.FC<MobileQuickActionsRowProps> = ({
  onOpenMedication,
  onOpenLab,
  onOpenHabits,
  onOpenSodium,
  onOpenAscvd,
  onOpenSOS,
  onOpenRestTimer,
  onOpenExportPdf,
  onOpenClinicalNotes,
  onOpenFhir,
  onOpenHealthScore,
  onOpenKnowledgeBase,
  onOpenRedFlagTriage,
}) => {
  const favorites = [
    {
      id: 'medication',
      label: 'Jadwal Obat',
      sublabel: 'Kepatuhan harian',
      icon: Pill,
      tint: 'bg-purple-500',
      onClick: onOpenMedication
    },
    {
      id: 'lab',
      label: 'Lab Ginjal',
      sublabel: 'Asam urat & eGFR',
      icon: FlaskConical,
      tint: 'bg-teal-500',
      onClick: onOpenLab
    },
    {
      id: 'habits',
      label: 'Tidur & Gaya Hidup',
      sublabel: 'Pemicu tensi',
      icon: Moon,
      tint: 'bg-indigo-500',
      onClick: onOpenHabits
    },
    {
      id: 'ascvd',
      label: 'Risiko Jantung',
      sublabel: 'Kalkulator ASCVD',
      icon: HeartPulse,
      tint: 'bg-rose-500',
      onClick: onOpenAscvd
    },
    {
      id: 'sodium',
      label: 'Batas Garam',
      sublabel: 'Diet DASH',
      icon: Utensils,
      tint: 'bg-amber-500',
      onClick: onOpenSodium
    },
    {
      id: 'sos',
      label: 'SOS Darurat',
      sublabel: 'Keluarga & ambulans',
      icon: AlertTriangle,
      tint: 'bg-red-500',
      onClick: onOpenSOS
    }
  ];

  const advancedTools = [
    ...(onOpenHealthScore ? [{ id: 'health-score', label: "Life's Essential 8", onClick: onOpenHealthScore }] : []),
    ...(onOpenKnowledgeBase ? [{ id: 'knowledge-base', label: 'Panduan Guideline', onClick: onOpenKnowledgeBase }] : []),
    ...(onOpenRedFlagTriage ? [{ id: 'red-flag-triage', label: 'Triage Darurat', onClick: onOpenRedFlagTriage }] : []),
    { id: 'rest-timer', label: 'Rest 5 Menit', onClick: onOpenRestTimer },
    { id: 'pdf-report', label: 'Laporan PDF', onClick: onOpenExportPdf },
    { id: 'clinical-notes', label: 'Catatan SOAP', onClick: onOpenClinicalNotes },
    { id: 'fhir-inspector', label: 'Resource FHIR', onClick: onOpenFhir }
  ];

  return (
    <section className="space-y-2.5 select-none" aria-label="Aksi cepat medis">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Favorit
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {favorites.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                playClickSound();
                action.onClick();
              }}
              className="flex items-center gap-3 p-3.5 rounded-[18px] bg-[var(--ios-card)] dark:bg-[#1c1c1e] shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.97] transition-transform text-left min-h-[64px]"
            >
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${action.tint}`}>
                <Icon size={19} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {action.label}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {action.sublabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Advanced tools row */}
      <div className="grid grid-cols-4 gap-3">
        {advancedTools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => {
              playClickSound();
              tool.onClick();
            }}
            className="p-2.5 rounded-[14px] bg-[var(--ios-fill)] dark:bg-white/10 text-[11px] font-semibold text-slate-600 dark:text-slate-300 active:scale-[0.96] transition-transform text-center truncate"
          >
            {tool.label}
          </button>
        ))}
      </div>
    </section>
  );
};
