export type RelationshipType = 'self' | 'parent' | 'spouse' | 'child' | 'other';
export type BodyPosition = 'duduk' | 'baring' | 'berdiri';
export type ArmUsed = 'kiri' | 'kanan';

export type MeasurementContext = 'Home' | 'Clinic/Hospital' | 'Post-Medication' | 'Stress';

export type GuidelineId = 'esh_perhi' | 'acc_aha_2025' | 'esc_2024';

export interface Profile {
  id: string;
  name: string;
  relationship: RelationshipType;
  avatar: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  targetSystolic: number;
  targetDiastolic: number;
  guidelinePreference?: GuidelineId;
  notes?: string;
  createdAt: string;
  isDefault?: boolean;
  // Step 03: Anthropometry & Lifestyle Screening
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  smokingStatus?: 'never' | 'former' | 'current' | 'unknown';
  smokingPackYears?: number;
  alcoholConsumption?: 'none' | 'occasional' | 'moderate' | 'heavy' | 'unknown';
  substanceUseHistory?: boolean;
  pregnancyStatus?: 'not_pregnant' | 'pregnant' | 'postpartum' | 'not_applicable';
  screeningCompletedAt?: string;
}

export interface BleMeasurementStatus {
  bodyMovement?: boolean;
  cuffLoose?: boolean;
  irregularPulse?: boolean;
  pulseRangeExceeded?: 'upper' | 'lower';
  improperPosition?: boolean;
}

export interface BPReading {
  /** UUID primary key. Legacy numeric ids are migrated on schema upgrade. */
  id?: string;
  profileId: string;
  systolic: number;
  diastolic: number;
  pulse?: number;
  timestamp: string; // ISO 8601 string
  position?: BodyPosition;
  arm?: ArmUsed;
  tags?: string[];
  notes?: string;
  measurement_context?: MeasurementContext;
  measurementStatus?: BleMeasurementStatus;
  isFlaggedMeasurement?: boolean;
  isExcludedFromAverages?: boolean;
}

export type DrugClass = 
  | 'Golongan CCB' 
  | 'Golongan ARB' 
  | 'Golongan ACE Inhibitor' 
  | 'Golongan Beta Blocker' 
  | 'Golongan Diuretik' 
  | 'Golongan ARNI' 
  | 'Penurun Asam Urat' 
  | 'Statin / Lipid' 
  | 'Antidiabetes' 
  | 'Antiplatelet' 
  | 'Lainnya';
export type MedicationSchedule = 'pagi' | 'siang' | 'sore' | 'malam' | 'pagi_malam' | 'sesuai_kebutuhan';

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
  uricAcid: number; // Asam Urat Darah (mg/dL) - Normal < 7.0
  eGfr?: number; // Estimated Glomerular Filtration Rate (mL/min/1.73m2)
  totalCholesterol?: number; // Kolesterol Total (mg/dL)
  ldlCholesterol?: number; // LDL-C (mg/dL)
  hdlCholesterol?: number; // HDL-C (mg/dL)
  triglycerides?: number; // Trigliserida (mg/dL)
  fastingBloodSugar?: number; // Gula Darah Puasa (mg/dL)
  hba1c?: number; // HbA1c (%)
  potassium?: number; // Kalium Serum K+ (mEq/L) - Normal 3.5-5.0
  sodium?: number; // Natrium Serum Na+ (mEq/L) - Normal 135-145
  proteinuria?: 'negatif' | 'trace' | '+1' | '+2' | '+3'; // Urin Lengkap
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

export type BPCategoryKey = 'optimal' | 'normal' | 'elevated' | 'stage1' | 'stage2' | 'stage3' | 'crisis';

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

export interface BPClassificationResult extends BPCategory {
  guidelineId: GuidelineId;
  guidelineVersion: string;
  guidelineName: string;
  isIsolatedSystolic: boolean;
  isIsolatedDiastolic: boolean;
  isHomeMeasurement?: boolean;
  isAboveHomeThreshold?: boolean;
  patientWording: string;
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
  conditions?: ConditionItem[];
  familyHistory?: FamilyMemberHistoryItem[];
  immunizations?: ImmunizationItem[];
  fhirBundle?: any;
  /** @deprecated ADR 002: Replaced by fhirBundle & fhir-contract-adapters */
  fhirPatients?: FhirPatient[];
  /** @deprecated ADR 002: Replaced by fhirBundle & fhir-contract-adapters */
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
  coding?: FhirCoding[];
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
  identifier?: Array<{
    system?: string;
    value?: string;
    use?: string;
  }>;
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
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
    valueInteger?: number;
    valueBoolean?: boolean;
    valueDateTime?: string;
    [key: string]: any;
  }>;
}

export interface FhirObservation {
  resourceType: 'Observation';
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
  identifier?: Array<{
    system?: string;
    value?: string;
    use?: string;
  }>;
  /** Internal Dexie indexing only; stripped on FHIR R4 export */
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
  valueCodeableConcept?: FhirCodeableConcept;
  derivedFrom?: Array<{ reference: string }>;
  interpretation?: FhirCodeableConcept[];
  note?: Array<{ text: string }>;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
    valueInteger?: number;
    valueBoolean?: boolean;
    valueDateTime?: string;
    [key: string]: any;
  }>;
}

export interface FhirMedicationRequest {
  resourceType: 'MedicationRequest';
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
  identifier?: Array<{
    system?: string;
    value?: string;
    use?: string;
  }>;
  /** Internal Dexie indexing only; stripped on FHIR R4 export */
  profileId?: string;
  status: 'active' | 'completed' | 'cancelled';
  intent: 'order' | 'plan';
  medicationCodeableConcept: FhirCodeableConcept;
  subject: {
    reference: string;
    display?: string;
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
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
    valueInteger?: number;
    valueBoolean?: boolean;
    valueDateTime?: string;
    [key: string]: any;
  }>;
}

