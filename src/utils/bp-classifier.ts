/**
 * AortaLink Blood Pressure Classification Engine
 * -----------------------------------------------
 * Evaluates blood pressure readings against verified clinical practice guidelines:
 * 1. ESH 2023 / PERHI 2021 (Default for Indonesia, Hypertension >= 140/90 mmHg)
 * 2. ACC / AHA 2025 & 2017 (Stage 1 >= 130/80 mmHg, Stage 2 >= 140/90 mmHg)
 * 3. ESC 2024 (Elevated BP 120-139/70-89 mmHg, Hypertension >= 140/90 mmHg)
 *
 * Clinical Specifications & Verification (see docs/v3/CLINICAL_REVIEW.md):
 * - Rule of Category: category is determined by the HIGHEST category reached
 *   by systolic OR diastolic ("and/or").
 * - Non-integer inputs are rounded before classification (e.g. 129.5 -> 130).
 * - Separate out-of-office (HBPM) thresholds evaluated (ESH/ESC >= 135/85 mmHg).
 * - Pediatric (<18 years) explicitly excluded from adult targets.
 * - Neutral patient wording: "Tekanan darah Anda masuk rentang ...".
 */

import type { BPCategory, BPCategoryKey, BPClassificationResult, GuidelineId } from '../types/blood-pressure.ts';

export interface GuidelineMetadata {
  id: GuidelineId;
  version: string;
  name: string;
  shortName: string;
  description: string;
  hypertensionThresholdOffice: string;
  hypertensionThresholdHome: string;
  reference: string;
}

export const GUIDELINE_REGISTRY: Record<GuidelineId, GuidelineMetadata> = {
  esh_perhi: {
    id: 'esh_perhi',
    version: '2023 / PERHI 2021',
    name: 'ESH 2023 / PERHI 2021 (Standar Indonesia)',
    shortName: 'ESH / PERHI',
    description: 'Panduan European Society of Hypertension 2023 & Perhimpunan Dokter Hipertensi Indonesia (PERHI 2021). Ambang hipertensi klinik ≥140/90 mmHg, rumah ≥135/85 mmHg.',
    hypertensionThresholdOffice: '≥ 140/90 mmHg',
    hypertensionThresholdHome: '≥ 135/85 mmHg',
    reference: '2023 ESH Guidelines for the management of arterial hypertension (J Hypertens 2023) & Konsensus Penatalaksanaan Hipertensi PERHI 2021.'
  },
  acc_aha_2025: {
    id: 'acc_aha_2025',
    version: '2025 / 2017',
    name: 'ACC / AHA 2025 (American College of Cardiology)',
    shortName: 'ACC / AHA 2025',
    description: 'Panduan American College of Cardiology & American Heart Association. Ambang Stage 1 ≥130/80 mmHg, Stage 2 ≥140/90 mmHg, evaluasi risiko PREVENT.',
    hypertensionThresholdOffice: '≥ 130/80 mmHg (Stage 1), ≥ 140/90 mmHg (Stage 2)',
    hypertensionThresholdHome: '≥ 130/80 mmHg (Stage 1), ≥ 135/85 mmHg (Stage 2 eq)',
    reference: '2025 AHA/ACC Clinical Practice Guideline for the Prevention, Detection, Evaluation, and Management of High Blood Pressure in Adults.'
  },
  esc_2024: {
    id: 'esc_2024',
    version: '2024',
    name: 'ESC 2024 (European Society of Cardiology)',
    shortName: 'ESC 2024',
    description: 'Panduan European Society of Cardiology 2024. Kategori baru elevated BP 120–139/70–89 mmHg, hipertensi tetap ≥140/90 mmHg, target sistolik 120–129 mmHg.',
    hypertensionThresholdOffice: '≥ 140/90 mmHg (Elevated BP: 120–139/70–89)',
    hypertensionThresholdHome: '≥ 135/85 mmHg',
    reference: '2024 ESC Guidelines for the management of elevated blood pressure and hypertension (Eur Heart J 2024).'
  }
};

