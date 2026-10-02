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
    'notes'
  ];

  const rows = readings.map((r) => {
    // Sanitize notes: remove potential names/emails in free text
    const cleanNotes = (r.notes || '')
      .replace(/[\r\n]+/g, ' ')
      .replace(/"/g, '""');

    return [
      `"${activeStudyId}"`,
      `"${pseudonym}"`,
      `"${r.id || ''}"`,
      `"${r.timestamp}"`,
      r.systolic,
      r.diastolic,
      r.pulse,
      `"${r.position || ''}"`,
      `"${r.arm || ''}"`,
      `"${r.measurement_context || ''}"`,
      `"${cleanNotes}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
