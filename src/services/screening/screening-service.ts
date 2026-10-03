import { db, newSyncId } from '../../db/index.ts';
import type {
  Profile,
  ConditionItem,
  FamilyMemberHistoryItem,
  ImmunizationItem,
  ConditionCategory,
  AortaMeasurementDetails
} from '../../types/blood-pressure.ts';

// ===========================================================================
// Asia-Pacific WHO BMI Stratification
// ===========================================================================

export interface BmiEvaluation {
  bmi: number;
  category: 'underweight' | 'normal' | 'overweight' | 'obese1' | 'obese2';
  label: string;
  badgeColor: string; // Tailwind color classes
  clinicalAdvice: string;
}

export function calculateBMI(heightCm?: number, weightKg?: number): BmiEvaluation | null {
  if (
    heightCm === undefined ||
    weightKg === undefined ||
    !Number.isFinite(heightCm) ||
    !Number.isFinite(weightKg) ||
    heightCm <= 0 ||
    weightKg <= 0
  ) {
    return null;
  }
  const heightM = heightCm / 100;
  const rawBmi = weightKg / (heightM * heightM);
  if (!Number.isFinite(rawBmi)) return null;

  const bmi = Math.round(rawBmi * 10) / 10;

  if (bmi < 18.5) {
    return {
      bmi,
      category: 'underweight',
      label: 'Berat Kurang',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300',
      clinicalAdvice: 'Indeks massa tubuh di bawah rentang optimal. Pastikan asupan nutrisi seimbang.'
    };
  }
  if (bmi <= 22.9) {
    return {
      bmi,
      category: 'normal',
      label: 'Berat Normal',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300',
      clinicalAdvice: 'Indeks massa tubuh dalam batas ideal Asia-Pasifik. Pertahankan pola hidup aktif.'
    };
  }
  if (bmi <= 24.9) {
    return {
      bmi,
      category: 'overweight',
      label: 'Kelebihan Berat Badan',
      badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border-orange-300',
      clinicalAdvice: 'Mulai batasi asupan kalori tinggi dan tingkatkan aktivitas fisik aerobik harian.'
    };
  }
  if (bmi <= 29.9) {
    return {
      bmi,
      category: 'obese1',
      label: 'Obesitas Tingkat 1',
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300',
      clinicalAdvice: 'Faktor risiko kardiovaskular meningkat. Konsultasikan target penurunan berat badan bertahap.'
    };
  }
  return {
    bmi,
    category: 'obese2',
    label: 'Obesitas Tingkat 2',
    badgeColor: 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-300 border-red-400',
    clinicalAdvice: 'Obesitas signifikan. Perlu pendampingan dokter dan ahli gizi untuk proteksi vaskular.'
  };
}

// ===========================================================================
// Aorta & Vascular Risk Factors Catalog (CLINICAL_REVIEW.md:253-270)
// ===========================================================================

export interface AortaRiskFactorMeta {
  key: string;
  name: string;
  question: string;
  clinicalNote: string;
  group: 'hereditary' | 'syndromic' | 'structural' | 'vascular' | 'lifestyle';
  targetResource: 'Condition' | 'FamilyMemberHistory' | 'ProfileObservation';
  icd10Code: string;
  snomedCode?: string;
  supportsAortaDetails?: boolean;
}

