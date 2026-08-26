import { BPCategory, BPCategoryKey } from '../types/blood-pressure';

export const BP_CATEGORIES: Record<BPCategoryKey, BPCategory> = {
  normal: {
    key: 'normal',
    label: 'Normal',
    labelEn: 'Normal',
    description: 'Tekanan darah berada dalam rentang ideal yang sehat.',
    recommendation: 'Pertahankan gaya hidup sehat, konsumsi makanan bergizi, dan tetap aktif berolahraga.',
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
    label: 'Meningkat (Pre-Hipertensi)',
    labelEn: 'Elevated',
    description: 'Tekanan darah cenderung lebih tinggi dari batas normal ideal.',
    recommendation: 'Kurangi asupan garam, hindari stres, tingkatkan aktivitas fisik, dan evaluasi pola tidur.',
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
    label: 'Hipertensi Tahap 1',
    labelEn: 'Hypertension Stage 1',
    description: 'Tekanan darah terindikasi Hipertensi Ringan.',
    recommendation: 'Konsultasikan dengan dokter, ubah pola makan (diet DASH), kurangi garam, dan lakukan pengukuran rutin.',
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
    label: 'Hipertensi Tahap 2',
    labelEn: 'Hypertension Stage 2',
    description: 'Tekanan darah terindikasi Hipertensi Sedang hingga Berat.',
    recommendation: 'Sangat disarankan segera berkonsultasi ke dokter untuk penanganan medis dan evaluasi obat.',
    colorClass: 'bg-rose-500',
    bgLightClass: 'bg-rose-50 dark:bg-rose-950/40',
    bgDarkClass: 'dark:bg-rose-950/50',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    borderClass: 'border-rose-500/30',
    textClass: 'text-rose-600 dark:text-rose-400',
    hexColor: '#ef4444',
    iconName: 'AlertOctagon'
  },
  crisis: {
    key: 'crisis',
    label: 'Krisis Hipertensi',
    labelEn: 'Hypertensive Crisis',
    description: 'PERINGATAN: Tekanan darah sangat tinggi dan membahayakan keselamatan!',
    recommendation: 'SEGERA HUBUNGI DOKTER ATAU FASILITAS KESEHATAN TERDEKAT (IGD)! Istirahat total dan jangan panik.',
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

/**
 * Classify Blood Pressure according to AHA / WHO guidelines
 */
export function classifyBP(systolic: number, diastolic: number): BPCategory {
  if (systolic > 180 || diastolic > 120) {
    return BP_CATEGORIES.crisis;
  }
  if (systolic >= 140 || diastolic >= 90) {
    return BP_CATEGORIES.stage2;
  }
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) {
    return BP_CATEGORIES.stage1;
  }
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) {
    return BP_CATEGORIES.elevated;
  }
  return BP_CATEGORIES.normal;
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
 * Measures myocardial oxygen consumption (MVO2)
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
}

/**
 * Get Age-Stratified Blood Pressure Target (ESH 2023 / AHA / JNC-8 Guidelines)
 */
