export type RelationshipType = 'self' | 'parent' | 'spouse' | 'child' | 'other';
export type BodyPosition = 'duduk' | 'baring' | 'berdiri';
export type ArmUsed = 'kiri' | 'kanan';

export type MeasurementContext = 'Home' | 'Clinic/Hospital' | 'Post-Medication' | 'Stress';

export interface Profile {
  id: string;
  name: string;
  relationship: RelationshipType;
  avatar: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  targetSystolic: number;
  targetDiastolic: number;
  notes?: string;
  createdAt: string;
  isDefault?: boolean;
}

export interface BPReading {
  id?: number;
  profileId: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  timestamp: string; // ISO 8601 string
  position?: BodyPosition;
  arm?: ArmUsed;
  tags?: string[];
  notes?: string;
  measurement_context?: MeasurementContext;
}

export type DrugClass = 'Golongan CCB' | 'Golongan ARB' | 'Penurun Asam Urat' | 'Lainnya';
export type MedicationSchedule = 'pagi' | 'malam' | 'pagi_malam';

export interface MedicationItem {
  id?: number;
  profileId: string;
  name: string;
  dosage: string;
  drugClass: DrugClass | string;
  schedule: MedicationSchedule;
  purpose: string;
  createdAt: string;
}

export interface MedicationLog {
  id?: number;
  profileId: string;
  medicationId?: number;
  medicationName?: string;
  dosage?: string;
  takenAt?: string; // ISO 8601 timestamp
  notes?: string;
  date?: string;
  takenCount?: number;
  totalCount?: number;
}

export interface LabResult {
  id?: number;
  profileId: string;
  timestamp: string; // ISO 8601 string
  bloodUrea: number; // Ureum Darah (mg/dL) - Normal ~15-45
  serumCreatinine: number; // Kreatinin Darah (mg/dL) - Normal ~0.6-1.2
  uricAcid: number; // Asam Urat Darah (mg/dL) - Normal < 7.0 (High > 7.0)
  notes?: string;
}

export type DippingPattern = 'dipper' | 'non_dipper' | 'riser' | 'extreme_dipper';

export interface CircadianDippingReport {
  daytimeAvgSystolic: number;
  daytimeAvgDiastolic: number;
  daytimeAvgMAP: number;
  nighttimeAvgSystolic: number;
  nighttimeAvgDiastolic: number;
  nighttimeAvgMAP: number;
  sysDippingPercent: number;
  diaDippingPercent: number;
  pattern: DippingPattern;
  label: string;
  description: string;
  clinicalAdvice: string;
}

export type ClinicalAlertSeverity = 'info' | 'warning' | 'critical';

export interface ClinicalAlert {
  id: string;
  title: string;
  category: 'hyperuricemia' | 'hypertension_stage' | 'renal_impairment' | 'white_coat';
  severity: ClinicalAlertSeverity;
  message: string;
  recommendation: string;
  valueString?: string;
  timestamp: string;
}

export interface SodiumLog { id?: number; profileId: string; date: string; sodiumMg: number; items?: string[] }
export interface SleepLog { id?: number; profileId: string; date: string; sleepHours: number; screenTimeHours?: number; outdoorMinutes?: number }

export interface HabitLog {
  id?: number;
  profileId: string;
  date: string; // YYYY-MM-DD
  sleepTime: string; // e.g. "22:30"
  wakeTime: string; // e.g. "06:30"
  sleepHours: number; // calculated hours
  screenTimeHours: number; // screen time in hours
  outdoorMinutes: number; // outdoor activity in minutes
  activityNotes?: string;
  timestamp: string;
}

export type BPCategoryKey = 'normal' | 'elevated' | 'stage1' | 'stage2' | 'crisis';

export interface BPCategory {
  key: BPCategoryKey;
  label: string;
  labelEn: string;
  description: string;
  recommendation: string;
  colorClass: string;
  bgLightClass: string;
  bgDarkClass: string;
  badgeClass: string;
  borderClass: string;
  textClass: string;
  hexColor: string;
  iconName: string;
}

export interface Reminder {
  id?: number;
  profileId: string;
  title: string;
  type: 'measurement' | 'medication';
  time: string; // "07:00" format
  days: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  enabled: boolean;
  dosage?: string;
  notes?: string;
}

export interface BPSummaryStats {
  totalReadings: number;
  avgSystolic: number;
  avgDiastolic: number;
  avgPulse: number;
  avgMAP: number; // Mean Arterial Pressure (mmHg)
  avgPulsePressure: number; // Pulse Pressure (mmHg)
  targetComplianceRate: number; // Percentage meeting target (0 - 100%)
  maxSystolic: number;
  minSystolic: number;
  maxDiastolic: number;
  minDiastolic: number;
  latestReading?: BPReading;
  categoryCounts: Record<BPCategoryKey, number>;
  mostFrequentCategory: BPCategoryKey;
}

export type DateFilterRange = '7days' | '30days' | '90days' | 'all' | 'custom';
export type SortOption = 'date_desc' | 'date_asc' | 'systolic_desc' | 'systolic_asc';

export interface GamificationState {
  id: 'current';
  streak: number;
  longestStreak: number;
  lastMeasurementDate: string | null;
  score: number;
  earnedBadges: string[];
}

export interface BackupDataFormat {
  version: string;
  exportedAt: string;
  profiles: Profile[];
  readings: BPReading[];
  reminders: Reminder[];
  habits?: HabitLog[];
  medications?: MedicationItem[];
  medicationLogs?: MedicationLog[];
  labResults?: LabResult[];
  fhirPatients?: FhirPatient[];
  fhirObservations?: FhirObservation[];
}

/**
 * ==========================================
 * HL7 FHIR Version R4 International Schemas
 * ==========================================
 */

export interface FhirCoding {
  system: string;
  code: string;
  display: string;
}

export interface FhirCodeableConcept {
  coding: FhirCoding[];
  text?: string;
}

export interface FhirObservationComponent {
  code: FhirCodeableConcept;
  valueQuantity: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
}

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
  active: boolean;
  name: Array<{
    use?: string;
    text: string;
    family?: string;
    given?: string[];
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  telecom?: Array<{
    system: 'phone' | 'email';
    value: string;
  }>;
}

export interface FhirObservation {
  resourceType: 'Observation';
  id?: string;
  profileId?: string;
  status: 'final' | 'amended' | 'preliminary';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: {
    reference: string;
    display?: string;
  };
  effectiveDateTime: string; // ISO 8601
  valueQuantity?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
  component?: FhirObservationComponent[];
  note?: Array<{ text: string }>;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
  }>;
}

export interface FhirMedicationRequest {
  resourceType: 'MedicationRequest';
  id?: string;
  profileId?: string;
  status: 'active' | 'completed' | 'cancelled';
  intent: 'order' | 'plan';
  medicationCodeableConcept: FhirCodeableConcept;
  subject: {
    reference: string;
  };
  dosageInstruction?: Array<{
    text: string;
    timing?: {
      repeat?: {
        period?: number;
        periodUnit?: 'd' | 'h';
        when?: string[];
      };
    };
  }>;
}

export interface FhirMedicationStatement {
  resourceType: 'MedicationStatement';
  id?: string;
  profileId?: string;
  status: 'active' | 'completed';
  medicationCodeableConcept: FhirCodeableConcept;
  subject: {
    reference: string;
  };
  effectiveDateTime: string;
  dateAsserted?: string;
  informationSource?: {
    reference: string;
  };
}

export interface SmartOnFhirConfig {
  clientId: string;
  fhirUrl: string;
  scope: string;
  redirectUri: string;
}