export const AORTA_RISK_FACTORS_CATALOG: AortaRiskFactorMeta[] = [
  {
    key: 'family_aneurysm',
    name: 'Aneurisma Aorta pada Keluarga Inti',
    question: 'Pernahkah orang tua, saudara kandung, atau anak Anda didiagnosis aneurisma aorta?',
    clinicalNote: 'Kerabat derajat pertama pasien aneurisma aorta memiliki risiko herediter yang membutuhkan skrining berkala.',
    group: 'hereditary',
    targetResource: 'FamilyMemberHistory',
    icd10Code: 'I71.9',
    snomedCode: '233985008'
  },
  {
    key: 'family_dissection',
    name: 'Diseksi Aorta / Sudden Death <50 Th Keluarga',
    question: 'Pernahkah keluarga inti mengalami robekan aorta (diseksi) atau meninggal mendadak usia muda (<50 th)?',
    clinicalNote: 'Riwayat kematian mendadak vaskular muda merupakan indikasi evaluasi genetik dan ekokardiografi.',
    group: 'hereditary',
    targetResource: 'FamilyMemberHistory',
    icd10Code: 'I71.0',
    snomedCode: '308540004'
  },
  {
    key: 'marfan',
    name: 'Sindrom Marfan',
    question: 'Apakah Anda pernah didiagnosis menderita Sindrom Marfan?',
    clinicalNote: 'Kelainan jaringan ikat genetik (mutasi FBN1) dengan risiko dilatasi akar aorta dan diseksi akut.',
    group: 'syndromic',
    targetResource: 'Condition',
    icd10Code: 'Q87.4',
    snomedCode: '19346006',
    supportsAortaDetails: true
  },
  {
    key: 'loeys_dietz',
    name: 'Sindrom Loeys-Dietz',
    question: 'Apakah Anda terdiagnosis Sindrom Loeys-Dietz (LDS)?',
    clinicalNote: 'Mutasi jalur TGF-beta yang menyebabkan pembesaran aorta progresif bahkan pada diameter lebih kecil.',
    group: 'syndromic',
    targetResource: 'Condition',
    icd10Code: 'Q87.8',
    snomedCode: '439127006',
    supportsAortaDetails: true
  },
  {
    key: 'veds',
    name: 'Ehlers-Danlos Vaskular (vEDS)',
    question: 'Apakah Anda memiliki riwayat Ehlers-Danlos Vaskular (Tipe IV)?',
    clinicalNote: 'Defisiensi kolagen tipe III yang menyebabkan kerapuhan ekstrem pada dinding pembuluh arteri.',
    group: 'syndromic',
    targetResource: 'Condition',
    icd10Code: 'Q79.6',
    snomedCode: '277873003',
    supportsAortaDetails: true
  },
  {
    key: 'turner',
    name: 'Sindrom Turner',
    question: 'Apakah Anda memiliki diagnosis Sindrom Turner (45,X)?',
    clinicalNote: 'Kondisi kromosomal pada perempuan dengan risiko dilatasi aorta dan koarktasio.',
    group: 'syndromic',
    targetResource: 'Condition',
    icd10Code: 'Q96.9',
    snomedCode: '38804009'
  },
  {
    key: 'bicuspid_aorta',
    name: 'Katup Aorta Bikuspid (BAV)',
    question: 'Apakah katup aorta jantung Anda memiliki 2 daun (bikuspid) alih-alih 3 daun normal?',
    clinicalNote: 'Kelainan kongenital katup paling umum, sering menyertai aortopati torakalis asendens.',
    group: 'structural',
    targetResource: 'Condition',
    icd10Code: 'Q23.1',
    snomedCode: '72352009',
    supportsAortaDetails: true
  },
  {
    key: 'coarctation',
    name: 'Koarktasio Aorta',
    question: 'Pernahkah Anda mengalami penyempitan aorta (koarktasio) atau operasi perbaikannya?',
    clinicalNote: 'Penyempitan lumen aorta yang memicu hipertensi sekunder ekstrem dan beban dinding aorta.',
    group: 'structural',
    targetResource: 'Condition',
    icd10Code: 'Q25.1',
    snomedCode: '7305005'
  },
  {
    key: 'takayasu_arteritis',
    name: 'Arteritis Takayasu',
    question: 'Pernahkah Anda didiagnosis Arteritis Takayasu (penyempitan atau radang cabang aorta)?',
    clinicalNote: 'Arteritis granulomatosa pada cabang aorta yang dapat melemahkan atau mempersempit lumen pembuluh.',
    group: 'vascular',
    targetResource: 'Condition',
    icd10Code: 'M31.4',
    snomedCode: '400130008'
  },
  {
    key: 'giant_cell_arteritis',
    name: 'Giant Cell Arteritis (GCA)',
    question: 'Pernahkah Anda didiagnosis Giant Cell Arteritis (Arteritis Sel Raksasa / Temporal)?',
    clinicalNote: 'Vaskulitis arteri besar pada usia lanjut dengan risiko keterlibatan arkus aorta dan aneurisma.',
    group: 'vascular',
    targetResource: 'Condition',
    icd10Code: 'M31.5',
    snomedCode: '69865005'
  },
  {
    key: 'personal_aorta_history',
    name: 'Riwayat Operasi / Aneurisma Aorta Pribadi',
    question: 'Pernahkah Anda menjalani operasi aorta (EVAR/TEVAR/Open Repair) atau memiliki pelebaran aorta?',
    clinicalNote: 'Membuka jalur surveilans aktif dan protokol interval pencitraan rutin.',
    group: 'structural',
    targetResource: 'Condition',
    icd10Code: 'I71.9',
    snomedCode: '233985008',
    supportsAortaDetails: true
  },
  {
    key: 'hypertension',
    name: 'Hipertensi Kronis Terdiagnosis',
    question: 'Apakah Anda telah didiagnosis hipertensi oleh dokter atau sedang mengonsumsi obat antihipertensi?',
    clinicalNote: 'Tekanan darah tinggi adalah stresor mekanik utama penyebab robekan dan pelebaran dinding aorta.',
    group: 'vascular',
    targetResource: 'Condition',
    icd10Code: 'I10',
    snomedCode: '38341003'
  },
  {
    key: 'smoking',
    name: 'Riwayat Merokok Tembakau',
    question: 'Apakah Anda perokok aktif atau pernah merokok secara rutin di masa lalu?',
    clinicalNote: 'Merokok merupakan faktor risiko eksternal terkuat untuk pembentukan dan ruptur aneurisma aorta.',
    group: 'lifestyle',
    targetResource: 'ProfileObservation',
    icd10Code: 'Z72.0',
    snomedCode: '449868002'
  },
  {
    key: 'stimulants',
    name: 'Riwayat Paparan Stimulan / Kokain / Amfetamin',
    question: 'Pernahkah terpapar atau mengonsumsi stimulan kuat (amfetamin/kokain)?',
    clinicalNote: 'Stimulan memicu lonjakan katekolamin mendadak yang dapat merobek dinding aorta pada usia muda.',
    group: 'lifestyle',
    targetResource: 'Condition',
    icd10Code: 'F15.1',
    snomedCode: '423441005'
  },
  {
    key: 'cad_pjk',
    name: 'Penyakit Jantung Koroner (PJK / Riwayat Serangan Jantung)',
    question: 'Pernahkah Anda didiagnosis penyakit jantung koroner (PJK), pasang ring, atau serangan jantung?',
    clinicalNote: 'Aterosklerosis koroner mencerminkan beban plak vaskular sistemik yang juga melemahkan dinding aorta.',
    group: 'vascular',
    targetResource: 'Condition',
    icd10Code: 'I25.1',
    snomedCode: '53741008'
  },
  {
    key: 'stroke_ischemic',
    name: 'Stroke Iskemik Terdiagnosis',
    question: 'Pernahkah Anda didiagnosis mengalami stroke iskemik (penyumbatan pembuluh darah otak)?',
    clinicalNote: 'Penyakit serebrovaskular aterotrombotik adalah indikator penyakit vaskular aterosklerotik luas.',
    group: 'vascular',
    targetResource: 'Condition',
    icd10Code: 'I64',
    snomedCode: '422504000'
  },
  {
    key: 'tia_ischemic',
    name: 'Serangan Iskemik Transien (TIA / Stroke Ringan)',
    question: 'Pernahkah Anda mengalami serangan stroke ringan sesaat (TIA) dengan gejala yang pulih <24 jam?',
    clinicalNote: 'TIA merupakan tanda peringatan instabilitas plak vaskular yang memerlukan evaluasi menyeluruh.',
    group: 'vascular',
    targetResource: 'Condition',
    icd10Code: 'G45.9',
    snomedCode: '266257000'
  },
  {
    key: 'pad_peripheral',
    name: 'Penyakit Arteri Perifer (PAD / Nyeri Betis Saat Jalan)',
    question: 'Pernahkah Anda didiagnosis penyumbatan arteri tungkai (PAD) atau nyeri betis saat berjalan (klaudikasio)?',
    clinicalNote: 'PAD sangat berkorelasi kuat dengan prevalensi aneurisma aorta abdominalis (AAA).',
    group: 'vascular',
    targetResource: 'Condition',
    icd10Code: 'I73.9',
    snomedCode: '399957001'
  },
  {
    key: 'advanced_age_male',
    name: 'Demografi Usia & Jenis Kelamin',
    question: 'Usia pria ≥55 tahun atau wanita ≥65 tahun (diambil otomatis dari profil)?',
    clinicalNote: 'Insiden aneurisma aorta meningkat tajam seiring pertambahan usia dan elastisitas arteri yang menurun.',
    group: 'lifestyle',
    targetResource: 'ProfileObservation',
    icd10Code: 'Z00.0'
  },
  {
    key: 'pregnancy_high_risk',
    name: 'Kehamilan / Rencana Hamil pada Risiko Aorta',
    question: 'Sedang hamil atau berencana hamil dengan riwayat katup bikuspid/Marfan/hipertensi?',
    clinicalNote: 'Perubahan hemodinamik dan hormon pada kehamilan trimester III meningkatkan stres dinding aorta.',
    group: 'vascular',
    targetResource: 'Condition',
    icd10Code: 'Z33.1',
    snomedCode: '77386006'
  }
];

