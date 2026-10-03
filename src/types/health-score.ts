/**
 * AortaLink Health Score Types (AHA Life's Essential 8 Specification)
 * Reference: Lloyd-Jones DM, et al. Circulation. 2022;146:e18–e43.
 * Clinical Consensus: docs/v3/CLINICAL_REVIEW.md §2.1 & §3.6
 */

export type HealthScoreMetricId =
  | 'blood_pressure'
  | 'nicotine'
  | 'bmi'
  | 'lipids'
  | 'glucose'
  | 'physical_activity'
  | 'sleep'
  | 'diet';

export type HealthScoreCategory = 'high' | 'moderate' | 'low';

export interface HealthScoreMetricResult {
  id: HealthScoreMetricId;
  name: string;
  nameId: string; // Indonesian title
  score: number | null; // 0 - 100 or null if not available
  isAvailable: boolean;
  valueDisplay: string;
  unit?: string;
  status: 'optimal' | 'moderate' | 'suboptimal' | 'missing';
  treatedAdjustmentApplied?: boolean; // -20 pts AHA treated adjustment
  details: string; // Explanation of how the score was calculated
  recommendation: string; // Clinical guidance for patient
  guidelineSource: string;
  dataSource: string; // e.g. "Rata-rata HBPM 14 hari", "Profil Pasien", "Lab FHIR"
  missingReason?: string;
}

export interface AortaLinkHealthScoreReport {
  generatedAt: string;
  engineVersion: string;
  guideline: string;
  status: 'complete' | 'not_enough_data';
  totalScore: number | null; // Only populated when all 8 metrics are present
  category: HealthScoreCategory | null;
  categoryLabel: string;
  categoryDescription: string;
  completedMetricsCount: number;
  totalMetricsCount: number; // 8
  metrics: Record<HealthScoreMetricId, HealthScoreMetricResult>;
  missingMetrics: HealthScoreMetricId[];
  completedMetrics: HealthScoreMetricId[];
  // Strictly separated indicators (not blended into score to avoid double counting)
  separateIndicators: {
    ascvd10YearRiskPercent: number | null;
    medicationAdherenceRatePercent: number | null;
    dippingPattern: string | null;
  };
  disclaimer: string;
}
