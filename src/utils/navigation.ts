export type PrimaryTab = 'dashboard' | 'history' | 'reports' | 'reminders';
export type UtilityPage = 'profile' | 'settings' | 'landing' | 'backup';
export type ScreenKey = PrimaryTab | UtilityPage;

export const primaryTabPaths: Record<PrimaryTab, string> = {
  dashboard: '/dashboard',
  history: '/history',
  reports: '/reports',
  reminders: '/reminders'
};

export const utilityPagePaths: Record<UtilityPage, string> = {
  profile: '/profile',
  settings: '/settings',
  landing: '/',
  backup: '/backup'
};

export function getScreenKey(pathname: string): ScreenKey {
  if (pathname === '/dashboard') return 'dashboard';
  if (pathname === '/history') return 'history';
  if (pathname === '/reports') return 'reports';
  if (pathname === '/reminders') return 'reminders';
  if (pathname === '/profile') return 'profile';
  if (pathname === '/settings') return 'settings';
  if (pathname === '/backup') return 'backup';
  return 'landing';
}

export function isPrimaryTab(screen: ScreenKey): screen is PrimaryTab {
  return screen === 'dashboard' || screen === 'history' || screen === 'reports' || screen === 'reminders';
}