// ===========================================================================
// Cardiovascular Immunizations Catalog
// ===========================================================================

export interface VaccineMeta {
  code: string;
  name: string;
  description: string;
  frequency: string;
  cvxCode?: string;
}

export const CARDIO_IMMUNIZATIONS_CATALOG: VaccineMeta[] = [
  {
    code: 'FLU',
    name: 'Influenza (Inactivated, Split / Subunit)',
    description: 'Mencegah infeksi saluran napas akut yang dapat memicu lonjakan tekanan darah dan dekompensasi kardiovaskular.',
    frequency: '1 dosis setiap tahun',
    cvxCode: '140'
  },
  {
    code: 'PCV13',
    name: 'Pneumokokus Konjugat (PCV13)',
    description: 'Melindungi dari 13 serotipe Streptococcus pneumoniae berat pada pasien kardiovaskular kronis.',
    frequency: 'Sesuai jadwal dokter (dewasa berisiko tinggi)',
    cvxCode: '133'
  },
  {
    code: 'PPSV23',
    name: 'Pneumokokus Polisakarida (PPSV23)',
    description: 'Melindungi dari 23 serotipe pneumokokus untuk proteksi jangka panjang pasien penyakit vaskular.',
    frequency: 'Sesuai anjuran klinis',
    cvxCode: '33'
  },
  {
    code: 'COVID19',
    name: 'COVID-19 Booster (mRNA)',
    description: 'Mencegah komplikasi vaskulitis dan miokarditis akibat infeksi SARS-CoV-2 berat.',
    frequency: 'Sesuai rekomendasi Kemenkes RI',
    cvxCode: '208'
  },
  {
    code: 'TDAP',
    name: 'Tdap (Tetanus, Difteri, Pertusis Aselular)',
    description: 'Imunisasi penguat berkala untuk proteksi infeksi sistemik.',
    frequency: 'Setiap 10 tahun',
    cvxCode: '115'
  }
];

