export type TriageLevel = 'EMERGENCY' | 'URGENT' | 'ROUTINE' | 'SELF_CARE';

export interface RedFlagSymptom {
  id: string;
  label: string;
  description: string;
  guidelineRef: string;
}

export interface CareRouteDecision {
  level: TriageLevel;
  action: string; // Indonesian action phrase
  description: string;
  rationale: string;
  guidelineRef: string;
}

export type FacilityType = 'IGD' | 'RS_RUJUKAN_JANTUNG' | 'KLINIK_SPESIALIS' | 'PUSKESMAS' | 'MANDIRI';

export interface ReferralRecommendation {
  id: string;
  type: 'REFERRAL' | 'FOLLOW_UP' | 'EMERGENCY_TRANSFER';
  facilityType: FacilityType;
  urgency: TriageLevel;
  description: string;
  guidelineRef: string;
}

export interface CareRule {
  id: string;
  description: string;
  guidelineRef: string;
  section: string;
  evaluate: (context: any) => CareRouteDecision | null;
}

export interface TransferForm {
  patientId: string;
  patientName: string;
  age: number;
  gender: 'MALE' | 'FEMALE';
  latestSystolic: number;
  latestDiastolic: number;
  symptoms: string[];
  referralReason: string;
  targetFacilityType: FacilityType;
  date: string;
}
