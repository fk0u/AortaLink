import { create } from 'zustand';
import {
  AppReleaseMode,
  ResearchConsentRecord,
  getAppReleaseMode,
  isResearchModeActive,
  getResearchStudyId,
  getResearchConsentRecord,
  activateResearchMode,
  withdrawResearchConsent,
  subscribeReleaseMode,
  ActivateResearchParams
} from '../services/config/release-mode';

interface ResearchState {
  mode: AppReleaseMode;
  isActive: boolean;
  studyId: string | null;
  consentRecord: ResearchConsentRecord | null;
  isConsentModalOpen: boolean;

  // Actions
  refreshState: () => void;
  openConsentModal: () => void;
  closeConsentModal: () => void;
  activate: (params: ActivateResearchParams) => { success: boolean; error?: string };
  withdraw: () => void;
}

export const useResearchStore = create<ResearchState>((set, get) => {
  // Subscribe to external/core changes
  subscribeReleaseMode((newMode) => {
    set({
      mode: newMode,
      isActive: newMode === 'research',
      studyId: getResearchStudyId(),
      consentRecord: getResearchConsentRecord()
    });
  });

  // Cross-tab synchronization
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (
        e.key === 'aortalink_release_mode' ||
        e.key === 'aortalink_study_id' ||
        e.key === 'aortalink_consent_record'
      ) {
        get().refreshState();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        get().refreshState();
      }
    });
  }

  return {
    mode: getAppReleaseMode(),
    isActive: isResearchModeActive(),
    studyId: getResearchStudyId(),
    consentRecord: getResearchConsentRecord(),
    isConsentModalOpen: false,

    refreshState: () => {
      set({
        mode: getAppReleaseMode(),
        isActive: isResearchModeActive(),
        studyId: getResearchStudyId(),
        consentRecord: getResearchConsentRecord()
      });
    },

    openConsentModal: () => set({ isConsentModalOpen: true }),
    closeConsentModal: () => set({ isConsentModalOpen: false }),

    activate: (params) => {
      const res = activateResearchMode(params);
      if (res.success) {
        get().refreshState();
      }
      return res;
    },

    withdraw: () => {
      withdrawResearchConsent();
      get().refreshState();
    }
  };
});