// ===========================================================================
// Screening Risk Evaluation Engine
// ===========================================================================

export interface ScreeningSummary {
  profileId: string;
  totalConditions: number;
  aortaRiskCount: number;
  familyHistoryCount: number;
  immunizationCount: number;
  hasSyndromicAortaRisk: boolean;
  hasPersonalAortaHistory: boolean;
  positiveFactors: string[];
  clinicalHighlights: string[];
  lifestyleAlerts: string[];
}

export function evaluateScreeningRisk(
  profile: Profile,
  conditions: ConditionItem[] = [],
  familyHistories: FamilyMemberHistoryItem[] = [],
  immunizations: ImmunizationItem[] = []
): ScreeningSummary {
  // Exclude resolved, inactive, or in-remission conditions from active burden
  const activeConditions = conditions.filter(
    (c) => c.clinicalStatus !== 'resolved' && c.clinicalStatus !== 'inactive' && c.clinicalStatus !== 'remission'
  );
  const aortaConditions = activeConditions.filter((c) => c.category === 'aorta_risk');

  const positiveFactors: string[] = [];
  const clinicalHighlights: string[] = [];
  const lifestyleAlerts: string[] = [];

  const syndromicCodes = ['Q87.4', 'Q87.8', 'Q79.6', 'Q96.9']; // Marfan, Loeys-Dietz, vEDS, Turner
  const hasSyndromicAortaRisk = activeConditions.some((c) => syndromicCodes.includes(c.code));
  const hasPersonalAortaHistory = activeConditions.some((c) => c.code === 'I71.9' || c.code.startsWith('I71'));

  // 1. Process Active Clinical Conditions
  for (const c of activeConditions) {
    positiveFactors.push(c.name);
    if (syndromicCodes.includes(c.code)) {
      clinicalHighlights.push(`Kondisi genetik/sindromik (${c.name}) memerlukan pemantauan ketat diameter aorta oleh dokter spesialis.`);
    } else if (c.code === 'Q23.1') {
      clinicalHighlights.push('Katup aorta bikuspid: disarankan ekokardiografi berkala untuk mengevaluasi akar aorta.');
    } else if (c.code === 'I71.9' || c.code.startsWith('I71')) {
      clinicalHighlights.push('Riwayat kelainan aorta pribadi: pastikan kepatuhan kontrol berkala sesuai anjuran bedah vaskular.');
    }
  }

  // 2. Process Family History
  for (const fh of familyHistories) {
    positiveFactors.push(`Riwayat Keluarga: ${fh.conditionName} (${fh.relationshipDisplay})`);
    clinicalHighlights.push(`Riwayat ${fh.conditionName} pada ${fh.relationshipDisplay}: tingkatkan kewaspadaan dan diskusikan skrining dini.`);
  }

  // 3. Process Anthropometry & Lifestyle
  if (profile.heightCm && profile.weightKg) {
    const bmiEval = calculateBMI(profile.heightCm, profile.weightKg);
    if (bmiEval && (bmiEval.category === 'obese1' || bmiEval.category === 'obese2')) {
      lifestyleAlerts.push(`BMI ${bmiEval.bmi} (${bmiEval.label}): ${bmiEval.clinicalAdvice}`);
    }
  }

  if (profile.smokingStatus === 'current') {
    lifestyleAlerts.push('Merokok aktif merupakan faktor risiko vaskular utama. Konsultasikan program berhenti merokok.');
    positiveFactors.push('Perokok Aktif');
  } else if (profile.smokingStatus === 'former') {
    lifestyleAlerts.push('Pertahankan keputusan bebas tembakau untuk memulihkan elastisitas dinding arteri.');
    positiveFactors.push('Mantan Perokok');
  }

  // Evaluate substance use history while avoiding double count if F15.1 Condition is already logged
  if (profile.substanceUseHistory) {
    const hasStimulantCondition = activeConditions.some((c) => c.code === 'F15.1');
    if (!hasStimulantCondition) {
      lifestyleAlerts.push('Riwayat paparan zat stimulan: berisiko memicu lonjakan katekolamin mendadak pada dinding pembuluh.');
      positiveFactors.push('Riwayat Paparan Stimulan');
    }
  }

  // 4. Age & Sex Demographics
  if (typeof profile.age === 'number' && profile.gender) {
    const isHighRiskAge =
      (profile.gender === 'male' && profile.age >= 55) ||
      (profile.gender === 'female' && profile.age >= 65);
    if (isHighRiskAge) {
      positiveFactors.push(`Demografi Usia Berisiko (${profile.gender === 'male' ? 'Pria ≥55' : 'Wanita ≥65'} th)`);
      clinicalHighlights.push(
        `Usia ${profile.age} tahun (${profile.gender === 'male' ? 'pria' : 'wanita'}): elastisitas aorta berkurang seiring usia, prioritaskan kontrol tensi berkala.`
      );
    }
  }

  return {
    profileId: profile.id,
    totalConditions: activeConditions.length,
    aortaRiskCount: aortaConditions.length,
    familyHistoryCount: familyHistories.length,
    immunizationCount: immunizations.length,
    hasSyndromicAortaRisk,
    hasPersonalAortaHistory,
    positiveFactors,
    clinicalHighlights,
    lifestyleAlerts
  };
}

