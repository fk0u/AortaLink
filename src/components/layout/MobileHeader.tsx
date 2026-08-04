import React from 'react';
import { CustomProfileSelector } from '../profiles/CustomProfileSelector';
import { Heart } from 'lucide-react';
import { playClickSound } from '../../utils/audio-fx';
import { useNavigate } from '@tanstack/react-router';

export const MobileHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="md:hidden sticky top-0 z-40 bg-white/96 dark:bg-slate-900/96 backdrop-blur-2xl border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3 transition-colors">
      <div className="flex items-center justify-between gap-3 min-w-0">
        
        {/* App Logo */}
        <div 
          onClick={() => {
            playClickSound();
            navigate({ to: '/' });
          }}
          className="flex items-center gap-2 cursor-pointer min-w-0"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center shadow-md shadow-teal-500/25 shrink-0">
            <Heart className="w-4.5 h-4.5 text-white fill-white animate-pulse" />
          </div>
          <div className="min-w-0">
            <span className="block text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
              AortaLink
            </span>
            <span className="block text-[10px] font-extrabold text-teal-600 dark:text-teal-400 leading-none truncate">
              AI EHR (HL7 FHIR R4)
            </span>
          </div>
        </div>

        {/* Custom Apple Profile Selector */}
        <CustomProfileSelector />

      </div>
    </header>
  );
};
