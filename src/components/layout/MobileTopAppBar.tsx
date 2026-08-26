import React from 'react';
import { CustomProfileSelector } from '../profiles/CustomProfileSelector';
import { Heart, Volume2, MoreVertical } from '../icons/AppIcons';
import { playClickSound } from '../../utils/audio-fx';
import { useNavigate } from '@tanstack/react-router';
import { useAppStore } from '../../store/useAppStore';
import { speakTextIndonesian } from '../../utils/speech-reader';
import { classifyBP } from '../../utils/bp-classifier';
import { useReadings } from '../../hooks/useReadings';
import { useProfiles } from '../../hooks/useProfiles';

import { timeService } from '../../services/time/time-service';

interface MobileTopAppBarProps {
  onOpenSOS?: () => void;
}

export const MobileTopAppBar: React.FC<MobileTopAppBarProps> = () => {
  const navigate = useNavigate();
  const openMobileToolsSheet = useAppStore((state) => state.openMobileToolsSheet);
  const { stats } = useReadings();
  const { activeProfile } = useProfiles();

  const [currentTimeStr, setCurrentTimeStr] = React.useState(() => timeService.formatTimeWithWITA());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(timeService.formatTimeWithWITA());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleSpeakLatestReading = () => {
    playClickSound();
    const latest = stats.latestReading;
    const category = latest ? classifyBP(latest.systolic, latest.diastolic) : null;
    if (!latest) {
      speakTextIndonesian('Belum ada data pengukuran tekanan darah untuk profil ini.');
      return;
    }
    const categoryText = category ? category.label : '';
    const speechMsg = `Tekanan darah ${activeProfile?.name || 'Pasien'} saat ini adalah ${latest.systolic} per ${latest.diastolic} milimeter raksa, dengan denyut nadi ${latest.pulse} detak per menit. Kategori klinis ${categoryText}.`;
    speakTextIndonesian(speechMsg);
  };

  return (
    <header className="h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 px-4 transition-colors flex items-center justify-between shadow-sm">
      {/* Left: Brand & Profile Switcher */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div 
          onClick={() => {
            playClickSound();
            navigate({ to: '/dashboard' });
          }}
          className="w-8 h-8 rounded-xl bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
        >
          <Heart size={16} />
        </div>
        <div className="min-w-0">
          <CustomProfileSelector />
        </div>
      </div>

      {/* Right: Clean Action Buttons & Time */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
          {currentTimeStr}
        </span>

        {/* Voice Reader */}
        <button
          type="button"
          onClick={handleSpeakLatestReading}
          className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-90 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
          title="Dengarkan Hasil Tensi Terakhir"
          aria-label="Bacakan hasil tensi dengan suara"
        >
          <Volume2 size={16} />
        </button>

        {/* Tools & Menu Drawer Button */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            openMobileToolsSheet();
          }}
          className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center active:scale-90 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
          title="Buka Menu Alat & Pengaturan"
          aria-label="Buka menu alat"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </header>
  );
};