// ===========================================================================
// Database Repository Layer (Scoped to Profile & Preserves recordedDate)
// ===========================================================================

export async function fetchProfileScreeningData(profileId: string) {
  const [conditions, familyHistory, immunizations] = await Promise.all([
    db.conditions.where('profileId').equals(profileId).toArray(),
    db.familyHistory.where('profileId').equals(profileId).toArray(),
    db.immunizations.where('profileId').equals(profileId).toArray()
  ]);

  return { conditions, familyHistory, immunizations };
}

export async function saveScreeningCondition(
  profileId: string,
  condition: Omit<ConditionItem, 'id' | 'profileId' | 'recordedDate'> & { id?: string }
): Promise<ConditionItem> {
  const now = new Date().toISOString();
  let id = condition.id;
  let recordedDate = now;

  if (id) {
    const existing = await db.conditions.get(id);
    if (existing) {
      if (existing.profileId !== profileId) {
        throw new Error(`Akses ditolak: Rekam kondisi ${id} bukan milik profil ${profileId}`);
      }
      recordedDate = existing.recordedDate || now;
    }
  } else {
    id = newSyncId();
  }

  const record: ConditionItem = {
    ...condition,
    id,
    profileId,
    recordedDate,
    updatedAt: now
  };

  await db.conditions.put(record);
  return record;
}

