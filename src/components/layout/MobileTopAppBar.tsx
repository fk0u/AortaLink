import React from 'react';
import { CustomProfileSelector } from '../profiles/CustomProfileSelector';
import { Heart, Volume2, MoreVertical, ShieldAlert, Plus } from '../icons/AppIcons';
import { playClickSound } from '../../utils/audio-fx';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useAppStore } from '../../store/useAppStore';
import { speakTextIndonesian } from '../../utils/speech-reader';
import { classifyBP } from '../../utils/bp-classifier';
import { useReadings } from '../../hooks/useReadings';
import { useProfiles } from '../../hooks/useProfiles';

interface MobileTopAppBarProps {
  onOpenSOS?: () => void;
}

const SCREEN_TITLES: Record<string, string> = {
  '/dashboard': 'Ringkasan',
  '/history': 'Jurnal',
  '/reports': 'Laporan',
  '/reminders': 'Terapi',
  '/profile': 'Profil',
  '/settings': 'Pengaturan'
};

/**
 * iOS-style nav bar: large title that collapses into a centered inline title
 * on scroll (translucent material + hairline separator), with the primary
 * "+" action on the trailing edge — the Apple Health app pattern.
 */
export const MobileTopAppBar: React.FC<MobileTopAppBarProps> = ({ onOpenSOS }) => {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const openReadingModal = useAppStore((state) => state.openReadingModal);
  const openMobileToolsSheet = useAppStore((state) => state.openMobileToolsSheet);
  const { stats } = useReadings();
  const { activeProfile } = useProfiles();

  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 28);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const title = SCREEN_TITLES[pathname] || 'AortaLink';

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
    <header className={`sticky top-0 z-40 ios-nav-blur ${scrolled ? 'ios-hairline-b' : ''}`}>
      {/* Compact bar row */}
      <div className="relative h-12 px-4 flex items-center justify-between">
        {/* Left: brand + profile switcher; the brand mark gives way to a
            leading inline title while scrolled so nothing collides with the
            trailing action cluster. */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {scrolled ? (
            // Collapsed state: leading inline title only — the profile switcher
            // returns with the large-title state (or lives on the Profile tab).
            <span className="truncate text-[17px] font-semibold text-slate-900 dark:text-white">
              {title}
            </span>
          ) : (
            <>
              <div
                onClick={() => {
                  playClickSound();
                  navigate({ to: '/dashboard' });
                }}
                className="w-8 h-8 rounded-[10px] bg-teal-600 text-white flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-transform"
                role="button"
                aria-label="Ke Ringkasan"
              >
                <Heart size={15} className="fill-white/90" />
              </div>
              <div className="min-w-0 shrink-0">
                <CustomProfileSelector />
              </div>
            </>
          )}
        </div>

        {/* Right: primary action + utilities */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              openReadingModal();
            }}
            className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center active:scale-90 transition-transform shadow-sm mr-0.5"
            title="Catat Tekanan Darah"
            aria-label="Catat tensi darah baru"
          >
            <Plus size={20} strokeWidth={2.6} />
          </button>

          <button
            type="button"
            onClick={handleSpeakLatestReading}
            className="w-9 h-9 rounded-full text-slate-500 dark:text-slate-300 flex items-center justify-center active:scale-90 transition-all hover:bg-black/5 dark:hover:bg-white/10"
            title="Dengarkan Hasil Tensi Terakhir"
            aria-label="Bacakan hasil tensi dengan suara"
          >
            <Volume2 size={19} />
          </button>

          {onOpenSOS && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onOpenSOS();
              }}
              className="w-9 h-9 rounded-full text-rose-500 flex items-center justify-center active:scale-90 transition-all hover:bg-rose-500/10"
              title="Kirim SOS Darurat"
              aria-label="Kirim notifikasi darurat SOS"
            >
              <ShieldAlert size={19} />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playClickSound();
              openMobileToolsSheet();
            }}
            className="w-9 h-9 rounded-full text-slate-500 dark:text-slate-300 flex items-center justify-center active:scale-90 transition-all hover:bg-black/5 dark:hover:bg-white/10"
            title="Buka Menu Alat & Pengaturan"
            aria-label="Buka menu alat"
          >
            <MoreVertical size={19} />
          </button>
        </div>
      </div>

      {/* Large title (collapses away on scroll) */}
      <div
        className={`px-5 pb-1.5 overflow-hidden transition-all duration-200 ${
          scrolled ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100'
        }`}
      >
        <h1 className="ios-large-title text-slate-900 dark:text-white">{title}</h1>
      </div>
    </header>
  );
};
