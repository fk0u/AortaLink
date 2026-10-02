/**
 * AortaLink Pseudonymized Dataset Exporter
 * -----------------------------------------
 * Generates sanitized research datasets (FHIR R4 Bundle Collection & CSV)
 * with all direct Personal Identifiable Information (PII) removed:
 * - Patient names replaced with participant pseudonym (e.g. PT-XXXXXXXX).
 * - Exact birthdate, phone, and email removed.
 * - Algorithm versions, study ID, and guideline tags embedded for paper reproducibility.
 */

import type { BPReading, Profile } from '../../types/blood-pressure.ts';
import { exportReadingsToFHIRBundle, type FHIRBundleResource, toValidUuid } from '../fhir/fhir-exporter.ts';
import { ALGORITHM_VERSIONS, getResearchConsentRecord, getResearchStudyId } from '../config/release-mode.ts';

export interface PseudonymizedExportOptions {
  studyId?: string;
  pseudonym?: string;
}

export function exportPseudonymizedFHIRBundle(
  readings: BPReading[],
  profile?: Profile,
  options?: PseudonymizedExportOptions
): FHIRBundleResource {
  const activeStudyId = options?.studyId || getResearchStudyId() || 'UNSPECIFIED-STUDY';
  const consent = getResearchConsentRecord();
  const pseudonym = options?.pseudonym || consent?.participantPseudonym || 'PT-ANONYMOUS';

  // Create sanitized profile for FHIR conversion
  const sanitizedProfile: Profile = profile
    ? {
        ...profile,
        name: pseudonym,
        avatar: '🔬',
        notes: undefined
      }
    : {
        id: toValidUuid('research-participant', 'patient'),
        name: pseudonym,
        relationship: 'self',
        avatar: '🔬',
        targetSystolic: 130,
        targetDiastolic: 80,
        createdAt: new Date().toISOString()
      };

  const bundle = exportReadingsToFHIRBundle(readings, sanitizedProfile);

  // Strip any remaining PII on entries and inject research metadata
  for (const entry of bundle.entry) {
    if (entry.resource.resourceType === 'Patient') {
      entry.resource.name = [{ use: 'anonymous', text: pseudonym }];
      entry.resource.telecom = undefined;
      entry.resource.birthDate = undefined;
      (entry.resource as any).address = undefined;
    } else if (entry.resource.resourceType === 'Observation') {
      // Scrub free-text clinician or participant notes to prevent accidental PII leakage
      entry.resource.note = undefined;
      if (entry.resource.subject) {
        entry.resource.subject.display = pseudonym;
      }
    }
  }

  // Tag bundle with algorithm and research provenance
  (bundle as any).meta = {
    tag: [
      { system: 'https://aortalink.health/research/study-id', code: activeStudyId },
      { system: 'https://aortalink.health/research/pseudonym', code: pseudonym },
      { system: 'https://aortalink.health/algorithm/engine-version', code: ALGORITHM_VERSIONS.engineVersion },
      { system: 'https://aortalink.health/algorithm/guideline', code: ALGORITHM_VERSIONS.guideline }
    ]
  };

  return bundle;
}

/**
 * Neutralizes Excel/Calc CSV formula injection and escapes embedded quotes.
 */
function sanitizeCSVCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Neutralize spreadsheet formula injection characters (=, +, -, @, \t, \r)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Export blood pressure readings as a sanitized, pseudonymous CSV string.
 */
export function exportPseudonymizedCSV(
  readings: BPReading[],
  options?: PseudonymizedExportOptions
): string {
  const activeStudyId = options?.studyId || getResearchStudyId() || 'UNSPECIFIED-STUDY';
  const consent = getResearchConsentRecord();
  const pseudonym = options?.pseudonym || consent?.participantPseudonym || 'PT-ANONYMOUS';

  const headers = [
    'study_id',
    'participant_pseudonym',
    'reading_id',
    'timestamp_iso',
    'systolic_mmhg',
    'diastolic_mmhg',
    'pulse_bpm',
    'position',
    'arm',
    'measurement_context',
    'algorithm_engine_version',
    'guideline_version',
    'app_version'
  ];

  const rows = readings.map((r) => {
    return [
      sanitizeCSVCell(activeStudyId),
      sanitizeCSVCell(pseudonym),
      sanitizeCSVCell(r.id || ''),
      sanitizeCSVCell(r.timestamp),
      typeof r.systolic === 'number' ? r.systolic : sanitizeCSVCell(r.systolic),
      typeof r.diastolic === 'number' ? r.diastolic : sanitizeCSVCell(r.diastolic),
      typeof r.pulse === 'number' ? r.pulse : sanitizeCSVCell(r.pulse),
      sanitizeCSVCell(r.position || ''),
      sanitizeCSVCell(r.arm || ''),
      sanitizeCSVCell(r.measurement_context || ''),
      sanitizeCSVCell(ALGORITHM_VERSIONS.engineVersion),
      sanitizeCSVCell(ALGORITHM_VERSIONS.guideline),
      sanitizeCSVCell(ALGORITHM_VERSIONS.appVersion)
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
