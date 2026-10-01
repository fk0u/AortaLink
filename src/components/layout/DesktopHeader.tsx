import React from 'react';
import { useRouterState, useNavigate } from '@tanstack/react-router';
import { CustomProfileSelector } from '../profiles/CustomProfileSelector';
import { NavTab } from './Navigation';
import { playClickSound } from '../../utils/audio-fx';
import { timeService } from '../../services/time/time-service';
import { Heart, LayoutDashboard, History, FileText, Bell, Plus, Settings, UserRound, LogOut, SunMedium, MoonStar, Clock } from '../icons/AppIcons';
import { useAppStore } from '../../store/useAppStore';
import { ShieldAlert } from '../icons/AppIcons';
import { useAuthStore } from '../../store/useAuthStore';

interface DesktopHeaderProps {
  onOpenSOS?: () => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({ onOpenSOS }) => {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const openReadingModal = useAppStore((state) => state.openReadingModal);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [currentTimeStr, setCurrentTimeStr] = React.useState(() => timeService.formatTimeWithWITA());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(timeService.formatTimeWithWITA());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const activeTab: NavTab =
    routerState.location.pathname === '/dashboard' ? 'dashboard' :
    routerState.location.pathname === '/history' ? 'history' :
    routerState.location.pathname === '/reports' ? 'reports' :
    routerState.location.pathname === '/reminders' ? 'reminders' : 'dashboard';

  const handleTabClick = (tab: NavTab) => {
    playClickSound();
    const toPath = tab === 'dashboard' ? '/dashboard' : `/${tab}`;
    navigate({ to: toPath });
  };

  const handleLogout = async () => {
    playClickSound();
    const result = await logout();
    if (!result.loggedOut) {
      // The cloud hasn't got these changes yet; logging out wipes this device.
      const proceed = window.confirm(
        `Ada ${result.unsyncedCount} perubahan yang belum tersinkron ke cloud (${result.message}). ` +
        'Jika keluar sekarang, perubahan tersebut akan hilang dari perangkat ini. Tetap keluar?'
      );
      if (!proceed) return;
      await logout({ force: true });
    }
    navigate({ to: '/' });
  };

  const toggleTheme = () => {
    playClickSound();
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'history', label: 'Jurnal Riwayat', icon: History },
    { id: 'reports', label: 'Laporan Dokter', icon: FileText },
    { id: 'reminders', label: 'Jadwal Pengingat', icon: Bell },
  ];

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-white/95 ios-nav-blur ios-hairline-b backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/10 px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        
        {/* Left: App Brand Logo */}
        <div 
          onClick={() => handleTabClick('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center shadow-lg shadow-teal-500/25 group-hover:scale-105 transition-transform">
            <Heart size={20} className="text-white fill-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              AortaLink
            </h1>
            <span className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
              Open-Source AI EHR (HL7 FHIR R4)
            </span>
          </div>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-[#1c1c1e] text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Actions, Theme Switcher & Custom Profile Selector */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Live Timezone Clock */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] border border-slate-200/80 dark:border-white/10 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 select-none">
            <Clock size={13} className="text-teal-600 dark:text-teal-400" />
            <span>{currentTimeStr}</span>
          </div>

          {/* Emergency SOS */}
          {onOpenSOS && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onOpenSOS();
              }}
              className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 transition-all active:scale-95"
              title="Kirim SOS Darurat"
              aria-label="Kirim notifikasi darurat SOS"
            >
              <ShieldAlert size={16} />
            </button>
          )}

          {/* Quick Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 transition-all active:scale-95"
            title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          >
            {theme === 'dark' ? <SunMedium size={16} className="text-amber-400" /> : <MoonStar size={16} className="text-slate-600" />}
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              navigate({ to: '/profile' });
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 font-extrabold text-xs transition-all active:scale-95"
          >
            <UserRound size={15} />
            <span>Profil</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              navigate({ to: '/settings' });
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 font-extrabold text-xs transition-all active:scale-95"
          >
            <Settings size={15} />
            <span>Pengaturan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              openReadingModal();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Catat Tensi</span>
          </button>

          <CustomProfileSelector />

          {/* User Session Logout */}
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors"
              title={`Keluar (${user.name})`}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
