import React from 'react';
import { useRouterState, useNavigate } from '@tanstack/react-router';
import { CustomProfileSelector } from '../profiles/CustomProfileSelector';
import { NavTab } from './Navigation';
import { playClickSound } from '../../utils/audio-fx';
import { Heart, LayoutDashboard, History, FileText, Bell, Plus, Settings, UserRound } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const DesktopHeader: React.FC = () => {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const openReadingModal = useAppStore((state) => state.openReadingModal);

  const activeTab: NavTab =
    routerState.location.pathname === '/' ? 'dashboard' :
    routerState.location.pathname === '/history' ? 'history' :
    routerState.location.pathname === '/reports' ? 'reports' :
    routerState.location.pathname === '/reminders' ? 'reminders' : 'dashboard';

  const handleTabClick = (tab: NavTab) => {
    playClickSound();
    const toPath = tab === 'dashboard' ? '/' : `/${tab}`;
    navigate({ to: toPath });
  };

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Ringkasan', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'history', label: 'Jurnal Riwayat', icon: <History className="w-4 h-4" /> },
    { id: 'reports', label: 'Laporan Dokter', icon: <FileText className="w-4 h-4" /> },
    { id: 'reminders', label: 'Jadwal Pengingat', icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-b border-slate-200/80 dark:border-slate-800/80 px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        
        {/* Left: App Brand Logo */}
        <div 
          onClick={() => handleTabClick('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center shadow-lg shadow-teal-500/25 group-hover:scale-105 transition-transform">
            <Heart className="w-5 h-5 text-white fill-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              AortaLink
            </h1>
            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
              Personal EHR &amp; Clinical Platform
            </span>
          </div>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-full border border-slate-200/80 dark:border-slate-700/80">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-md shadow-slate-900/5'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Actions & Custom Profile Selector */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              navigate({ to: '/profile' });
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 font-extrabold text-xs transition-all active:scale-95"
          >
            <UserRound className="w-4 h-4" />
            Profil
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              navigate({ to: '/settings' });
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 font-extrabold text-xs transition-all active:scale-95"
          >
            <Settings className="w-4 h-4" />
            Pengaturan
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              openReadingModal();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-extrabold text-xs shadow-md shadow-teal-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Catat Tensi
          </button>

          <CustomProfileSelector />
        </div>

      </div>
    </header>
  );
};
