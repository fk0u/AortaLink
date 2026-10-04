import { create } from 'zustand';
import { DateFilterRange, BPCategoryKey, BPReading } from '../types/blood-pressure';
import { queryClient } from '../services/query-client';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

const getInitialTheme = (): 'light' | 'dark' | 'system' => {
  try {
    const saved = localStorage.getItem('aortalink_theme');
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'light';
};

interface AppState {
  activeProfileId: string;
  dateFilter: DateFilterRange;
  customStartDate: string | null;
  customEndDate: string | null;
  searchQuery: string;
  categoryFilter: BPCategoryKey | 'all';
  theme: 'light' | 'dark' | 'system';
  
  // User Experience Mode: 'patient' (simplified layman mode) or 'clinical' (comprehensive doctor/pro mode)
  userExperienceMode: 'patient' | 'clinical';
  setUserExperienceMode: (mode: 'patient' | 'clinical') => void;

  // Modals
  isReadingModalOpen: boolean;
  editingReading: BPReading | null;
  isProfileModalOpen: boolean;
  isExportPdfModalOpen: boolean;
  isReminderModalOpen: boolean;
  isMobileToolsSheetOpen: boolean;
  isAiModalOpen: boolean;
  isScreeningModalOpen: boolean;
  isHealthScoreModalOpen: boolean;
  isKnowledgeBaseModalOpen: boolean;
  isRedFlagTriageOpen: boolean;
  isTransferFormModalOpen: boolean;
  isBpGuideModalOpen: boolean;
  isGlossaryModalOpen: boolean;
  
  // Toasts
  toasts: ToastMessage[];

  // Advanced Caching & Refresh state
  isDataLoading: boolean;
  isDataRefreshing: boolean;
  cacheTimestamp: number | null;
  isCacheDirty: boolean;

  // Actions
  setActiveProfileId: (id: string) => void;
  setDateFilter: (range: DateFilterRange, start?: string | null, end?: string | null) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: BPCategoryKey | 'all') => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // Modal controllers
  openReadingModal: (readingToEdit?: BPReading | null) => void;
  closeReadingModal: () => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  openExportPdfModal: () => void;
  closeExportPdfModal: () => void;
  openReminderModal: () => void;
  closeReminderModal: () => void;
  openMobileToolsSheet: () => void;
  closeMobileToolsSheet: () => void;
  openAiModal: () => void;
  closeAiModal: () => void;
  openScreeningModal: () => void;
  closeScreeningModal: () => void;
  openHealthScoreModal: () => void;
  closeHealthScoreModal: () => void;
  openKnowledgeBaseModal: () => void;
  closeKnowledgeBaseModal: () => void;
  openRedFlagTriage: () => void;
  closeRedFlagTriage: () => void;
  openTransferFormModal: () => void;
  closeTransferFormModal: () => void;
  openBpGuideModal: () => void;
  closeBpGuideModal: () => void;
  openGlossaryModal: () => void;
  closeGlossaryModal: () => void;

  // Cache & Loading Actions
  setDataLoading: (loading: boolean) => void;
  setDataRefreshing: (refreshing: boolean) => void;
  setCacheDirty: (dirty: boolean) => void;
  updateCacheTimestamp: () => void;

  // Toast actions
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const getInitialUxMode = (): 'patient' | 'clinical' => {
  try {
    const saved = localStorage.getItem('aortalink_ux_mode');
    if (saved === 'clinical' || saved === 'patient') {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'patient'; // Default to friendly patient mode for laymen
};

export const useAppStore = create<AppState>((set) => ({
  activeProfileId: 'profile-self-default',
  dateFilter: '30days',
  customStartDate: null,
  customEndDate: null,
  searchQuery: '',
  categoryFilter: 'all',
  theme: getInitialTheme(),
  userExperienceMode: getInitialUxMode(),

  isReadingModalOpen: false,
  editingReading: null,
  isProfileModalOpen: false,
  isExportPdfModalOpen: false,
  isReminderModalOpen: false,
  isMobileToolsSheetOpen: false,
  isAiModalOpen: false,
  isScreeningModalOpen: false,
  isHealthScoreModalOpen: false,
  isKnowledgeBaseModalOpen: false,
  isRedFlagTriageOpen: false,
  isTransferFormModalOpen: false,
  isBpGuideModalOpen: false,
  isGlossaryModalOpen: false,

  toasts: [],

  // Cache and load initial states
  isDataLoading: false,
  isDataRefreshing: false,
  cacheTimestamp: null,
  isCacheDirty: true,

  setActiveProfileId: (id) => {
    set({ activeProfileId: id, isCacheDirty: true });
    queryClient.invalidateQueries({ queryKey: ['readings'] });
  },
  setDateFilter: (range, start = null, end = null) => {
    set({ dateFilter: range, customStartDate: start, customEndDate: end, isCacheDirty: true });
    queryClient.invalidateQueries({ queryKey: ['readings'] });
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),
  setTheme: (theme) => {
    try {
      localStorage.setItem('aortalink_theme', theme);
    } catch {
      // ignore
    }
    set({ theme });
  },
  setUserExperienceMode: (mode) => {
    try {
      localStorage.setItem('aortalink_ux_mode', mode);
    } catch {
      // ignore
    }
    set({ userExperienceMode: mode });
  },

  openReadingModal: (readingToEdit = null) =>
    set({ isReadingModalOpen: true, editingReading: readingToEdit }),
  closeReadingModal: () => set({ isReadingModalOpen: false, editingReading: null }),
  
  openProfileModal: () => set({ isProfileModalOpen: true }),
  closeProfileModal: () => set({ isProfileModalOpen: false }),

  openExportPdfModal: () => set({ isExportPdfModalOpen: true }),
  closeExportPdfModal: () => set({ isExportPdfModalOpen: false }),

  openReminderModal: () => set({ isReminderModalOpen: true }),
  closeReminderModal: () => set({ isReminderModalOpen: false }),

  openMobileToolsSheet: () => set({ isMobileToolsSheetOpen: true }),
  closeMobileToolsSheet: () => set({ isMobileToolsSheetOpen: false }),
  openAiModal: () => set({ isAiModalOpen: true }),
  closeAiModal: () => set({ isAiModalOpen: false }),
  openScreeningModal: () => set({ isScreeningModalOpen: true }),
  closeScreeningModal: () => set({ isScreeningModalOpen: false }),
  openHealthScoreModal: () => set({ isHealthScoreModalOpen: true }),
  closeHealthScoreModal: () => set({ isHealthScoreModalOpen: false }),
  openKnowledgeBaseModal: () => set({ isKnowledgeBaseModalOpen: true }),
  closeKnowledgeBaseModal: () => set({ isKnowledgeBaseModalOpen: false }),
  openRedFlagTriage: () => set({ isRedFlagTriageOpen: true }),
  closeRedFlagTriage: () => set({ isRedFlagTriageOpen: false }),
  openTransferFormModal: () => set({ isTransferFormModalOpen: true }),
  closeTransferFormModal: () => set({ isTransferFormModalOpen: false }),
  openBpGuideModal: () => set({ isBpGuideModalOpen: true }),
  closeBpGuideModal: () => set({ isBpGuideModalOpen: false }),
  openGlossaryModal: () => set({ isGlossaryModalOpen: true }),
  closeGlossaryModal: () => set({ isGlossaryModalOpen: false }),

  // Caching setters
  setDataLoading: (loading) => set({ isDataLoading: loading }),
  setDataRefreshing: (refreshing) => set({ isDataRefreshing: refreshing }),
  setCacheDirty: (dirty) => {
    set({ isCacheDirty: dirty });
    if (dirty) {
      queryClient.invalidateQueries({ queryKey: ['readings'] });
    }
  },
  updateCacheTimestamp: () => set({ cacheTimestamp: Date.now(), isCacheDirty: false }),

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