export const BP_CATEGORIES: Record<BPCategoryKey, BPCategory> = {
  optimal: {
    key: 'optimal',
    label: 'Optimal',
    labelEn: 'Optimal',
    description: 'Tekanan darah berada dalam rentang optimal (<120/<80 mmHg).',
    recommendation: 'Pertahankan gaya hidup sehat, aktivitas fisik teratur, dan pola makan bergizi seimbang.',
    colorClass: 'bg-teal-600',
    bgLightClass: 'bg-teal-50 dark:bg-teal-950/40',
    bgDarkClass: 'dark:bg-teal-950/50',
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    borderClass: 'border-teal-500/30',
    textClass: 'text-teal-600 dark:text-teal-400',
    hexColor: '#0d9488',
    iconName: 'CheckCircle2'
  },
  normal: {
    key: 'normal',
    label: 'Normal',
    labelEn: 'Normal',
    description: 'Tekanan darah berada dalam rentang normal yang sehat.',
    recommendation: 'Pertahankan pola hidup sehat, batasi konsumsi garam, dan lakukan pengukuran rutin.',
    colorClass: 'bg-emerald-500',
    bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    bgDarkClass: 'dark:bg-emerald-950/50',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    hexColor: '#10b981',
    iconName: 'CheckCircle2'
  },
  elevated: {
    key: 'elevated',
    label: 'Normal-Tinggi / Meningkat',
    labelEn: 'High-Normal / Elevated',
    description: 'Tekanan darah berada di atas batas ideal, dianjurkan pemantauan gaya hidup.',
    recommendation: 'Kurangi asupan natrium/garam, kelola stres, perbaiki pola tidur, dan jadwalkan evaluasi berkala.',
    colorClass: 'bg-amber-500',
    bgLightClass: 'bg-amber-50 dark:bg-amber-950/40',
    bgDarkClass: 'dark:bg-amber-950/50',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-600 dark:text-amber-400',
    hexColor: '#f59e0b',
    iconName: 'AlertCircle'
  },
  stage1: {
    key: 'stage1',
    label: 'Tekanan Darah Tinggi Derajat 1',
    labelEn: 'Hypertension Grade 1',
    description: 'Tekanan darah terindikasi Hipertensi Derajat 1.',
    recommendation: 'Konsultasikan dengan dokter untuk evaluasi faktor risiko kardiovaskular dan penyesuaian gaya hidup.',
    colorClass: 'bg-orange-500',
    bgLightClass: 'bg-orange-50 dark:bg-orange-950/40',
    bgDarkClass: 'dark:bg-orange-950/50',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-600 dark:text-orange-400',
    hexColor: '#f97316',
    iconName: 'AlertTriangle'
  },
  stage2: {
    key: 'stage2',
    label: 'Tekanan Darah Tinggi Derajat 2',
    labelEn: 'Hypertension Grade 2',
    description: 'Tekanan darah terindikasi Hipertensi Derajat 2.',
    recommendation: 'Sangat disarankan berkonsultasi dengan dokter untuk evaluasi klinis dan pertimbangan terapi terarah.',
    colorClass: 'bg-rose-500',
    bgLightClass: 'bg-rose-50 dark:bg-rose-950/40',
    bgDarkClass: 'dark:bg-rose-950/50',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    borderClass: 'border-rose-500/30',
    textClass: 'text-rose-600 dark:text-rose-400',
    hexColor: '#ef4444',
    iconName: 'AlertOctagon'
  },
  stage3: {
    key: 'stage3',
    label: 'Tekanan Darah Sangat Tinggi (Derajat 3)',
    labelEn: 'Hypertension Grade 3 (Severe)',
    description: 'Tekanan darah sangat tinggi (sistolik ≥180 dan/atau diastolik ≥110 mmHg).',
    recommendation: 'Bila disertai gejala bahaya (nyeri dada hebat, sesak napas, pusing berputar, lemas sesisi), segera hubungi 119/IGD.',
    colorClass: 'bg-red-700',
    bgLightClass: 'bg-red-50 dark:bg-red-950/50',
    bgDarkClass: 'dark:bg-red-950/70',
    badgeClass: 'bg-red-100 text-red-900 dark:bg-red-900/80 dark:text-red-200 border-red-300 dark:border-red-700 animate-pulse',
    borderClass: 'border-red-700/50',
    textClass: 'text-red-700 dark:text-red-300',
    hexColor: '#b91c1c',
    iconName: 'AlertOctagon'
  },
  crisis: {
    key: 'crisis',
    label: 'Tekanan Darah Sangat Tinggi / Berat',
    labelEn: 'Severe Hypertension',
    description: 'Tekanan darah berada pada level sangat tinggi (>180 dan/atau >120 mmHg).',
    recommendation: 'Bila disertai keluhan klinis mendadak, segera hubungi 119 atau kunjungi IGD terdekat. Bila tanpa gejala, istirahat dan ukur ulang.',
    colorClass: 'bg-purple-600',
    bgLightClass: 'bg-purple-50 dark:bg-purple-950/50',
    bgDarkClass: 'dark:bg-purple-950/70',
    badgeClass: 'bg-purple-100 text-purple-900 dark:bg-purple-900/80 dark:text-purple-200 border-purple-300 dark:border-purple-700 animate-pulse',
    borderClass: 'border-purple-600/50',
    textClass: 'text-purple-700 dark:text-purple-300',
    hexColor: '#be123c',
    iconName: 'Flame'
  }
};

