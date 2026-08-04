import { FhirObservation, FhirMedicationRequest, CircadianDippingReport, ClinicalAlert } from '../../types/blood-pressure';

export interface ClinicalSummaryRequest {
  patientName: string;
  age?: number;
  gender?: string;
  observations: FhirObservation[];
  medications: FhirMedicationRequest[];
  dippingReport?: CircadianDippingReport;
  activeAlerts?: ClinicalAlert[];
}

export interface ClinicalSummaryResponse {
  summaryTitle: string;
  executiveSummary: string;
  structuredPrompt: string;
  clinicalRecommendations: string[];
  keyRiskFactors: string[];
  generatedAt: string;
}

export class ClinicalSummarizer {
  /**
   * Transforms raw FHIR observations and patient data into a structured AI prompt and clinical summary.
   */
  public summarize(request: ClinicalSummaryRequest): ClinicalSummaryResponse {
    const { patientName, age, gender, observations, medications, dippingReport, activeAlerts } = request;

    // Separate vital signs and lab observations
    const bpObservations = observations.filter(
      (o) => o.code.coding.some((c) => c.code === '85354-9') || o.component?.length
    );
    const labObservations = observations.filter(
      (o) => o.code.coding.some((c) => ['3084-1', '2160-0', '14927-8'].includes(c.code))
    );

    const bpCount = bpObservations.length;
    const labCount = labObservations.length;
    const medCount = medications.length;

    const medNames = medications.map((m) => m.medicationCodeableConcept.text || 'Medication').join(', ');
    const alertList = activeAlerts?.map((a) => `[${a.severity.toUpperCase()}] ${a.title}: ${a.message}`).join('\n') || 'Tidak ada alert aktif.';

    const structuredPrompt = `
[SYSTEM PROMPT - AORTALINK CLINICAL DECISION SUPPORT SYSTEM (CDSS)]
Role: Specialist Internal Medicine (Sp.PD) & Cardiovascular Risk Assessor
Patient: ${patientName} (${age || '--'} thn, ${gender || 'Unspecified'})

[FHIR R4 VITAL SIGNS DATASET]
Total Observations: ${bpCount} BP records
Circadian Pattern: ${dippingReport ? `${dippingReport.label} (${dippingReport.sysDippingPercent.toFixed(1)}% Sys Drop)` : 'Insufficient circadian data'}
Daytime Avg: ${dippingReport ? `${dippingReport.daytimeAvgSystolic.toFixed(0)}/${dippingReport.daytimeAvgDiastolic.toFixed(0)} mmHg` : '--'}
Nighttime Avg: ${dippingReport ? `${dippingReport.nighttimeAvgSystolic.toFixed(0)}/${dippingReport.nighttimeAvgDiastolic.toFixed(0)} mmHg` : '--'}

[FHIR R4 LAB PARAMETERS & MEDICATION REGIMEN]
Total Secondary Lab Observations: ${labCount} records
Current Regimen: ${medNames || 'Belum ada regimen obat terdaftar'}

[ACTIVE CLINICAL ALERTS & RISK FLAGS]
${alertList}

[INSTRUCTION FOR LLM]
Berdasarkan data FHIR R4 di atas, berikan evaluasi klinis komprehensif, analisis risiko kardiovaskular 10-tahun, rekomendasi penyesuaian dosis kombinasi terapi (CCB/ARB), dan proteksi fungsi ginjal.
`.trim();

    const executiveSummary = `Pasien ${patientName} memiliki ${bpCount} data pengukuran tensi FHIR R4. ${
      dippingReport ? `Pola sirkadian teridentifikasi sebagai ${dippingReport.label} dengan penurunan sistolik malam ${dippingReport.sysDippingPercent.toFixed(1)}%.` : ''
    } ${medCount > 0 ? `Regimen obat saat ini: ${medNames}.` : 'Belum ada kombinasi terapi terdaftar.'}`;

    const keyRiskFactors: string[] = [];
    if (dippingReport?.pattern === 'non_dipper' || dippingReport?.pattern === 'riser') {
      keyRiskFactors.push('Gangguan Ritme Sirkadian (Non-Dipper / Riser) - Risiko tinggi Hipertensi Nocturnal & Hipertrofi Ventrikel Kiri (LVH).');
    }
    if (activeAlerts?.some((a) => a.category === 'hyperuricemia')) {
      keyRiskFactors.push('Hiperurisemia (> 7.0 mg/dL) - Risiko Artritis Gout & Kerusakan Tubulus Ginjal.');
    }
    if (activeAlerts?.some((a) => a.category === 'renal_impairment')) {
      keyRiskFactors.push('Penurunan Fungsi Clearance Ginjal (Ureum/Kreatinin Meningkat).');
    }

    const clinicalRecommendations: string[] = [
      'Lanjutkan pemantauan tensi mandiri (HBPM) di rumah untuk memvalidasi White-Coat Syndrome.',
      'Jaga kepatuhan konsumsi kombinasi terapi (CCB Pagi + ARB Malam) secara teratur.',
      'Lakukan evaluasi berkala fungsi ginjal (Ureum, Kreatinin) & Asam Urat darah tiap 3–6 bulan.'
    ];

    return {
      summaryTitle: `Laporan Ringkasan Klinis EHR — ${patientName}`,
      executiveSummary,
      structuredPrompt,
      clinicalRecommendations,
      keyRiskFactors,
      generatedAt: new Date().toISOString()
    };
  }
}

export const clinicalSummarizer = new ClinicalSummarizer();
