import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { playClickSound } from '../../utils/audio-fx';
import {
  LayoutDashboard,
  History,
  FileText,
  Pill,
  IconProps
} from '../icons/AppIcons';

export type NavTab = 'dashboard' | 'history' | 'reports' | 'reminders';

interface M3BottomNavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

/**
 * iOS-style tab bar: full-width translucent material, hairline top separator,
 * 44pt+ touch targets, tinted active state. The "add reading" action lives in
 * the top nav bar (Apple Health pattern), not in a floating button.
 */
export const M3BottomNavigation: React.FC<M3BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  const navItems: { id: NavTab; label: string; icon: React.ComponentType<IconProps> }[] = [
    { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'history', label: 'Jurnal', icon: History },
    { id: 'reports', label: 'Laporan', icon: FileText },
    { id: 'reminders', label: 'Terapi', icon: Pill },
  ];

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed bottom-0 left-0 right-0 z-30 ios-nav-blur ios-hairline-t pb-safe"
    >
      <div className="max-w-lg mx-auto grid grid-cols-4 px-2 pt-1.5">
        {navItems.map((item) => {
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
              className="flex flex-col items-center justify-center gap-0.5 py-1 min-h-[48px] transition-opacity active:opacity-60 focus:outline-none"
              aria-selected={isActive}
              role="tab"
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2.4 : 2}
                className={isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}
              />
              <span
                className={`text-[10px] leading-none tracking-tight ${
                  isActive
                    ? 'font-semibold text-teal-600 dark:text-teal-400'
                    : 'font-medium text-slate-500 dark:text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
