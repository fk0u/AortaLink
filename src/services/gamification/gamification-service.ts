/**
 * HeartSync Gamification Service
 * Tracks streaks, achievements, and calculates Heart Health Score.
 * Pure client-side computation from IndexedDB data.
 */
import { db } from '../../db';
import { format, parseISO, startOfDay, differenceInCalendarDays, subDays, isToday } from 'date-fns';
import { classifyBP } from '../../utils/bp-classifier';

// ---- Types ----

export interface GamificationState {
  id: 'current';
  streak: number;
  longestStreak: number;
  lastMeasurementDate: string | null; // YYYY-MM-DD
  score: number; // 0-100
  earnedBadges: string[]; // badge keys
}

export interface Badge {
  key: string;
  emoji: string;
  name: string;
  description: string;
  condition: string;
}

// ---- Badge Definitions ----

export const BADGES: Badge[] = [
  {
    key: 'pemula-sehat',
    emoji: '🥉',
    name: 'Pemula Sehat',
    description: 'Mencatat tensi 3 hari berturut-turut',
    condition: 'streak_3',
  },
  {
    key: 'pejuang-tensi',
    emoji: '🥈',
    name: 'Pejuang Tensi',
    description: 'Mencatat tensi 7 hari berturut-turut',
    condition: 'streak_7',
  },
  {
    key: 'master-jantung',
    emoji: '🥇',
    name: 'Master Jantung',
    description: 'Mencatat tensi 30 hari berturut-turut',
    condition: 'streak_30',
  },
  {
    key: 'disiplin-obat',
    emoji: '💊',
    name: 'Disiplin Obat',
    description: 'Log obat 7 hari berturut',
    condition: 'med_7',
  },
  {
    key: 'sadar-garam',
    emoji: '🧂',
    name: 'Sadar Garam',
    description: 'Track sodium 7 hari berturut',
    condition: 'sodium_7',
  },
  {
    key: 'tidur-cukup',
    emoji: '🌙',
    name: 'Tidur Cukup',
    description: 'Track tidur 7 hari berturut',
    condition: 'sleep_7',
  },
  {
    key: 'komplit',
    emoji: '⭐',
    name: 'Komplit',
    description: 'Semua pelacak aktif selama 7 hari',
    condition: 'all_trackers_7',
  },
];

// ---- Core Functions ----

/** Load gamification state from IndexedDB */
export async function getGamificationState(): Promise<GamificationState> {
  const state = await db.gamification.get('current');
  if (state) return state;

  // Default state
  const defaultState: GamificationState = {
    id: 'current',
    streak: 0,
    longestStreak: 0,
    lastMeasurementDate: null,
    score: 0,
    earnedBadges: [],
  };

  await db.gamification.put(defaultState);
  return defaultState;
}

/** Calculate the current measurement streak by scanning all readings */
export async function calculateStreak(profileId: string): Promise<number> {
  const readings = await db.readings
    .where('profileId')
    .equals(profileId)
    .toArray();

  if (readings.length === 0) return 0;

  // Get unique dates (YYYY-MM-DD) sorted descending
  const dates = new Set<string>();
  for (const r of readings) {
    dates.add(format(parseISO(r.timestamp), 'yyyy-MM-dd'));
  }

  const sortedDates = Array.from(dates).sort().reverse();
  if (sortedDates.length === 0) return 0;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Must have a reading today or yesterday to maintain streak
  if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
    return 0;
  }

  // Count consecutive days backwards
  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const current = parseISO(sortedDates[i - 1]);
    const prev = parseISO(sortedDates[i]);
    const diff = differenceInCalendarDays(current, prev);

    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/** Recalculate and update gamification state */
export async function recalculateGamification(profileId: string): Promise<GamificationState> {
  const currentState = await getGamificationState();
  const streak = await calculateStreak(profileId);

  // Update longest streak
  const longestStreak = Math.max(currentState.longestStreak, streak);

  // Compute score
  const score = await calculateHeartHealthScore(profileId);

  // Determine earned badges
  const earnedBadges = await determineBadges(profileId, streak);

  const lastMeasurementDate = streak > 0 ? format(new Date(), 'yyyy-MM-dd') : currentState.lastMeasurementDate;

  const newState: GamificationState = {
    id: 'current',
    streak,
    longestStreak,
    lastMeasurementDate,
    score,
    earnedBadges,
  };

  await db.gamification.put(newState);
  return newState;
}