export function getAgeStratifiedTarget(age: number = 45): AgeTargetProfile {
  if (age < 18) {
    return {
      stratum: 'Anak & Remaja (<18 th)',
      targetText: '< 115/75 mmHg',
      targetSysMin: 90,
      targetSysMax: 115,
      targetDiaMin: 60,
      targetDiaMax: 75,
      clinicalGuideline: 'Standar Persentil Pediatrik',
      caution: 'Evaluasi kurva pertumbuhan dan faktor aktivitas fisik.'
    };
  }
  if (age <= 39) {
    return {
      stratum: 'Dewasa Muda (18–39 th)',
      targetText: '< 120/80 mmHg',
      targetSysMin: 100,
      targetSysMax: 120,
      targetDiaMin: 65,
      targetDiaMax: 80,
      clinicalGuideline: 'AHA/ACC Target Optimal',
      caution: 'Cegah disfungsi endotel vaskular dini dengan membatasi asupan natrium.'
    };
  }
  if (age <= 64) {
    return {
      stratum: 'Dewasa Menengah (40–64 th)',
      targetText: '< 130/80 mmHg',
      targetSysMin: 105,
      targetSysMax: 130,
      targetDiaMin: 65,
      targetDiaMax: 80,
      clinicalGuideline: 'ESH 2023 / JNC-8 Standar',
      caution: 'Pantau resistensi pembuluh darah dan kesehatan ginjal secara berkala.'
    };
  }
  if (age <= 79) {
    return {
      stratum: 'Lansia (65–79 th)',
      targetText: '120–130 / 70–80 mmHg',
      targetSysMin: 115,
      targetSysMax: 130,
      targetDiaMin: 65,
      targetDiaMax: 80,
      clinicalGuideline: 'ESH Geriatric Guidelines',
      caution: 'Waspadai diastolik <65 mmHg (risiko hipoperfusi sirkulasi koroner).'
    };
  }
  return {
    stratum: 'Geriatri Lanjut (≥80 th)',
    targetText: '130–140 / 70–80 mmHg',
    targetSysMin: 120,
    targetSysMax: 140,
    targetDiaMin: 65,
    targetDiaMax: 80,
    clinicalGuideline: 'Geriatric Safety Target',
    caution: 'Prioritaskan pencegahan hipotensi ortostatik dan risiko jatuh saat berdiri.'
  };
}

export interface AgeAdjustedClassification {
  category: BPCategory;
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
 * Evaluates blood pressure with deep age-stratification and hemodynamic parameters
 */
export function classifyAgeAdjustedBP(
  systolic: number,
  diastolic: number,
  age: number = 45,
  pulse?: number
): AgeAdjustedClassification {
  const category = classifyBP(systolic, diastolic);
  const target = getAgeStratifiedTarget(age);
  const pp = calculatePulsePressure(systolic, diastolic);
  const map = calculateMAP(systolic, diastolic);
  const rpp = pulse ? calculateRPP(systolic, pulse) : undefined;

  // Pulse pressure assessment
  let ppStatus: 'optimal' | 'normal' | 'wide' | 'narrow' = 'normal';
  let ppNote = 'Tekanan nadi elastis dan sehat (30–50 mmHg).';
  if (pp < 30) {
    ppStatus = 'narrow';
    ppNote = 'Tekanan nadi sempit (<30 mmHg). Kemungkinan curah jantung rendah atau dehidrasi.';
  } else if (pp > 60) {
    ppStatus = 'wide';
    ppNote = 'Tekanan nadi lebar (>60 mmHg). Indikasi kekakuan dinding aorta (Arterial Stiffness).';
  } else if (pp <= 45) {
    ppStatus = 'optimal';
    ppNote = 'Tekanan nadi optimal (≤45 mmHg). Elastisitas vaskular sangat baik.';
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

  // Isolated Systolic Hypertension (ISH)
  const isISH = systolic >= 140 && diastolic < 90;

  // Is normal for age evaluation
  const isNormalForAge = systolic <= target.targetSysMax && diastolic <= target.targetDiaMax && diastolic >= target.targetDiaMin;

  let ageClinicalAdvice = `Target klinis usia ${age} th: ${target.targetText}. `;
  if (isNormalForAge) {
    ageClinicalAdvice += `Hasil pengukuran Anda (${systolic}/${diastolic} mmHg) sesuai dengan batas ideal kelompok usia Anda.`;
  } else if (systolic > target.targetSysMax) {
    ageClinicalAdvice += `Sistolik (${systolic} mmHg) berada di atas batas yang dianjurkan untuk usia ${age} th. ${target.caution}`;
  } else if (diastolic < target.targetDiaMin) {
    ageClinicalAdvice += `Diastolik (${diastolic} mmHg) cenderung rendah untuk usia ${age} th. ${target.caution}`;
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
    isIsolatedSystolicHypertension: isISH
  };
}
