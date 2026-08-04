export type PrimaryTab = 'dashboard' | 'history' | 'reports' | 'reminders';
export type UtilityPage = 'profile' | 'settings' | 'landing' | 'backup';
export type ScreenKey = PrimaryTab | UtilityPage;

export const primaryTabPaths: Record<PrimaryTab, string> = {
  dashboard: '/',
  history: '/history',
  reports: '/reports',
  reminders: '/reminders'
};

export const utilityPagePaths: Record<UtilityPage, string> = {
  profile: '/profile',
  settings: '/settings',
  landing: '/landing',
  backup: '/backup'
};

export function getScreenKey(pathname: string): ScreenKey {
  if (pathname === '/history') return 'history';
  if (pathname === '/reports') return 'reports';
  if (pathname === '/reminders') return 'reminders';
  if (pathname === '/profile') return 'profile';
  if (pathname === '/settings') return 'settings';
  if (pathname === '/landing') return 'landing';
  if (pathname === '/backup') return 'backup';
  return 'dashboard';
}

export function isPrimaryTab(screen: ScreenKey): screen is PrimaryTab {
  return screen === 'dashboard' || screen === 'history' || screen === 'reports' || screen === 'reminders';
}
