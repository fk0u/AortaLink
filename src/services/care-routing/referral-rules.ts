import type { ReferralRecommendation, TriageLevel, CareRouteDecision, FacilityType } from '../../types/care-routing.ts';

export function shouldReferToER(symptomsPresent: boolean, systolic: number, diastolic: number): boolean {
  return symptomsPresent || systolic >= 180 || diastolic >= 120;
}

export function shouldReferToSpecialist(systolic: number, diastolic: number, hasComorbidities: boolean = false): boolean {
  // ESC/ESH Guidelines typically suggest specialist referral for resistant hypertension or severe organ damage
  return (systolic >= 160 || diastolic >= 100) && hasComorbidities;
}

export function shouldScheduleFollowup(systolic: number, diastolic: number): boolean {
  return systolic >= 140 || diastolic >= 90;
}

export function generateReferralRecommendations(
  systolic: number,
  diastolic: number,
  symptoms: string[],
  hasComorbidities: boolean = false
): ReferralRecommendation[] {
  const recommendations: ReferralRecommendation[] = [];

  if (symptoms.length > 0 && (systolic >= 180 || diastolic >= 120)) {
    recommendations.push({
      id: 'ref_emergency_htn_crisis',
      type: 'EMERGENCY_TRANSFER',
      facilityType: 'IGD',
      urgency: 'EMERGENCY',
      description: 'Krisis Hipertensi dengan Gejala (Hipertensi Emergensi). Segera ke IGD.',
      guidelineRef: '2023 ESH Hypertension Guideline §14.2'
    });
  } else if (symptoms.length > 0) {
    recommendations.push({
      id: 'ref_emergency_symptoms',
      type: 'EMERGENCY_TRANSFER',
      facilityType: 'IGD',
      urgency: 'EMERGENCY',
      description: 'Gejala Bendera Merah (Red Flags) terdeteksi. Segera hubungi 119 atau ke IGD.',
      guidelineRef: '2022 ACC/AHA Aortic Disease Guideline §4.2'
    });
  } else if (systolic >= 180 || diastolic >= 120) {
    recommendations.push({
      id: 'ref_urgency_htn',
      type: 'REFERRAL',
      facilityType: 'PUSKESMAS', // or Klinik
      urgency: 'URGENT',
      description: 'Hipertensi Urgensi (TD ≥180/120 tanpa gejala). Istirahat 5 menit, ukur ulang. Hubungi dokter hari ini.',
      guidelineRef: '2023 ESH Hypertension Guideline §14.3'
    });
  } else if (shouldReferToSpecialist(systolic, diastolic, hasComorbidities)) {
    recommendations.push({
      id: 'ref_specialist',
      type: 'REFERRAL',
      facilityType: 'RS_RUJUKAN_JANTUNG',
      urgency: 'ROUTINE',
      description: 'Hipertensi persisten atau resisten. Disarankan rujuk ke Spesialis Jantung.',
      guidelineRef: '2023 ESH Hypertension Guideline §18.1'
    });
  } else if (shouldScheduleFollowup(systolic, diastolic)) {
    recommendations.push({
      id: 'ref_followup',
      type: 'FOLLOW_UP',
      facilityType: 'PUSKESMAS',
      urgency: 'ROUTINE',
      description: 'Tekanan darah di atas target. Jadwalkan kontrol rutin.',
      guidelineRef: '2023 ESH Hypertension Guideline §11.2'
    });
  }

  return recommendations;
}
