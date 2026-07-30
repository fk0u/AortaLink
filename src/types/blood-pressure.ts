export type RelationshipType = 'self' | 'parent' | 'spouse' | 'child' | 'other';
export type BodyPosition = 'duduk' | 'baring' | 'berdiri';
export type ArmUsed = 'kiri' | 'kanan';

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
}

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
}
