import { db } from '../db';
import { BackupDataFormat, Profile, BPReading, Reminder, HabitLog, MedicationItem, MedicationLog, LabResult, FhirPatient, FhirObservation } from '../types/blood-pressure';

export function createAortaLinkJsonFilename(exportedAt = new Date()): string {
  const stamp = exportedAt.toISOString().slice(0, 10);
  return `aortalink-ehr-backup-${stamp}.json`;
}

export async function exportFullAortaLinkJsonPayload(): Promise<BackupDataFormat> {
  const [profiles, readings, reminders, habits, medications, medicationLogs, labResults, fhirPatients, fhirObservations] = await Promise.all([
    db.profiles.toArray(),
    db.readings.toArray(),
    db.reminders.toArray(),
    db.habits.toArray(),
    db.medications.toArray(),
    db.medicationLogs.toArray(),
    db.labResults.toArray(),
    db.fhirPatients.toArray(),
    db.fhirObservations.toArray()
  ]);

  return {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    profiles,
    readings,
    reminders,
    habits,
    medications,
    medicationLogs,
    labResults,
    fhirPatients,
    fhirObservations
  };
}

export function downloadJsonBlob(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function restoreAortaLinkJsonPayload(jsonString: string): Promise<{ success: boolean; recordCount: number; message: string }> {
  try {
    const payload = JSON.parse(jsonString) as BackupDataFormat;
    if (!payload || typeof payload !== 'object') {
      throw new Error('Format berkas JSON tidak valid.');
    }

    const profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
    if (profiles.length === 0) {
      throw new Error('Backup JSON harus memiliki minimal 1 profil pasien.');
    }

    const readings = Array.isArray(payload.readings) ? payload.readings : [];
    const reminders = Array.isArray(payload.reminders) ? payload.reminders : [];
    const habits = Array.isArray(payload.habits) ? payload.habits : [];
    const medications = Array.isArray(payload.medications) ? payload.medications : [];
    const medicationLogs = Array.isArray(payload.medicationLogs) ? payload.medicationLogs : [];
    const labResults = Array.isArray(payload.labResults) ? payload.labResults : [];
    const fhirPatients = Array.isArray(payload.fhirPatients) ? payload.fhirPatients : [];
    const fhirObservations = Array.isArray(payload.fhirObservations) ? payload.fhirObservations : [];

    await db.transaction(
      'rw',
      [
        db.profiles,
        db.readings,
        db.reminders,
        db.habits,
        db.medications,
        db.medicationLogs,
        db.labResults,
        db.fhirPatients,
        db.fhirObservations
      ],
      async () => {
        await Promise.all([
          db.profiles.clear(),
          db.readings.clear(),
          db.reminders.clear(),
          db.habits.clear(),
          db.medications.clear(),
          db.medicationLogs.clear(),
          db.labResults.clear(),
          db.fhirPatients.clear(),
          db.fhirObservations.clear()
        ]);

        await Promise.all([
          db.profiles.bulkPut(profiles),
          db.readings.bulkPut(readings),
          db.reminders.bulkPut(reminders),
          db.habits.bulkPut(habits),
          db.medications.bulkPut(medications),
          db.medicationLogs.bulkPut(medicationLogs),
          db.labResults.bulkPut(labResults),
          db.fhirPatients.bulkPut(fhirPatients),
          db.fhirObservations.bulkPut(fhirObservations)
        ]);
      }
    );

    const totalRecords = profiles.length + readings.length + medications.length + labResults.length;
    return {
      success: true,
      recordCount: totalRecords,
      message: `Pemulihan JSON berhasil! Terpulihkan ${totalRecords} catatan EHR.`
    };
  } catch (err: any) {
    return {
      success: false,
      recordCount: 0,
      message: err.message || 'Gagal memproses berkas JSON.'
    };
  }
}