export interface ClassifyBPOptions {
  isHomeMeasurement?: boolean;
}

/**
 * Classify blood pressure according to selectable clinical guidelines.
 * Pure function returning guideline provenance, classification category,
 * isolated systolic/diastolic flags, and neutral patient wording.
 */
export function classifyBP(
  rawSystolic: number,
  rawDiastolic: number,
  guidelineId: GuidelineId = 'esh_perhi',
  options?: ClassifyBPOptions
): BPClassificationResult {
  const guideline = GUIDELINE_REGISTRY[guidelineId] || GUIDELINE_REGISTRY.esh_perhi;
  
  // Non-integers must be rounded before classification
  const systolic = Math.round(rawSystolic);
  const diastolic = Math.round(rawDiastolic);
  const isHome = Boolean(options?.isHomeMeasurement);

  let category: BPCategory = BP_CATEGORIES.normal;
  let isIsolatedSystolic = false;
  let isIsolatedDiastolic = false;
  let isAboveHomeThreshold = false;

  if (guideline.id === 'esh_perhi') {
    // ESH 2023 / PERHI 2021 office thresholds
    // Category = highest reached by systolic OR diastolic
    isIsolatedSystolic = systolic >= 140 && diastolic < 90;
    isIsolatedDiastolic = systolic < 140 && diastolic >= 90;
    isAboveHomeThreshold = systolic >= 135 || diastolic >= 85;

    if (systolic >= 180 || diastolic >= 110) {
      category = BP_CATEGORIES.stage3;
    } else if (systolic >= 160 || diastolic >= 100) {
      category = BP_CATEGORIES.stage2;
    } else if (systolic >= 140 || diastolic >= 90) {
      category = BP_CATEGORIES.stage1;
    } else if (systolic >= 130 || diastolic >= 85) {
      category = BP_CATEGORIES.elevated;
    } else if (systolic >= 120 || diastolic >= 80) {
      category = BP_CATEGORIES.normal;
    } else {
      category = BP_CATEGORIES.optimal;
    }
  } else if (guideline.id === 'acc_aha_2025') {
    // ACC/AHA 2017 & 2025 thresholds
    isIsolatedSystolic = systolic >= 130 && diastolic < 80;
    isIsolatedDiastolic = systolic < 130 && diastolic >= 80;
    // ACC/AHA home equivalence: 130/80 is Stage 1 threshold
    isAboveHomeThreshold = systolic >= 130 || diastolic >= 80;

    if (systolic > 180 || diastolic > 120) {
      category = BP_CATEGORIES.crisis;
    } else if (systolic >= 140 || diastolic >= 90) {
      category = BP_CATEGORIES.stage2;
    } else if (systolic >= 130 || diastolic >= 80) {
      category = BP_CATEGORIES.stage1;
    } else if (systolic >= 120 && diastolic < 80) {
      category = BP_CATEGORIES.elevated;
    } else {
      category = BP_CATEGORIES.normal;
    }
  } else if (guideline.id === 'esc_2024') {
    // ESC 2024 thresholds:
    // Non-elevated: <120 and <70
    // Elevated BP: 120-139 or 70-89
    // Hypertension: >=140 or >=90
    isIsolatedSystolic = systolic >= 140 && diastolic < 90;
    isIsolatedDiastolic = systolic < 140 && diastolic >= 90;
    isAboveHomeThreshold = systolic >= 135 || diastolic >= 85;

    if (systolic >= 180 || diastolic >= 110) {
      category = BP_CATEGORIES.stage3;
    } else if (systolic >= 140 || diastolic >= 90) {
      category = BP_CATEGORIES.stage2;
    } else if ((systolic >= 120 && systolic <= 139) || (diastolic >= 70 && diastolic <= 89)) {
      category = BP_CATEGORIES.elevated;
    } else {
      category = BP_CATEGORIES.normal;
    }
  }

  const patientWording = `Tekanan darah Anda (${systolic}/${diastolic} mmHg) masuk rentang ${category.label} menurut acuan ${guideline.shortName}.`;

  return {
    ...category,
    guidelineId: guideline.id,
    guidelineVersion: guideline.version,
    guidelineName: guideline.name,
    isIsolatedSystolic,
    isIsolatedDiastolic,
    isHomeMeasurement: isHome,
    isAboveHomeThreshold,
    patientWording
  };
}

