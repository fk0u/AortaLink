import Dexie, { type Table } from 'dexie';
import { Profile, BPReading, Reminder, HabitLog, GamificationState, SodiumLog, SleepLog, MedicationLog, MedicationItem, LabResult, FhirPatient, FhirObservation, FhirMedicationRequest, FhirMedicationStatement, AscvdProfile, ClinicalNote } from '../types/blood-pressure';

export class AortaLinkDatabase extends Dexie {
  profiles!: Table<Profile, string>;
  readings!: Table<BPReading, number>;
  reminders!: Table<Reminder, number>;
  habits!: Table<HabitLog, number>;
  gamification!: Table<GamificationState, 'current'>;
  sodiumLogs!: Table<SodiumLog, number>;
  sleepLogs!: Table<SleepLog, number>;
  medicationLogs!: Table<MedicationLog, number>;
  medications!: Table<MedicationItem, number>;
  labResults!: Table<LabResult, number>;

  // HL7 FHIR R4 Core Stores
  fhirPatients!: Table<FhirPatient, string>;
  fhirObservations!: Table<FhirObservation, string>;
  fhirMedicationRequests!: Table<FhirMedicationRequest, string>;
  fhirMedicationStatements!: Table<FhirMedicationStatement, string>;

  // V7: Clinical Features
  ascvdProfiles!: Table<AscvdProfile, number>;
  clinicalNotes!: Table<ClinicalNote, number>;

  constructor() {
    super('AortaLinkDB');
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

    this.version(5).stores({
      profiles: 'id, name, relationship, isDefault, createdAt',
      readings: '++id, profileId, timestamp, systolic, diastolic, pulse, measurement_context',
      reminders: '++id, profileId, type, time, enabled',
      habits: '++id, profileId, date, timestamp',
      gamification: 'id, streak, longestStreak, lastMeasurementDate, score, earnedBadges',
      sodiumLogs: '++id, profileId, date',
      sleepLogs: '++id, profileId, date',
      medications: '++id, profileId, name, schedule',
      medicationLogs: '++id, profileId, medicationId, takenAt',
      labResults: '++id, profileId, timestamp'
    });

    // Version 6: HL7 FHIR R4 Resource Integration
    this.version(6).stores({
      profiles: 'id, name, relationship, isDefault, createdAt',
      readings: '++id, profileId, timestamp, systolic, diastolic, pulse, measurement_context',
      reminders: '++id, profileId, type, time, enabled',
      habits: '++id, profileId, date, timestamp',
      gamification: 'id, streak, longestStreak, lastMeasurementDate, score, earnedBadges',
      sodiumLogs: '++id, profileId, date',
      sleepLogs: '++id, profileId, date',
      medications: '++id, profileId, name, schedule',
      medicationLogs: '++id, profileId, medicationId, takenAt',
      labResults: '++id, profileId, timestamp',
      fhirPatients: 'id, active',
      fhirObservations: 'id, profileId, status, effectiveDateTime',
      fhirMedicationRequests: 'id, profileId, status, intent',
      fhirMedicationStatements: 'id, profileId, status, effectiveDateTime'
    });

    // Version 7: ASCVD Risk Calculator & Clinical Notes Journal
    this.version(7).stores({
      profiles: 'id, name, relationship, isDefault, createdAt',
      readings: '++id, profileId, timestamp, systolic, diastolic, pulse, measurement_context',
      reminders: '++id, profileId, type, time, enabled',
      habits: '++id, profileId, date, timestamp',
      gamification: 'id, streak, longestStreak, lastMeasurementDate, score, earnedBadges',
      sodiumLogs: '++id, profileId, date',
      sleepLogs: '++id, profileId, date',
      medications: '++id, profileId, name, schedule',
      medicationLogs: '++id, profileId, medicationId, takenAt',
      labResults: '++id, profileId, timestamp',
      fhirPatients: 'id, active',
      fhirObservations: 'id, profileId, status, effectiveDateTime',
      fhirMedicationRequests: 'id, profileId, status, intent',
      fhirMedicationStatements: 'id, profileId, status, effectiveDateTime',
      ascvdProfiles: '++id, profileId, timestamp',
      clinicalNotes: '++id, profileId, timestamp'
    });
  }
}

// Backward compatibility alias
export const HeartSyncDatabase = AortaLinkDatabase;

export const db = new AortaLinkDatabase();

/**
 * Initialize fresh database with default profile, clinical medication regimen, and FHIR R4 seeds.
 */
export async function seedInitialData() {
  const defaultProfileId = 'profile-self-default';
  const profileCount = await db.profiles.count();
  
  if (profileCount === 0) {
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

  // Inject default clinical medication regimen if empty
  const medicationCount = await db.medications.count();
  if (medicationCount === 0) {
    const defaultMedications: Omit<MedicationItem, 'id'>[] = [
      {
        profileId: defaultProfileId,
        name: 'Amlodipine',
        dosage: '5mg',
        drugClass: 'Golongan CCB',
        schedule: 'pagi',
        purpose: 'Meredam lonjakan tensi saat aktivitas (Jadwal Pagi)',
        createdAt: new Date().toISOString()
      },
      {
        profileId: defaultProfileId,
        name: 'Candesartan',
        dosage: '8mg',
        drugClass: 'Golongan ARB',
        schedule: 'malam',
        purpose: 'Proteksi organ & mengatur ritme dipping saat tidur (Jadwal Malam)',
        createdAt: new Date().toISOString()
      },
      {
        profileId: defaultProfileId,
        name: 'Allopurinol',
        dosage: '100mg',
        drugClass: 'Penurun Asam Urat',
        schedule: 'pagi',
        purpose: 'Penurun kadar asam urat darah (Renal & Gout Protection)',
        createdAt: new Date().toISOString()
      }
    ];

    await db.medications.bulkAdd(defaultMedications as MedicationItem[]);
  }

  // Inject default FHIR Patient Resource
  const fhirPatientCount = await db.fhirPatients.count();
  if (fhirPatientCount === 0) {
    const defaultFhirPatient: FhirPatient = {
      resourceType: 'Patient',
      id: defaultProfileId,
      meta: {
        lastUpdated: new Date().toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/Patient']
      },
      active: true,
      name: [{
        use: 'official',
        text: 'Saya',
        family: 'Pengguna',
        given: ['AortaLink']
      }]
    };
    await db.fhirPatients.put(defaultFhirPatient);
  }
}
