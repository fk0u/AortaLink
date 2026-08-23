import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { playClickSound } from '../../utils/audio-fx';
import { 
  LayoutDashboard, 
  History, 
  FileText, 
  Pill, 
  Plus, 
  IconProps
} from '../icons/AppIcons';
import { motion } from 'framer-motion';

export type NavTab = 'dashboard' | 'history' | 'reports' | 'reminders';

interface M3BottomNavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const M3BottomNavigation: React.FC<M3BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const openReadingModal = useAppStore((state) => state.openReadingModal);

  const navItems: { id: NavTab; label: string; icon: React.ComponentType<IconProps> }[] = [
    { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'history', label: 'Jurnal', icon: History },
    { id: 'reports', label: 'Laporan', icon: FileText },
    { id: 'reminders', label: 'Terapi', icon: Pill },
  ];

  return (
    <nav 
      aria-label="Navigasi Utama Aplikasi Mobile"
      className="fixed bottom-0 left-0 right-0 z-30 px-3 pb-safe pt-1 pointer-events-none"
    >
      <div className="max-w-lg mx-auto relative pointer-events-auto">
        {/* Floating Material 3 Container */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/85 dark:border-slate-800/85 rounded-[32px] px-3 py-2 shadow-2xl shadow-slate-950/20 flex items-center justify-between gap-1 transition-all">
          
          {/* Left 2 Tabs: Ringkasan & Jurnal */}
          <div className="flex-1 grid grid-cols-2 gap-1">
            {navItems.slice(0, 2).map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onTabChange(item.id);
                  }}
                  className="relative flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 active:scale-95 group focus:outline-none"
                  aria-selected={isActive}
                  role="tab"
                >
                  {/* Active Indicator Pill */}
                  {isActive && (
                    <motion.div
                      layoutId="m3-active-tab-pill"
                      className="absolute inset-0 bg-teal-500/15 dark:bg-teal-400/20 border border-teal-500/30 rounded-2xl -z-10"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}

                  <div className={`p-1 rounded-xl transition-colors ${
                    isActive 
                      ? 'text-teal-600 dark:text-teal-400 font-bold' 
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                  }`}>
                    <Icon size={20} className="transition-transform group-active:scale-90" />
                  </div>

                  <span className={`text-[10px] tracking-tight leading-none mt-0.5 ${
                    isActive 
                      ? 'font-black text-teal-700 dark:text-teal-300' 
                      : 'font-semibold text-slate-500 dark:text-slate-400'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Center Floating Action Button (FAB) for Instant BP Entry */}
          <div className="relative px-2 -mt-5 shrink-0 flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                openReadingModal();
              }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 via-emerald-500 to-sky-500 text-white flex items-center justify-center shadow-xl shadow-teal-500/40 active:scale-90 transition-all border-2 border-white dark:border-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/30"
              title="Catat Tekanan Darah Baru"
              aria-label="Catat tensi darah sekarang"
            >
              <Plus size={26} strokeWidth={3} />
            </button>
            <span className="text-[9px] font-black tracking-wider uppercase text-teal-600 dark:text-teal-400 mt-1 select-none">
              Catat
            </span>
          </div>

          {/* Right 2 Tabs: Laporan & Terapi */}
          <div className="flex-1 grid grid-cols-2 gap-1">
            {navItems.slice(2, 4).map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    onTabChange(item.id);
                  }}
                  className="relative flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 active:scale-95 group focus:outline-none"
                  aria-selected={isActive}
                  role="tab"
                >
                  {/* Active Indicator Pill */}
                  {isActive && (
                    <motion.div
                      layoutId="m3-active-tab-pill"
                      className="absolute inset-0 bg-teal-500/15 dark:bg-teal-400/20 border border-teal-500/30 rounded-2xl -z-10"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}

                  <div className={`p-1 rounded-xl transition-colors ${
                    isActive 
                      ? 'text-teal-600 dark:text-teal-400 font-bold' 
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                  }`}>
                    <Icon size={20} className="transition-transform group-active:scale-90" />
                  </div>

                  <span className={`text-[10px] tracking-tight leading-none mt-0.5 ${
                    isActive 
                      ? 'font-black text-teal-700 dark:text-teal-300' 
                      : 'font-semibold text-slate-500 dark:text-slate-400'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </nav>
  );
};
