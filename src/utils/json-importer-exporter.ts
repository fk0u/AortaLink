import { db, newSyncId } from '../db';
import { replaceAllLocalData } from '../db/local-data';
import {
  BackupDataFormat,
  Profile,
  BPReading,
  Reminder,
  HabitLog,
  MedicationItem,
  MedicationLog,
  LabResult,
  FhirPatient,
  FhirObservation
} from '../types/blood-pressure';

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
    const payload = JSON.parse(jsonString) as Partial<BackupDataFormat>;
    if (!payload || typeof payload !== 'object') {
      throw new Error('Format berkas JSON tidak valid.');
    }

    const profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
    if (profiles.length === 0) {
      throw new Error('Backup JSON harus memiliki minimal 1 profil pasien.');
    }

    const readings = (Array.isArray(payload.readings) ? payload.readings : []).map((r) => ({
      ...r,
      id: typeof r.id === 'string' && r.id ? r.id : newSyncId()
    }));
    const reminders = Array.isArray(payload.reminders) ? payload.reminders : [];
    const habits = Array.isArray(payload.habits) ? payload.habits : [];
    let medications = Array.isArray(payload.medications) ? payload.medications : [];
    const medicationLogs = Array.isArray(payload.medicationLogs) ? payload.medicationLogs : [];
    const labResults = Array.isArray(payload.labResults) ? payload.labResults : [];
    let fhirPatients = Array.isArray(payload.fhirPatients) ? payload.fhirPatients : [];
    let fhirObservations = Array.isArray(payload.fhirObservations) ? payload.fhirObservations : [];

    // Auto-Upgrade v1.x payload: Generate FHIR Patients if missing
    if (fhirPatients.length === 0) {
      fhirPatients = profiles.map((p) => ({
        resourceType: 'Patient',
        id: p.id,
        identifier: [{ system: 'https://aortalink.health/fhir/sid/patient', value: p.id }],
        active: true,
        name: [{ text: p.name }],
        gender: (p.gender === 'male' || p.gender === 'female') ? p.gender : 'unknown'
      }));
    }

    // Auto-Upgrade v1.x payload: Generate FHIR Observations from readings if missing
    if (fhirObservations.length === 0 && readings.length > 0) {
      fhirObservations = readings.map((r, idx) => ({
        resourceType: 'Observation',
        id: `obs-bp-import-${r.id || idx + 1}`,
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs'
              }
            ]
          }
        ],
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '85354-9',
              display: 'Blood pressure panel with device'
            }
          ],
          text: 'Tekanan Darah Sistolik/Diastolik'
        },
        subject: { reference: `Patient/${r.profileId}` },
        effectiveDateTime: r.timestamp,
        component: [
          {
            code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] },
            valueQuantity: { value: r.systolic, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
          },
          {
            code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] },
            valueQuantity: { value: r.diastolic, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
          }
        ]
      }));
    }

    // Replaces exactly the tables this backup format carries; deletions are
    // tombstoned so the cloud doesn't resurrect them on the next sync.
    await replaceAllLocalData({
      profiles,
      readings,
      reminders,
      habits,
      medications,
      medicationLogs,
      labResults,
      fhirPatients,
      fhirObservations
    });

    const totalRecords = profiles.length + readings.length + reminders.length;
    return {
      success: true,
      recordCount: totalRecords,
      message: `Pemulihan JSON v1.1 / v2.0 Berhasil! Terpulihkan ${profiles.length} profil, ${readings.length} pengukuran tensi, dan ${reminders.length} pengingat.`
    };
  } catch (err: any) {
    return {
      success: false,
      recordCount: 0,
      message: err.message || 'Gagal memproses berkas JSON.'
    };
  }
}
