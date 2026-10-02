/**
 * AortaLink Release Mode & SaMD Feature Gating
 * --------------------------------------------
 * Single source of truth for release mode:
 * - 'public': Default distribution (non-alkes). Descriptive tracking, FHIR export,
 *             reminders, and static emergency screen only. No SaMD clinical claims,
 *             no automated clinical triage, no clinical health scoring.
 * - 'research': Locked behind an authenticated Study ID & participant Informed Consent.
 *               Enables SaMD research features (guideline staging, LE8 health score,
 *               on-device ML clinical pattern detection, and pseudonymous dataset export).
 */

export type AppReleaseMode = 'public' | 'research';

export interface ResearchConsentRecord {
  studyId: string;
  participantPseudonym: string;
  consentedAt: string; // ISO 8601
  consentVersion: string;
  withdrawnAt?: string | null;
  piOrInstitution?: string;
}

export interface AlgorithmVersionManifest {
  appVersion: string;
  engineVersion: string;
  guideline: string;
  le8Version: string;
  fhirProfile: string;
}

export const ALGORITHM_VERSIONS: AlgorithmVersionManifest = {
  appVersion: '3.0.0',
  engineVersion: '2.0.0',
  guideline: 'ESH 2023 / PERHI',
  le8Version: 'AHA LE8 v1.0',
  fhirProfile: 'HL7 FHIR R4 BP Profile (LOINC 85354-9)'
};

const STORAGE_KEYS = {
  MODE: 'aortalink_release_mode',
  STUDY_ID: 'aortalink_study_id',
  CONSENT: 'aortalink_consent_record'
} as const;

type ModeChangeListener = (mode: AppReleaseMode) => void;
const listeners = new Set<ModeChangeListener>();

function notifyListeners(mode: AppReleaseMode): void {
  listeners.forEach((listener) => {
    try {
      listener(mode);
    } catch (err) {
      console.error('[ReleaseMode] Listener notification error:', err);
    }
  });
}

export function subscribeReleaseMode(listener: ModeChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get the current app release mode ('public' | 'research').
 * Defaults strictly to 'public'.
 */
export function getAppReleaseMode(): AppReleaseMode {
  try {
    if (typeof localStorage === 'undefined') return 'public';
    const stored = localStorage.getItem(STORAGE_KEYS.MODE);
    if (stored === 'research') {
      // Validate that study ID and consent are present and active
      const studyId = localStorage.getItem(STORAGE_KEYS.STUDY_ID);
      const consentRaw = localStorage.getItem(STORAGE_KEYS.CONSENT);
      if (studyId && consentRaw) {
        const consent = JSON.parse(consentRaw) as ResearchConsentRecord;
        if (!consent.withdrawnAt && consent.studyId === studyId) {
          return 'research';
        }
      }
    }
  } catch {
    // Fall back to safe public default on any read failure
  }
  return 'public';
}

/**
 * Returns true if Research/Academic mode is currently active with valid consent.
 */
export function isResearchModeActive(): boolean {
  return getAppReleaseMode() === 'research';
}

export function getResearchStudyId(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.STUDY_ID);
  } catch {
    return null;
  }
}

export function getResearchConsentRecord(): ResearchConsentRecord | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEYS.CONSENT);
    return raw ? (JSON.parse(raw) as ResearchConsentRecord) : null;
  } catch {
    return null;
  }
}

export interface ActivateResearchParams {
  studyId: string;
  consentVersion: string;
  participantPseudonym?: string;
  piOrInstitution?: string;
}

/**
 * Generate a random 8-character hex pseudonym if none provided.
 */
export function generateParticipantPseudonym(): string {
  const chars = '0123456789ABCDEF';
  let out = 'PT-';
  for (let i = 0; i < 8; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

/**
 * Activate Research/Academic mode with a validated Study ID and signed consent.
 */
export function activateResearchMode(params: ActivateResearchParams): { success: boolean; error?: string } {
  const cleanStudyId = params.studyId.trim().toUpperCase();
  if (!cleanStudyId || cleanStudyId.length < 3) {
    return { success: false, error: 'Study ID minimal 3 karakter alfanumerik.' };
  }

  const pseudonym = params.participantPseudonym?.trim() || generateParticipantPseudonym();

  const consentRecord: ResearchConsentRecord = {
    studyId: cleanStudyId,
    participantPseudonym: pseudonym,
    consentedAt: new Date().toISOString(),
    consentVersion: params.consentVersion || '1.0.0',
    withdrawnAt: null,
    piOrInstitution: params.piOrInstitution?.trim() || 'Tim Peneliti AortaLink'
  };

  try {
    localStorage.setItem(STORAGE_KEYS.MODE, 'research');
    localStorage.setItem(STORAGE_KEYS.STUDY_ID, cleanStudyId);
    localStorage.setItem(STORAGE_KEYS.CONSENT, JSON.stringify(consentRecord));
    notifyListeners('research');
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Gagal menyimpan data persetujuan ke penyimpanan lokal.' };
  }
}

/**
 * Withdraw participant consent and revert immediately to Public mode.
 */
export function withdrawResearchConsent(): void {
  try {
    const existing = getResearchConsentRecord();
    if (existing) {
      existing.withdrawnAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.CONSENT, JSON.stringify(existing));
    }
    localStorage.setItem(STORAGE_KEYS.MODE, 'public');
    localStorage.removeItem(STORAGE_KEYS.STUDY_ID);
    notifyListeners('public');
  } catch {
    // ignore
  }
}

/**
 * Deactivate research mode and clear study state.
 */
export function deactivateResearchMode(): void {
  withdrawResearchConsent();
}

/**
 * Returns algorithm version metadata for auditability and research paper reporting.
 */
export function getAlgorithmVersionManifest(): AlgorithmVersionManifest {
  return { ...ALGORITHM_VERSIONS };
}
