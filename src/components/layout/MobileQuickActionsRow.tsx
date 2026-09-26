import React from 'react';
import { 
  Plus, 
  Timer, 
  Pill, 
  FlaskConical, 
  Moon, 
  HeartPulse, 
  FileText, 
  Stethoscope, 
  Utensils,
  BrainCircuit,
  ArrowRight
} from '../icons/AppIcons';
import { playClickSound } from '../../utils/audio-fx';
import { useAppStore } from '../../store/useAppStore';

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
}

export const MobileQuickActionsRow: React.FC<MobileQuickActionsRowProps> = ({
  onOpenReading,
  onOpenRestTimer,
  onOpenMedication,
  onOpenLab,
  onOpenHabits,
  onOpenSodium,
  onOpenAscvd,
  onOpenExportPdf,
  onOpenClinicalNotes,
}) => {
  const openAiModal = useAppStore((state) => state.openAiModal);

  const actions = [
    {
      id: 'quick-reading',
      label: 'Catat Tensi',
      sublabel: 'Input Real-time',
      icon: Plus,
      color: 'bg-teal-600 dark:bg-teal-500 text-white',
      onClick: onOpenReading,
    },
    {
      id: 'ai-consult',
      label: 'Analisis ML',
      sublabel: 'Mesin Lokal',
      icon: BrainCircuit,
      color: 'bg-teal-800 dark:bg-teal-700 text-white',
      onClick: () => openAiModal(),
    },
    {
      id: 'rest-timer',
      label: 'Rest 5 Menit',
      sublabel: 'Protokol AHA',
      icon: Timer,
      color: 'bg-slate-800 dark:bg-slate-700 text-white',
      onClick: onOpenRestTimer,
    },
    {
      id: 'medication',
      label: 'Jadwal Obat',
      sublabel: 'CCB & ARB',
      icon: Pill,
      color: 'bg-purple-600 dark:bg-purple-500 text-white',
      onClick: onOpenMedication,
    },
    {
      id: 'lab',
      label: 'Lab Ginjal',
      sublabel: 'Uric & eGFR',
      icon: FlaskConical,
      color: 'bg-indigo-600 dark:bg-indigo-500 text-white',
      onClick: onOpenLab,
    },
    {
      id: 'habits',
      label: 'Gaya Hidup',
      sublabel: 'Tidur & Olahraga',
      icon: Moon,
      color: 'bg-blue-600 dark:bg-blue-500 text-white',
      onClick: onOpenHabits,
    },
    {
      id: 'ascvd',
      label: 'Risiko Jantung',
      sublabel: 'Kalkulator ASCVD',
      icon: HeartPulse,
      color: 'bg-rose-600 dark:bg-rose-500 text-white',
      onClick: onOpenAscvd,
    },
    {
      id: 'sodium',
      label: 'Batas Garam',
      sublabel: 'DASH Diet',
      icon: Utensils,
      color: 'bg-amber-600 dark:bg-amber-500 text-white',
      onClick: onOpenSodium,
    },
    {
      id: 'pdf-report',
      label: 'Laporan PDF',
      sublabel: 'Resume Dokter',
      icon: FileText,
      color: 'bg-sky-600 dark:bg-sky-500 text-white',
      onClick: onOpenExportPdf,
    },
    {
      id: 'clinical-notes',
      label: 'Catatan SOAP',
      sublabel: 'Jurnal Klinis',
      icon: Stethoscope,
      color: 'bg-violet-600 dark:bg-violet-500 text-white',
      onClick: onOpenClinicalNotes,
    },
  ];

  return (
    <section className="space-y-2 select-none" aria-label="Aksi Cepat Medis">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Aksi Cepat
        </h3>
        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
          Geser <ArrowRight size={10} />
        </span>
      </div>

      {/* Smooth Horizontal Scrolling Carousel with Subtle Cards */}
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth snap-x snap-mandatory">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                playClickSound();
                action.onClick();
              }}
              className="snap-start shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm active:scale-95 transition-all text-left group min-w-[135px]"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${action.color}`}>
                <Icon size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {action.label}
                </p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">
                  {action.sublabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
