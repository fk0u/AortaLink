import { db, newSyncId } from '../db';
import { replaceAllLocalData } from '../db/local-data';
import { validateBPRange } from '../security/sanitizer';
import {
  BackupDataFormat,
  Profile,
  BPReading,
  Reminder,
  HabitLog,
  MedicationItem,
  MedicationLog,
  LabResult,
  ConditionItem,
  FamilyMemberHistoryItem,
  ImmunizationItem,
  DiagnosticReportItem
} from '../types/blood-pressure';
import {
  entitiesToFhirBundle,
  fhirBundleToEntities
} from '../services/fhir/fhir-contract-adapters';
import type { FHIRBundleResource } from '../services/fhir/fhir-exporter';

export function createAortaLinkJsonFilename(exportedAt = new Date()): string {
  const stamp = exportedAt.toISOString().slice(0, 10);
  return `aortalink-ehr-backup-${stamp}.json`;
}

export async function exportFullAortaLinkJsonPayload(): Promise<BackupDataFormat> {
  const [
    profiles,
    readings,
    reminders,
    habits,
    medications,
    medicationLogs,
    labResults,
    conditions,
    familyHistory,
    immunizations,
    diagnosticReports
  ] = await Promise.all([
    db.profiles.toArray(),
    db.readings.toArray(),
    db.reminders.toArray(),
    db.habits.toArray(),
    db.medications.toArray(),
    db.medicationLogs.toArray(),
    db.labResults.toArray(),
    db.conditions.toArray(),
    db.familyHistory.toArray(),
    db.immunizations.toArray(),
    db.diagnosticReports.toArray()
  ]);

  const fhirBundle = entitiesToFhirBundle({
    profiles,
    readings,
    labResults,
    medications,
    conditions,
    familyHistory,
    immunizations,
    diagnosticReports
  });

  return {
    version: '3.0.0',
    exportedAt: new Date().toISOString(),
    profiles,
    readings,
    reminders,
    habits,
    medications,
    medicationLogs,
    labResults,
    conditions,
    familyHistory,
    immunizations,
    diagnosticReports,
    fhirBundle
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
    const rawParsed = JSON.parse(jsonString);
    if (!rawParsed || typeof rawParsed !== 'object') {
      throw new Error('Format berkas JSON tidak valid.');
    }

    // Direct HL7 FHIR R4 Bundle Import Support
    const isDirectFhirBundle = rawParsed.resourceType === 'Bundle' && Array.isArray(rawParsed.entry);
    const bundleToRestore: FHIRBundleResource | null = isDirectFhirBundle
      ? (rawParsed as FHIRBundleResource)
      : (rawParsed.fhirBundle && rawParsed.fhirBundle.resourceType === 'Bundle' ? rawParsed.fhirBundle : null);

    if (bundleToRestore) {
      const extracted = fhirBundleToEntities(bundleToRestore);
      const profiles = extracted.profiles || [];
      if (profiles.length === 0) {
        throw new Error('Bundle FHIR R4 harus memiliki minimal 1 resource Patient.');
      }

      const readings = (extracted.readings || []).filter(
        (r) => r && validateBPRange(r.systolic, r.diastolic, r.pulse).valid
      );

      const localDataToReplace: any = {
        profiles,
        readings,
        medications: extracted.medications || [],
        labResults: extracted.labResults || [],
        conditions: extracted.conditions || [],
        familyHistory: extracted.familyHistory || [],
        immunizations: extracted.immunizations || [],
        diagnosticReports: extracted.diagnosticReports || []
      };
      if (Array.isArray(rawParsed.reminders)) localDataToReplace.reminders = rawParsed.reminders;
      if (Array.isArray(rawParsed.habits)) localDataToReplace.habits = rawParsed.habits;
      if (Array.isArray(rawParsed.medicationLogs)) localDataToReplace.medicationLogs = rawParsed.medicationLogs;

      await replaceAllLocalData(localDataToReplace);

      const total =
        profiles.length +
        readings.length +
        (extracted.medications?.length || 0) +
        (extracted.labResults?.length || 0) +
        (extracted.conditions?.length || 0) +
        (extracted.familyHistory?.length || 0) +
        (extracted.immunizations?.length || 0) +
        (extracted.diagnosticReports?.length || 0);

      return {
        success: true,
        recordCount: total,
        message: `Impor HL7 FHIR R4 Bundle berhasil! ${profiles.length} profil, ${readings.length} data tensi, ${extracted.medications?.length || 0} obat, ${extracted.labResults?.length || 0} hasil lab, ${extracted.conditions?.length || 0} riwayat/kondisi klinis, dan ${extracted.diagnosticReports?.length || 0} laporan radiologi/imaging dipulihkan.`
      };
    }

    // Standard Backup JSON Restore
    const payload = rawParsed as Partial<BackupDataFormat>;
    const profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
    if (profiles.length === 0) {
      throw new Error('Backup JSON harus memiliki minimal 1 profil pasien.');
    }

    const rawReadings = Array.isArray(payload.readings) ? payload.readings : [];
    const validRawReadings = rawReadings.filter(
      (r) => r && typeof r === 'object' && validateBPRange(r.systolic, r.diastolic, r.pulse).valid
    );
    const discardedReadingsCount = rawReadings.length - validRawReadings.length;
    const readings = validRawReadings.map((r) => ({
      ...r,
      id: typeof r.id === 'string' && r.id ? r.id : newSyncId()
    }));
    const reminders = Array.isArray(payload.reminders) ? payload.reminders : [];
    const habits = Array.isArray(payload.habits) ? payload.habits : [];
    const medications = Array.isArray(payload.medications) ? payload.medications : [];
    const medicationLogs = Array.isArray(payload.medicationLogs) ? payload.medicationLogs : [];
    const labResults = Array.isArray(payload.labResults) ? payload.labResults : [];
    const conditions = Array.isArray(payload.conditions) ? payload.conditions : [];
    const familyHistory = Array.isArray(payload.familyHistory) ? payload.familyHistory : [];
    const immunizations = Array.isArray(payload.immunizations) ? payload.immunizations : [];
    const diagnosticReports = Array.isArray(payload.diagnosticReports) ? payload.diagnosticReports : [];

    await replaceAllLocalData({
      profiles,
      readings,
      reminders,
      habits,
      medications,
      medicationLogs,
      labResults,
      conditions,
      familyHistory,
      immunizations,
      diagnosticReports
    });

    const totalRecords = profiles.length + readings.length + reminders.length + conditions.length + diagnosticReports.length;
    const discardedMsg = discardedReadingsCount > 0 ? ` (${discardedReadingsCount} data tensi tidak valid diabaikan)` : '';
    return {
      success: true,
      recordCount: totalRecords,
      message: `Pemulihan JSON v3.0 Berhasil! Terpulihkan ${profiles.length} profil, ${readings.length} pengukuran tensi${discardedMsg}, ${conditions.length} kondisi klinis, ${diagnosticReports.length} laporan radiologi, dan ${reminders.length} pengingat.`
    };
  } catch (err: any) {
    return {
      success: false,
      recordCount: 0,
      message: err.message || 'Gagal memproses berkas JSON.'
    };
  }
}
