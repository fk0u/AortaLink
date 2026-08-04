import { AscvdProfile } from '../types/blood-pressure';

/**
 * ASCVD Risk Calculator — Pooled Cohort Equations (ACC/AHA 2013)
 * 
 * Implementasi open-source formula Pooled Cohort Equations untuk estimasi
 * risiko kardiovaskular aterosklerotik (ASCVD) 10 tahun ke depan.
 * 
 * Referensi: Goff DC Jr, et al. 2013 ACC/AHA Guideline on the Assessment of
 * Cardiovascular Risk. J Am Coll Cardiol. 2014;63(25 Pt B):2935-2959.
 * 
 * Formula ini digunakan untuk individu usia 40-79 tahun tanpa riwayat ASCVD sebelumnya.
 */

interface AscvdInput {
  age: number;
  gender: 'male' | 'female';
  race: 'white' | 'african_american' | 'other';
  totalCholesterol: number;   // mg/dL
  hdlCholesterol: number;     // mg/dL
  systolicBP: number;         // mmHg
  onBPTreatment: boolean;
  diabetes: boolean;
  smoker: boolean;
}

interface AscvdResult {
  riskPercent: number;
  riskLevel: 'low' | 'borderline' | 'intermediate' | 'high';
  riskLabel: string;
  riskDescription: string;
  clinicalAdvice: string;
}

/**
 * Pooled Cohort Equations coefficients
 * Source: 2013 ACC/AHA Guideline, Table A
 */

// White Female coefficients
const WF_COEFS = {
  lnAge: -29.799,
  lnAge2: 4.884,
  lnTC: 13.540,
  lnAgeLnTC: -3.114,
  lnHDL: -13.578,
  lnAgeLnHDL: 3.149,
  lnTreatedSBP: 2.019,
  lnUntreatedSBP: 1.957,
  lnAgeLnTreatedSBP: 0,
  lnAgeLnUntreatedSBP: 0,
  smoker: 7.574,
  lnAgeSmoker: -1.665,
  diabetes: 0.661,
  baseline: 0.9665,
  meanCoef: -29.18
};

// White Male coefficients
const WM_COEFS = {
  lnAge: 12.344,
  lnAge2: 0,
  lnTC: 11.853,
  lnAgeLnTC: -2.664,
  lnHDL: -7.990,
  lnAgeLnHDL: 1.769,
  lnTreatedSBP: 1.797,
  lnUntreatedSBP: 1.764,
  lnAgeLnTreatedSBP: 0,
  lnAgeLnUntreatedSBP: 0,
  smoker: 7.837,
  lnAgeSmoker: -1.795,
  diabetes: 0.658,
  baseline: 0.9144,
  meanCoef: 61.18
};

// African American Female coefficients
const AAF_COEFS = {
  lnAge: 17.114,
  lnAge2: 0,
  lnTC: 0.940,
  lnAgeLnTC: 0,
  lnHDL: -18.920,
  lnAgeLnHDL: 4.475,
  lnTreatedSBP: 29.291,
  lnUntreatedSBP: 27.820,
  lnAgeLnTreatedSBP: -6.432,
  lnAgeLnUntreatedSBP: -6.087,
  smoker: 0.691,
  lnAgeSmoker: 0,
  diabetes: 0.874,
  baseline: 0.9533,
  meanCoef: 86.61
};

// African American Male coefficients
const AAM_COEFS = {
  lnAge: 2.469,
  lnAge2: 0,
  lnTC: 0.302,
  lnAgeLnTC: 0,
  lnHDL: -0.307,
  lnAgeLnHDL: 0,
  lnTreatedSBP: 1.916,
  lnUntreatedSBP: 1.809,
  lnAgeLnTreatedSBP: 0,
  lnAgeLnUntreatedSBP: 0,
  smoker: 0.549,
  lnAgeSmoker: 0,
  diabetes: 0.645,
  baseline: 0.8954,
  meanCoef: 19.54
};

function getCoefficients(gender: 'male' | 'female', race: 'white' | 'african_american' | 'other') {
  if (gender === 'female') {
    return race === 'african_american' ? AAF_COEFS : WF_COEFS;
  }
  return race === 'african_american' ? AAM_COEFS : WM_COEFS;
}

/**
 * Calculate the 10-year ASCVD risk using Pooled Cohort Equations
 */
