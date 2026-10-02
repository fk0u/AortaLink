import React from 'react';
import { useResearchStore } from '../../store/useResearchStore';
import { FlaskConical, AlertTriangle, LogOut } from 'lucide-react';

export const ResearchModeBanner: React.FC = () => {
  const { isActive, studyId, consentRecord, withdraw } = useResearchStore();

  if (!isActive) return null;

  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-medium shadow-md flex flex-wrap items-center justify-between gap-3 border-b border-amber-600">
      <div className="flex items-center gap-2.5">
        <span className="p-1 rounded bg-amber-600/30 text-amber-950">
          <FlaskConical size={16} className="animate-pulse" />
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-extrabold uppercase tracking-wider text-[11px] bg-amber-950 text-amber-200 px-2 py-0.5 rounded">
            Mode Riset / Akademik
          </span>
          <span className="font-semibold">
            Hanya untuk penelitian, bukan untuk keputusan medis.
          </span>
          <span className="text-amber-950/80 font-mono text-[11px]">
            Study ID: <strong className="font-bold">{studyId || 'N/A'}</strong> (Partisipan: {consentRecord?.participantPseudonym || 'N/A'})
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Apakah Anda yakin ingin menarik persetujuan (withdraw consent) dan kembali ke Mode Publik (non-alkes)?')) {
              withdraw();
            }
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950 text-amber-100 hover:bg-black font-semibold text-[11px] transition-colors shadow-sm"
        >
          <LogOut size={12} />
          <span>Tarik Persetujuan / Keluar</span>
        </button>
      </div>
    </div>
  );
};
