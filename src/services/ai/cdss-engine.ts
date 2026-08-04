import { clinicalSummarizer, ClinicalSummaryRequest, ClinicalSummaryResponse } from './clinical-summarizer';
import { predictiveAlertEngine, AnomalyDetectionResult } from './predictive-alert';
import { BPReading, LabResult, Profile } from '../../types/blood-pressure';
import { convertReadingToFHIR, convertLabResultToFHIR, convertMedicationToFHIR } from '../fhir/fhir-exporter';
import { db } from '../../db';

export interface CdssAssessmentResult {
  summary: ClinicalSummaryResponse;
  trendAnalysis: AnomalyDetectionResult;
  fhirCount: number;
  evaluatedAt: string;
}

export class CdssEngine {
  /**
   * Complete AI Clinical Decision Support System assessment pipeline.
   * Converts local state/db entries into HL7 FHIR R4 resources, runs anomaly trend analysis,
   * and builds a structured clinical summary prompt for physician evaluation.
   */
  public async evaluatePatient(profileId: string, profile?: Profile): Promise<CdssAssessmentResult> {
    // 1. Fetch patient data from local Dexie database
    const [readings, labs, medications] = await Promise.all([
      db.readings.where('profileId').equals(profileId).toArray(),
      db.labResults.where('profileId').equals(profileId).toArray(),
      db.medications.where('profileId').equals(profileId).toArray()
    ]);

    // 2. Convert to HL7 FHIR R4 Observation & MedicationRequest resources
    const fhirBpObs = readings.map((r) => convertReadingToFHIR(r, profile));
    const fhirLabObs = labs.flatMap((l) => convertLabResultToFHIR(l, profile));
    const fhirMeds = medications.map((m) => convertMedicationToFHIR(m, profile));

    const allFhirObs = [...fhirBpObs, ...fhirLabObs];

    // 3. Run predictive trend analysis
    const trendAnalysis = predictiveAlertEngine.analyzeTrends(readings, labs);

    // 4. Run clinical summarizer
    const summary = clinicalSummarizer.summarize({
      patientName: profile?.name || 'Pasien',
      age: profile?.age,
      gender: profile?.gender,
      observations: allFhirObs,
      medications: fhirMeds,
      dippingReport: trendAnalysis.dippingReport,
      activeAlerts: trendAnalysis.alerts
    });

    return {
      summary,
      trendAnalysis,
      fhirCount: allFhirObs.length + fhirMeds.length,
      evaluatedAt: new Date().toISOString()
    };
  }
}

export const cdssEngine = new CdssEngine();