/**
 * Calculate Mean Arterial Pressure (MAP)
 * MAP = Diastolic + (Systolic - Diastolic) / 3
 */
export function calculateMAP(systolic: number, diastolic: number): number {
  return Math.round(diastolic + (systolic - diastolic) / 3);
}

/**
 * Calculate Pulse Pressure (PP)
 * PP = Systolic - Diastolic
 */
export function calculatePulsePressure(systolic: number, diastolic: number): number {
  return Math.round(systolic - diastolic);
}

/**
 * Calculate Rate Pressure Product (RPP = Systolic * Heart Rate)
 */
export function calculateRPP(systolic: number, pulse: number): number {
  return Math.round(systolic * pulse);
}

/**
 * Classify Pulse / Heart Rate
 */
export function classifyPulse(pulse: number): { label: string; status: 'normal' | 'low' | 'high'; color: string } {
  if (pulse < 60) {
    return { label: 'Lambat (Bradikardia)', status: 'low', color: 'text-amber-500' };
  }
  if (pulse > 100) {
    return { label: 'Cepat (Takikardia)', status: 'high', color: 'text-rose-500' };
  }
  return { label: 'Normal (Istirahat)', status: 'normal', color: 'text-emerald-500' };
}

export interface AgeTargetProfile {
  stratum: string;
  targetText: string;
  targetSysMin: number;
  targetSysMax: number;
  targetDiaMin: number;
  targetDiaMax: number;
  clinicalGuideline: string;
  caution: string;
  isPediatricExcluded?: boolean;
}

/**
 * Get Age-Stratified Blood Pressure Target (ESH 2023 / ACC Adult Guidelines)
 * Pediatric individuals (<18 years) are explicitly excluded from adult target formulas.
 */
export function getAgeStratifiedTarget(age: number = 45): AgeTargetProfile {
  if (age < 18) {
    return {
      stratum: 'Anak & Remaja (<18 th)',
      targetText: 'Konsultasi Sp.A (Grafik Persentil Pediatrik)',
      targetSysMin: 90,
      targetSysMax: 120,
      targetDiaMin: 60,
      targetDiaMax: 80,
      clinicalGuideline: 'Khusus Pediatrik (Di luar cakupan formula dewasa)',
      caution: 'Anak dan remaja (<18 tahun) memerlukan grafik persentil khusus berbasis jenis kelamin dan tinggi badan.',
      isPediatricExcluded: true
    };
  }
  if (age <= 39) {
    return {
      stratum: 'Dewasa Muda (18–39 th)',
      targetText: '< 130/80 mmHg (Optimal < 120/80)',
      targetSysMin: 100,
      targetSysMax: 129,
      targetDiaMin: 65,
      targetDiaMax: 79,
      clinicalGuideline: 'ESH 2023 / ACC 2025 Target Dewasa',
      caution: 'Prioritaskan gaya hidup aktif dan batasi asupan natrium.'
    };
  }
  if (age <= 64) {
    return {
      stratum: 'Dewasa Menengah (40–64 th)',
      targetText: '< 130/80 mmHg',
      targetSysMin: 105,
      targetSysMax: 129,
      targetDiaMin: 65,
      targetDiaMax: 79,
      clinicalGuideline: 'ESH 2023 Standar Dewasa',
      caution: 'Lakukan pemeriksaan berkala untuk memantau fungsi vaskular.'
    };
  }
  if (age <= 79) {
    return {
      stratum: 'Lansia (65–79 th)',
      targetText: '130–139 / 70–79 mmHg (120–129 bila ditoleransi)',
      targetSysMin: 120,
      targetSysMax: 139,
      targetDiaMin: 70,
      targetDiaMax: 79,
      clinicalGuideline: 'ESH Geriatric Guidelines',
      caution: 'Hindari penurunan diastolik berlebihan (<65 mmHg) untuk menjaga perfusi koroner.'
    };
  }
  return {
    stratum: 'Geriatri Lanjut (≥80 th)',
    targetText: '130–139 / 70–79 mmHg',
    targetSysMin: 125,
    targetSysMax: 139,
    targetDiaMin: 70,
    targetDiaMax: 79,
    clinicalGuideline: 'Geriatric Safety Target',
    caution: 'Prioritaskan pencegahan hipotensi ortostatik dan risiko jatuh saat berdiri.'
  };
}