export function calculateAscvdRisk(input: AscvdInput): AscvdResult {
  // Validate input ranges
  if (input.age < 40 || input.age > 79) {
    return {
      riskPercent: -1,
      riskLevel: 'low',
      riskLabel: 'Di Luar Rentang Usia',
      riskDescription: 'Formula PCE valid untuk usia 40-79 tahun. Usia di luar rentang ini tidak dapat dievaluasi dengan akurat.',
      clinicalAdvice: 'Konsultasikan dengan dokter spesialis jantung untuk evaluasi risiko individual.'
    };
  }

  const c = getCoefficients(input.gender, input.race);

  const lnAge = Math.log(input.age);
  const lnTC = Math.log(input.totalCholesterol);
  const lnHDL = Math.log(input.hdlCholesterol);
  const lnSBP = Math.log(input.systolicBP);

  let sum = 0;
  sum += c.lnAge * lnAge;
  sum += c.lnAge2 * lnAge * lnAge;
  sum += c.lnTC * lnTC;
  sum += c.lnAgeLnTC * lnAge * lnTC;
  sum += c.lnHDL * lnHDL;
  sum += c.lnAgeLnHDL * lnAge * lnHDL;

  if (input.onBPTreatment) {
    sum += c.lnTreatedSBP * lnSBP;
    sum += c.lnAgeLnTreatedSBP * lnAge * lnSBP;
  } else {
    sum += c.lnUntreatedSBP * lnSBP;
    sum += c.lnAgeLnUntreatedSBP * lnAge * lnSBP;
  }

  if (input.smoker) {
    sum += c.smoker;
    sum += c.lnAgeSmoker * lnAge;
  }

  if (input.diabetes) {
    sum += c.diabetes;
  }

  // 10-year risk: 1 - S0^exp(sum - meanCoef)
  const exponent = sum - c.meanCoef;
  const risk = 1 - Math.pow(c.baseline, Math.exp(exponent));
  const riskPercent = Math.round(risk * 1000) / 10; // 1 decimal place
  const clampedRisk = Math.max(0, Math.min(100, riskPercent));

  // Risk classification per ACC/AHA 2019 guidelines
  let riskLevel: AscvdResult['riskLevel'];
  let riskLabel: string;
  let riskDescription: string;
  let clinicalAdvice: string;

  if (clampedRisk < 5) {
    riskLevel = 'low';
    riskLabel = 'Risiko Rendah';
    riskDescription = 'Risiko serangan jantung atau stroke dalam 10 tahun ke depan relatif rendah (<5%).';
    clinicalAdvice = 'Pertahankan gaya hidup sehat: diet rendah garam, olahraga teratur, tidak merokok. Lakukan pemeriksaan tensi dan kolesterol rutin setiap tahun.';
  } else if (clampedRisk < 7.5) {
    riskLevel = 'borderline';
    riskLabel = 'Risiko Perbatasan';
    riskDescription = 'Risiko ASCVD 10 tahun berada di zona perbatasan (5-7.5%). Perlu perhatian lebih terhadap faktor risiko.';
    clinicalAdvice = 'Diskusikan dengan dokter tentang risk-enhancing factors (riwayat keluarga, CRP, kalsium koroner). Modifikasi gaya hidup direkomendasikan.';
  } else if (clampedRisk < 20) {
    riskLevel = 'intermediate';
    riskLabel = 'Risiko Menengah';
    riskDescription = 'Risiko ASCVD 10 tahun tergolong menengah (7.5-20%). Perlu evaluasi tambahan dan diskusi terapi statin.';
    clinicalAdvice = 'Pertimbangan kuat terapi statin intensitas sedang. Evaluasi CT Kalsium Koroner untuk personalisasi keputusan. Kontrol tekanan darah ketat (<130/80 mmHg).';
  } else {
    riskLevel = 'high';
    riskLabel = 'Risiko Tinggi';
    riskDescription = 'Risiko ASCVD 10 tahun tinggi (≥20%). Memerlukan intervensi farmakologis agresif.';
    clinicalAdvice = 'SEGERA konsultasi dokter spesialis jantung. Direkomendasikan terapi statin intensitas tinggi + kontrol tekanan darah agresif (<130/80 mmHg). Evaluasi potensi terapi antiplatelet (Aspirin).';
  }

  return {
    riskPercent: clampedRisk,
    riskLevel,
    riskLabel,
    riskDescription,
    clinicalAdvice
  };
}

/**
 * Build AscvdProfile record to persist into Dexie/MongoDB
 */
export function buildAscvdRecord(
  input: AscvdInput,
  result: AscvdResult,
  profileId: string
): Omit<AscvdProfile, 'id'> {
  return {
    profileId,
    timestamp: new Date().toISOString(),
    age: input.age,
    gender: input.gender,
    race: input.race,
    totalCholesterol: input.totalCholesterol,
    hdlCholesterol: input.hdlCholesterol,
    systolicBP: input.systolicBP,
    onBPTreatment: input.onBPTreatment,
    diabetes: input.diabetes,
    smoker: input.smoker,
    riskPercent: result.riskPercent,
    riskLevel: result.riskLevel
  };
}
