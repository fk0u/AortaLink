export type PrimaryTab = 'dashboard' | 'history' | 'reports' | 'reminders';
export type UtilityPage = 'profile' | 'settings' | 'landing' | 'backup' | 'privacy' | 'terms';
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
  backup: '/backup',
  privacy: '/privacy',
  terms: '/terms'
};

export function getScreenKey(pathname: string): ScreenKey {
  if (pathname === '/dashboard') return 'dashboard';
  if (pathname === '/history') return 'history';
  if (pathname === '/reports') return 'reports';
  if (pathname === '/reminders') return 'reminders';
  if (pathname === '/profile') return 'profile';
  if (pathname === '/settings') return 'settings';
  if (pathname === '/backup') return 'backup';
  if (pathname === '/privacy') return 'privacy';
  if (pathname === '/terms') return 'terms';
  return 'landing';
}

export function isPrimaryTab(screen: ScreenKey): screen is PrimaryTab {
  return screen === 'dashboard' || screen === 'history' || screen === 'reports' || screen === 'reminders';
}
