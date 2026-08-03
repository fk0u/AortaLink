import Dexie, { type Table } from 'dexie';
import { Profile, BPReading, Reminder, HabitLog, GamificationState, SodiumLog, SleepLog, MedicationLog } from '../types/blood-pressure';

export class HeartSyncDatabase extends Dexie {
  profiles!: Table<Profile, string>;
  readings!: Table<BPReading, number>;
  reminders!: Table<Reminder, number>;
  habits!: Table<HabitLog, number>;
  gamification!: Table<GamificationState, 'current'>;
  sodiumLogs!: Table<SodiumLog, number>;
  sleepLogs!: Table<SleepLog, number>;
  medicationLogs!: Table<MedicationLog, number>;

  constructor() {
    super('HeartSyncDB');
    this.version(1).stores({
      profiles: 'id, name, relationship, isDefault, createdAt',
      readings: '++id, profileId, timestamp, systolic, diastolic, pulse',
      reminders: '++id, profileId, type, time, enabled'
    });

    this.version(2).stores({
      profiles: 'id, name, relationship, isDefault, createdAt',
      readings: '++id, profileId, timestamp, systolic, diastolic, pulse',
      reminders: '++id, profileId, type, time, enabled',
      habits: '++id, profileId, date, timestamp'
    });

    this.version(3).stores({
      profiles: 'id, name, relationship, isDefault, createdAt',
      readings: '++id, profileId, timestamp, systolic, diastolic, pulse',
      reminders: '++id, profileId, type, time, enabled',
      habits: '++id, profileId, date, timestamp',
      gamification: 'id, streak, longestStreak, lastMeasurementDate, score, earnedBadges'
    });

    this.version(4).stores({
      profiles: 'id, name, relationship, isDefault, createdAt',
      readings: '++id, profileId, timestamp, systolic, diastolic, pulse',
      reminders: '++id, profileId, type, time, enabled',
      habits: '++id, profileId, date, timestamp',
      gamification: 'id, streak, longestStreak, lastMeasurementDate, score, earnedBadges',
      sodiumLogs: '++id, profileId, date',
      sleepLogs: '++id, profileId, date',
      medicationLogs: '++id, profileId, date'
    });
  }
}

export const db = new HeartSyncDatabase();

/**
 * Initialize fresh database with default profile if empty.
 * NO mock data, NO fake readings, NO simulated logs. Pure real data storage!
 */
export async function seedInitialData() {
  const profileCount = await db.profiles.count();
  if (profileCount === 0) {
    const defaultProfileId = 'profile-self-default';

    const initialProfile: Profile = {
      id: defaultProfileId,
      name: 'Saya',
      relationship: 'self',
      avatar: '👤',
      targetSystolic: 120,
      targetDiastolic: 80,
      createdAt: new Date().toISOString(),
      isDefault: true
    };

    await db.profiles.add(initialProfile);
  }

  // Initialize gamification state if not present
  const gamificationState = await db.gamification.get('current');
  if (!gamificationState) {
    await db.gamification.put({
      id: 'current',
      streak: 0,
      longestStreak: 0,
      lastMeasurementDate: null,
      score: 0,
      earnedBadges: []
    });
  }
}
