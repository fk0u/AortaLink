import type { CareRouteDecision, RedFlagSymptom, ReferralRecommendation, CareRule } from '../../types/care-routing.ts';
import { AORTIC_RED_FLAGS } from './red-flag-rules.ts';
import { generateReferralRecommendations } from './referral-rules.ts';

export const CARE_RULES: CareRule[] = [
  {
    id: 'rule_aortic_emergency',
    description: 'Aortic Dissection Red Flags Evaluation',
    guidelineRef: '2022 ACC/AHA Aortic Disease',
    section: '4.2',
    evaluate: (context: { symptoms: string[] }) => {
      if (context.symptoms.length > 0) {
        return {
          level: 'EMERGENCY',
          action: 'Hubungi 119 atau segera ke IGD terdekat',
          description: 'Gejala mengindikasikan kemungkinan kegawatdaruratan aorta (seperti diseksi aorta).',
          rationale: 'Gejala red flag aorta memiliki tingkat kematian tinggi jika tidak segera ditangani secara medis.',
          guidelineRef: '2022 ACC/AHA Aortic Disease Guideline §4.2'
        };
      }
      return null;
    }
  },
  {
    id: 'rule_htn_emergency',
    description: 'Hypertensive Emergency Evaluation',
    guidelineRef: '2023 ESH Hypertension Guideline',
    section: '14.2',
    evaluate: (context: { systolic: number; diastolic: number; hasSymptoms: boolean }) => {
      if ((context.systolic >= 180 || context.diastolic >= 120) && context.hasSymptoms) {
        return {
          level: 'EMERGENCY',
          action: 'Segera ke IGD',
          description: 'Krisis hipertensi dengan gejala kerusakan organ target (Hipertensi Emergensi).',
          rationale: 'Tekanan darah ≥180/120 mmHg disertai gejala akut (nyeri dada, sesak, gangguan neurologis) menandakan kerusakan organ yang mengancam nyawa.',
          guidelineRef: '2023 ESH Hypertension Guideline §14.2'
        };
      }
      return null;
    }
  },
  {
    id: 'rule_htn_urgency',
    description: 'Hypertensive Urgency Evaluation',
    guidelineRef: '2023 ESH Hypertension Guideline',
    section: '14.3',
    evaluate: (context: { systolic: number; diastolic: number; hasSymptoms: boolean }) => {
      if ((context.systolic >= 180 || context.diastolic >= 120) && !context.hasSymptoms) {
        return {
          level: 'URGENT',
          action: 'Istirahat 5 menit, ukur ulang. Hubungi dokter hari ini.',
          description: 'Tekanan darah sangat tinggi tanpa gejala akut (Hipertensi Urgensi).',
          rationale: 'Tekanan darah ≥180/120 mmHg tanpa keluhan akut membutuhkan penyesuaian terapi secara rawat jalan tanpa perlu perawatan intensif IGD.',
          guidelineRef: '2023 ESH Hypertension Guideline §14.3'
        };
      }
      return null;
    }
  }
];

/**
 * Evaluates red flag symptoms to determine triage level.
 */
export function evaluateRedFlags(symptomIds: string[]): CareRouteDecision | null {
  const context = { symptoms: symptomIds };
  const rule = CARE_RULES.find(r => r.id === 'rule_aortic_emergency');
  if (rule) {
    return rule.evaluate(context);
  }
  return null;
}

/**
 * Evaluates BP readings and symptoms for care routing.
 */
export function evaluateBPRouting(
  systolic: number,
  diastolic: number,
  hasSymptoms: boolean,
  guidelineId: string = 'esh_perhi'
): CareRouteDecision {
  const context = { systolic, diastolic, hasSymptoms };
  
  // Check emergencies first
  const emergencyRule = CARE_RULES.find(r => r.id === 'rule_htn_emergency');
  const emergencyDecision = emergencyRule?.evaluate(context);
  if (emergencyDecision) return emergencyDecision;

  // Check urgencies
  const urgencyRule = CARE_RULES.find(r => r.id === 'rule_htn_urgency');
  const urgencyDecision = urgencyRule?.evaluate(context);
  if (urgencyDecision) return urgencyDecision;

  if (systolic >= 140 || diastolic >= 90) {
    return {
      level: 'ROUTINE',
      action: 'Jadwalkan kontrol rutin',
      description: 'Tekanan darah di atas target.',
      rationale: 'Diperlukan evaluasi penyesuaian gaya hidup atau medikasi lanjutan.',
      guidelineRef: '2023 ESH Hypertension Guideline §11'
    };
  }

  return {
    level: 'SELF_CARE',
    action: 'Lanjutkan gaya hidup sehat',
    description: 'Tekanan darah terkontrol dengan baik.',
    rationale: 'Pemeliharaan status normotensi.',
    guidelineRef: '2023 ESH Hypertension Guideline §8'
  };
}

/**
 * Generates referral recommendations based on profile and conditions.
 */
export function generateReferral(
  profile: any, // Simplified for this context
  readings: { systolic: number; diastolic: number }[],
  conditions: string[]
): ReferralRecommendation[] {
  if (!readings || readings.length === 0) return [];
  
  const latestReading = readings[0];
  const hasComorbidities = conditions.length > 0;
  
  return generateReferralRecommendations(
    latestReading.systolic,
    latestReading.diastolic,
    [], // symptoms handled separately or passed explicitly
    hasComorbidities
  );
}