export interface FhirMedicationStatement {
  resourceType: 'MedicationStatement';
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
  /** Internal Dexie indexing only; stripped on FHIR R4 export */
  profileId?: string;
  status: 'active' | 'completed';
  medicationCodeableConcept: FhirCodeableConcept;
  subject: {
    reference: string;
    display?: string;
  };
  effectiveDateTime: string;
  dateAsserted?: string;
  informationSource?: {
    reference: string;
  };
}

export interface AscvdProfile {
  id?: number;
  profileId: string;
  timestamp: string;
  age: number;
  gender: 'male' | 'female';
  race: 'white' | 'african_american' | 'other';
  totalCholesterol: number; // mg/dL
  hdlCholesterol: number;   // mg/dL
  systolicBP: number;       // mmHg (auto-filled from latest reading)
  onBPTreatment: boolean;
  diabetes: boolean;
  smoker: boolean;
  riskPercent: number;      // Calculated 10-year ASCVD risk %
  riskLevel: 'low' | 'borderline' | 'intermediate' | 'high';
}

export interface ClinicalNote {
  id?: number;
  profileId: string;
  timestamp: string;
  doctorName?: string;
  chiefComplaint: string;   // Keluhan utama
  assessment: string;       // Penilaian / Diagnosis
  plan: string;             // Rencana terapi
  tags: string[];           // e.g. 'follow-up', 'emergency', 'routine'
  linkedReadingIds: Array<number | string>; // legacy numeric ids tolerated
}

export interface SmartOnFhirConfig {
  clientId: string;
  fhirUrl: string;
  scope: string;
  redirectUri: string;
}

// ===========================================================================
// Step 03: Onboarding Health Screening & Aorta Risk Factors (FHIR R4 Aligned)
// ===========================================================================

export type ConditionCategory = 'aorta_risk' | 'comorbidity' | 'past_history';
export type ClinicalStatus = 'active' | 'recurrence' | 'relapse' | 'inactive' | 'remission' | 'resolved';
export type VerificationStatus = 'confirmed' | 'provisional' | 'differential' | 'unconfirmed';

export interface AortaMeasurementDetails {
  diameterMm?: number;
  segment?: 'ascending' | 'arch' | 'descending_thoracic' | 'abdominal_suprarenal' | 'abdominal_infrarenal';
  modality?: 'cta' | 'mri' | 'echocardiogram' | 'ultrasound';
  measurementMethod?: 'inner_to_inner' | 'leading_edge' | 'outer_to_outer';
}

export interface ConditionItem {
  id: string; // UUID
  profileId: string;
  code: string; // ICD-10 WHO e.g. 'Q87.4'
  codeSystem?: string; // default: 'http://hl7.org/fhir/sid/icd-10'
  snomedCode?: string; // SNOMED CT e.g. '19346006'
  category: ConditionCategory;
  name: string;
  clinicalStatus: ClinicalStatus;
  verificationStatus?: VerificationStatus;
  onsetDateTime?: string; // ISO 8601
  recordedDate: string; // ISO 8601
  notes?: string;
  aortaDetails?: AortaMeasurementDetails;
  updatedAt?: string;
}

export type FamilyRelationshipCode = 'FTH' | 'MTH' | 'SIB' | 'CHILD' | 'EXT';

export interface FamilyMemberHistoryItem {
  id: string; // UUID
  profileId: string;
  relationship: FamilyRelationshipCode; // HL7 v3-RoleCode: Father, Mother, Sibling, Child, Extended
  relationshipDisplay: string; // e.g. 'Ayah Kandung', 'Ibu Kandung'
  conditionCode: string; // ICD-10 WHO e.g. 'I71.9'
  conditionName: string; // e.g. 'Aneurisma Aorta'
  snomedCode?: string;
  deceased?: boolean;
  deceasedAge?: number;
  contributedToDeath?: boolean;
  recordedDate: string;
  updatedAt?: string;
}

export interface ImmunizationItem {
  id: string; // UUID
  profileId: string;
  vaccineCode: string; // e.g. 'FLU', 'PCV', 'COVID19', 'TET'
  vaccineName: string;
  cvxCode?: string;
  occurrenceDateTime: string;
  status: 'completed' | 'not-done';
  recordedDate: string;
  updatedAt?: string;
}

export interface FhirCondition {
  resourceType: 'Condition';
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: {
    reference: string;
    display?: string;
  };
  onsetDateTime?: string;
  recordedDate?: string;
  note?: Array<{ text: string }>;
  evidence?: Array<{
    code?: FhirCodeableConcept[];
    detail?: Array<{ reference: string; display?: string }>;
  }>;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueDecimal?: number;
  }>;
}

export interface FhirFamilyMemberHistory {
  resourceType: 'FamilyMemberHistory';
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
  status: 'completed' | 'partial' | 'health-unknown';
  patient: {
    reference: string;
    display?: string;
  };
  relationship: FhirCodeableConcept;
  date?: string;
  deceasedBoolean?: boolean;
  deceasedAge?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
  condition?: Array<{
    code: FhirCodeableConcept;
    contributedToDeath?: boolean;
  }>;
}

export interface FhirImmunization {
  resourceType: 'Immunization';
  id?: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
    profile?: string[];
  };
  status: 'completed' | 'not-done';
  vaccineCode: FhirCodeableConcept;
  patient: {
    reference: string;
    display?: string;
  };
  occurrenceDateTime: string;
  recorded?: string;
}

