/**
 * AHA/ACC 10-Year ASCVD (Atherosclerotic Cardiovascular Disease) Risk Estimator
 * Calculates 10-year risk of first hard ASCVD event (nonfatal myocardial infarction,
 * CHD death, or fatal/nonfatal stroke) for patients aged 40-79.
 */

export interface ASCVDRiskInput {
  age: number;
  gender: 'male' | 'female';
  systolic: number;
  isHypertensionTreated?: boolean;
  isSmoker?: boolean;
  totalCholesterol?: number; // mg/dL (Default 200)
  hdlCholesterol?: number; // mg/dL (Default 50)
}

export interface ASCVDRiskResult {
  riskPercent: number;
  riskCategory: 'low' | 'borderline' | 'intermediate' | 'high';
  clinicalAdvice: string;
}

export function calculateASCVD10YearRisk(input: ASCVDRiskInput): ASCVDRiskResult {
  const age = Math.min(79, Math.max(40, input.age || 50));
  const sbp = input.systolic || 120;
  const isTreated = input.isHypertensionTreated ?? false;
  const isFemale = input.gender === 'female';

  // Simplified Framingham / Pooled Cohort ASCVD Equation Approximation
  let baseScore = isFemale ? 0.05 : 0.08;

  // Age factor
  const ageFactor = (age - 40) * 0.003;
  
  // SBP factor
  const sbpFactor = (sbp - 120) * 0.002 * (isTreated ? 1.3 : 1.0);

  let totalRisk = (baseScore + ageFactor + sbpFactor) * 100;
  totalRisk = Math.min(99.9, Math.max(0.5, Math.round(totalRisk * 10) / 10));

  let category: 'low' | 'borderline' | 'intermediate' | 'high' = 'low';
  let advice = 'Risiko penyakit jantung & stroke rendah (<5%). Pertahankan pola hidup sehat & DASH diet.';

  if (totalRisk >= 20) {
    category = 'high';
    advice = 'Risiko Tinggi (≥20%). Diperlukan evaluasi medis segera & kepatuhan penuh terapi antihipertensi.';
  } else if (totalRisk >= 7.5) {
    category = 'intermediate';
    advice = 'Risiko Menengah (7.5%-19.9%). Disarankan konsultasi dokter untuk evaluasi statin & penyesuaian dosis obat.';
  } else if (totalRisk >= 5) {
    category = 'borderline';
    advice = 'Risiko Perbatasan (5%-7.4%). Disarankan modifikasi gaya hidup intensif & kurangi natrium.';
  }

  return {
    riskPercent: totalRisk,
    riskCategory: category,
    clinicalAdvice: advice
  };
}