export interface AgeAdjustedClassification {
  category: BPClassificationResult;
  isNormalForAge: boolean;
  ageStratum: string;
  ageTargetText: string;
  ageClinicalAdvice: string;
  pulsePressure: number;
  pulsePressureStatus: 'optimal' | 'normal' | 'wide' | 'narrow';
  pulsePressureNote: string;
  map: number;
  mapStatus: 'low' | 'normal' | 'high';
  rpp?: number;
  rppStatus?: 'optimal' | 'elevated' | 'high';
  isIsolatedSystolicHypertension: boolean;
}

/**
 * Evaluates blood pressure with age-stratification and hemodynamic parameters.
 * Diagnostic interpretations are omitted in favor of descriptive physiological notes.
 */
export function classifyAgeAdjustedBP(
  systolic: number,
  diastolic: number,
  age: number = 45,
  pulse?: number,
  guidelineId: GuidelineId = 'esh_perhi'
): AgeAdjustedClassification {
  const category = classifyBP(systolic, diastolic, guidelineId);
  const target = getAgeStratifiedTarget(age);
  const pp = calculatePulsePressure(systolic, diastolic);
  const map = calculateMAP(systolic, diastolic);
  const rpp = pulse ? calculateRPP(systolic, pulse) : undefined;

  // Pulse pressure assessment
  let ppStatus: 'optimal' | 'normal' | 'wide' | 'narrow' = 'normal';
  let ppNote = 'Rentang fisiologis umum (30–50 mmHg).';
  if (pp < 30) {
    ppStatus = 'narrow';
    ppNote = 'Tekanan nadi lebih sempit (<30 mmHg).';
  } else if (pp > 60) {
    ppStatus = 'wide';
    ppNote = 'Tekanan nadi lebih lebar (>60 mmHg).';
  } else if (pp <= 45) {
    ppStatus = 'optimal';
    ppNote = 'Tekanan nadi dalam batas fisiologis baik (≤45 mmHg).';
  }

  // MAP status
  let mapStatus: 'low' | 'normal' | 'high' = 'normal';
  if (map < 70) mapStatus = 'low';
  else if (map > 105) mapStatus = 'high';

  // Rate Pressure Product status
  let rppStatus: 'optimal' | 'elevated' | 'high' | undefined = undefined;
  if (rpp) {
    if (rpp < 10000) rppStatus = 'optimal';
    else if (rpp <= 12000) rppStatus = 'elevated';
    else rppStatus = 'high';
  }

  // Normal for age check
  const isNormalForAge = !target.isPediatricExcluded &&
    systolic <= target.targetSysMax &&
    diastolic <= target.targetDiaMax &&
    diastolic >= target.targetDiaMin;

  let ageClinicalAdvice = `Acuan kelompok ${target.stratum}: ${target.targetText}. `;
  if (target.isPediatricExcluded) {
    ageClinicalAdvice = target.caution;
  } else if (isNormalForAge) {
    ageClinicalAdvice += `Hasil pengukuran (${systolic}/${diastolic} mmHg) berada dalam batas yang dianjurkan.`;
  } else if (systolic > target.targetSysMax) {
    ageClinicalAdvice += `Sistolik (${systolic} mmHg) berada di atas batas acuan (${target.targetSysMax} mmHg). ${target.caution}`;
  } else if (diastolic < target.targetDiaMin) {
    ageClinicalAdvice += `Diastolik (${diastolic} mmHg) berada di bawah batas acuan (${target.targetDiaMin} mmHg). ${target.caution}`;
  }

  return {
    category,
    isNormalForAge,
    ageStratum: target.stratum,
    ageTargetText: target.targetText,
    ageClinicalAdvice,
    pulsePressure: pp,
    pulsePressureStatus: ppStatus,
    pulsePressureNote: ppNote,
    map,
    mapStatus,
    rpp,
    rppStatus,
    isIsolatedSystolicHypertension: category.isIsolatedSystolic
  };
}