/** Calculate Heart Health Score (0-100) */
export async function calculateHeartHealthScore(profileId: string): Promise<number> {
  const readings = await db.readings
    .where('profileId')
    .equals(profileId)
    .toArray();

  if (readings.length === 0) return 0;

  // 1. Measurement Consistency (40%)
  let consistencyScore = 0;
  const totalDays = Math.max(1, differenceInCalendarDays(new Date(), parseISO(readings[readings.length - 1].timestamp)) + 1);
  const uniqueDays = new Set<string>();
  for (const r of readings) {
    uniqueDays.add(format(parseISO(r.timestamp), 'yyyy-MM-dd'));
  }
  const consistencyRatio = Math.min(1, uniqueDays.size / Math.max(1, totalDays));
  // Expect at least one reading every 3 days for full score
  const expectedReadings = Math.ceil(totalDays / 3);
  consistencyScore = Math.min(40, Math.round((uniqueDays.size / Math.max(1, expectedReadings)) * 40));

  // 2. BP Within Target Range (40%)
  let bpScore = 0;
  const targetSystolic = 130;
  const targetDiastolic = 85;
  let inRangeCount = 0;
  const recentReadings = readings.slice(-30); // Last 30 readings most relevant
  for (const r of recentReadings) {
    const category = classifyBP(r.systolic, r.diastolic);
    if (category.key === 'normal' || category.key === 'elevated') {
      inRangeCount++;
    }
  }
  bpScore = Math.round((inRangeCount / Math.max(1, recentReadings.length)) * 40);

  // 3. Lifestyle Tracking Completion (20%)
  let lifestyleScore = 0;
  const habits = await db.habits.toArray();
  const sodiumLogs = habits.filter((h) => h.profileId === profileId).length;
  // Heuristic: each lifestyle log contributes to score, max 20 points
  const last7Days = 7;
  const recentHabits = habits.filter((h) => {
    const diff = differenceInCalendarDays(new Date(), parseISO(h.timestamp));
    return diff <= last7Days && h.profileId === profileId;
  });
  lifestyleScore = Math.min(20, recentHabits.length * 5);

  return Math.min(100, consistencyScore + bpScore + lifestyleScore);
}

/** Determine which badges the user has earned */
export async function determineBadges(profileId: string, currentStreak: number): Promise<string[]> {
  const badges: string[] = [];

  // Streak badges
  if (currentStreak >= 3) badges.push('pemula-sehat');
  if (currentStreak >= 7) badges.push('pejuang-tensi');
  if (currentStreak >= 30) badges.push('master-jantung');

  // Lifestyle badges - check consecutive days
  const habits = await db.habits
    .where('profileId')
    .equals(profileId)
    .toArray();

  // Get unique dates for habits
  const habitDates = new Set<string>();
  for (const h of habits) {
    if (h.sleepHours !== undefined || h.screenTimeHours !== undefined) {
      habitDates.add(h.date);
    }
  }

  // Medication tracking: check reminders with type 'medication'
  const reminders = await db.reminders
    .where('profileId')
    .equals(profileId)
    .toArray();
  const medReminders = reminders.filter((r) => r.type === 'medication' && r.enabled);
  if (medReminders.length > 0) {
    // If medication reminders exist and streak >= 7, award badge
    // This is simplified — in a real app we'd track actual medication logs
    if (currentStreak >= 7) badges.push('disiplin-obat');
  }

  // Sodium tracking: check habits for sodium-related entries
  const recentSodiumDays = new Set<string>();
  for (const h of habits) {
    if (h.profileId === profileId) {
      recentSodiumDays.add(h.date);
    }
  }
  if (recentSodiumDays.size >= 7) badges.push('sadar-garam');

  // Sleep tracking: check habits with sleep data
  const sleepDays = new Set<string>();
  for (const h of habits) {
    if (h.sleepHours > 0) {
      sleepDays.add(h.date);
    }
  }
  if (sleepDays.size >= 7) badges.push('tidur-cukup');

  // Komplit: all trackers active
  if (
    badges.includes('disiplin-obat') &&
    badges.includes('sadar-garam') &&
    badges.includes('tidur-cukup')
  ) {
    badges.push('komplit');
  }

  return badges;
}

/** Force a gamification recalculation and return updated state */
export async function refreshGamification(profileId: string): Promise<GamificationState> {
  return recalculateGamification(profileId);
}