export async function deleteScreeningCondition(profileId: string, id: string): Promise<void> {
  const existing = await db.conditions.get(id);
  if (!existing) return;
  if (existing.profileId !== profileId) {
    throw new Error(`Akses ditolak: Rekam kondisi ${id} bukan milik profil ${profileId}`);
  }
  await db.conditions.delete(id);
}

export async function saveScreeningFamilyHistory(
  profileId: string,
  history: Omit<FamilyMemberHistoryItem, 'id' | 'profileId' | 'recordedDate'> & { id?: string }
): Promise<FamilyMemberHistoryItem> {
  const now = new Date().toISOString();
  let id = history.id;
  let recordedDate = now;

  if (id) {
    const existing = await db.familyHistory.get(id);
    if (existing) {
      if (existing.profileId !== profileId) {
        throw new Error(`Akses ditolak: Rekam riwayat keluarga ${id} bukan milik profil ${profileId}`);
      }
      recordedDate = existing.recordedDate || now;
    }
  } else {
    id = newSyncId();
  }

  const record: FamilyMemberHistoryItem = {
    ...history,
    id,
    profileId,
    recordedDate,
    updatedAt: now
  };

  await db.familyHistory.put(record);
  return record;
}

export async function deleteScreeningFamilyHistory(profileId: string, id: string): Promise<void> {
  const existing = await db.familyHistory.get(id);
  if (!existing) return;
  if (existing.profileId !== profileId) {
    throw new Error(`Akses ditolak: Rekam riwayat keluarga ${id} bukan milik profil ${profileId}`);
  }
  await db.familyHistory.delete(id);
}

export async function saveScreeningImmunization(
  profileId: string,
  immunization: Omit<ImmunizationItem, 'id' | 'profileId' | 'recordedDate'> & { id?: string }
): Promise<ImmunizationItem> {
  const now = new Date().toISOString();
  let id = immunization.id;
  let recordedDate = now;

  if (id) {
    const existing = await db.immunizations.get(id);
    if (existing) {
      if (existing.profileId !== profileId) {
        throw new Error(`Akses ditolak: Rekam imunisasi ${id} bukan milik profil ${profileId}`);
      }
      recordedDate = existing.recordedDate || now;
    }
  } else {
    id = newSyncId();
  }

  const record: ImmunizationItem = {
    ...immunization,
    id,
    profileId,
    recordedDate,
    updatedAt: now
  };

  await db.immunizations.put(record);
  return record;
}

export async function deleteScreeningImmunization(profileId: string, id: string): Promise<void> {
  const existing = await db.immunizations.get(id);
  if (!existing) return;
  if (existing.profileId !== profileId) {
    throw new Error(`Akses ditolak: Rekam imunisasi ${id} bukan milik profil ${profileId}`);
  }
  await db.immunizations.delete(id);
}
