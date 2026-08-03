export type DashboardSectionId = 'statcards' | 'streakbadges' | 'applerings' | 'lifestylecorrelation' | 'bptrend' | 'recentreadings';

export type DashboardSection = {
  id: DashboardSectionId;
  label: string;
  visible: boolean;
  order: number;
};

const sectionDefinitions: Array<{ id: DashboardSectionId; label: string }> = [
  { id: 'statcards', label: 'Ringkasan Tekanan Darah' },
  { id: 'streakbadges', label: 'Gamifikasi & Pencapaian' },
  { id: 'applerings', label: 'Kategori Tekanan Darah' },
  { id: 'lifestylecorrelation', label: 'Korelasi Gaya Hidup' },
  { id: 'bptrend', label: 'Grafik Tren' },
  { id: 'recentreadings', label: 'Catatan Terbaru' },
];

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardSection[] = sectionDefinitions.map((section, order) => ({ ...section, visible: true, order }));
export const DASHBOARD_PREFERENCES_KEY = 'heartsync-dashboard-layout';

export function loadDashboardPreferences(): DashboardSection[] {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_PREFERENCES.map((section) => ({ ...section }));
  try {
    const parsed = JSON.parse(localStorage.getItem(DASHBOARD_PREFERENCES_KEY) || 'null');
    if (!Array.isArray(parsed)) return DEFAULT_DASHBOARD_PREFERENCES.map((section) => ({ ...section }));
    return sectionDefinitions.map((definition, fallbackOrder) => {
      const saved = parsed.find((item: Partial<DashboardSection>) => item?.id === definition.id);
      return { ...definition, visible: saved?.visible !== false, order: typeof saved?.order === 'number' ? saved.order : fallbackOrder };
    }).sort((a, b) => a.order - b.order).map((section, order) => ({ ...section, order }));
  } catch {
    return DEFAULT_DASHBOARD_PREFERENCES.map((section) => ({ ...section }));
  }
}

export function saveDashboardPreferences(prefs: DashboardSection[]): void {
  if (typeof window !== 'undefined') localStorage.setItem(DASHBOARD_PREFERENCES_KEY, JSON.stringify(prefs));
}
