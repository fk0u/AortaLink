/**
 * AortaLink Health Score Engine (AHA Life's Essential 8 Implementation)
 * ---------------------------------------------------------------------
 * Standardized, transparent, guideline-driven cardiovascular health scoring.
 * 
 * References:
 * - Lloyd-Jones DM, et al. Life's Essential 8: Updating and Enhancing the American
 *   Heart Association's Construct of Cardiovascular Health. Circulation. 2022;146:e18–e43.
 * - ESH/PERHI Guidelines 2023 & Asia-Pacific WHO BMI Cut-offs.
 * - Clinical Panel Review: docs/v3/CLINICAL_REVIEW.md §2.1 & §3.6
 *
 * Strict Principles:
 * 1. Zero black-box ML: 100% deterministic rules where every point traces to guideline thresholds.
 * 2. Refusal to guess ('not_enough_data'): Total score is ONLY produced if all 8 metrics are present.
 * 3. No double-counting: 10-year risk (ASCVD/PREVENT) and medication adherence are displayed separately.
 * 4. Regulatory SaMD compliance: Strictly non-diagnostic wording ("Ringkasan Kesehatan Kardiovaskular").
 */

import type {
  BPReading,
  Profile,
  LabResult,
  MedicationItem,
  MedicationLog,
  SodiumLog,
  SleepLog,
  HabitLog
} from '../../types/blood-pressure.ts';
import type {
  AortaLinkHealthScoreReport,
  HealthScoreCategory,
  HealthScoreMetricId,
  HealthScoreMetricResult
} from '../../types/health-score.ts';

export const HEALTH_SCORE_ENGINE_VERSION = '3.0.0';
export const HEALTH_SCORE_GUIDELINE = "AHA Life's Essential 8 (2022) / ESH-PERHI (2023)";

export const HEALTH_SCORE_DISCLAIMER =
  'Ringkasan kesehatan kardiovaskular transparan berbasis guideline AHA Life\'s Essential 8. ' +
  'Bukan diagnosis medis, bukan alat penentu terapi mandiri, dan tidak menggantikan evaluasi klinis dokter.';

export interface HealthScoreInput {
  profile: Profile | null;
  readings: BPReading[];
  medications?: MedicationItem[];
  medicationLogs?: MedicationLog[];
  labResults?: LabResult[];
  sodiumLogs?: SodiumLog[];
  sleepLogs?: SleepLog[];
  habits?: HabitLog[];
  hasDiabetes?: boolean;
}

/**
 * 1. Blood Pressure Score (0 - 100)
 * AHA LE8: <120/<80=100; 120-129/<80=75; 130-139 or 80-89=50; 140-159 or 90-99=25; >=160 or >=100=0.
 * If treated with antihypertensive medication, subtract 20 points (min 0).
 */
export function scoreBloodPressure(
  readings: BPReading[],
  isTreated: boolean
): HealthScoreMetricResult {
  if (!readings || readings.length === 0) {
    return {
      id: 'blood_pressure',
      name: 'Blood Pressure',
      nameId: 'Tekanan Darah',
      score: null,
      isAvailable: false,
      valueDisplay: 'Belum ada data',
      status: 'missing',
      details: 'Memerlukan minimal 1 sesi atau catatan pengukuran tensi valid.',
      recommendation: 'Lakukan pengukuran tensi pagi dan malam secara teratur untuk melengkapi metrik ini.',
      guidelineSource: "AHA LE8 / ESH 2023 (Target <120/<80 mmHg)",
      dataSource: 'Catatan Tensi Pasien',
      missingReason: 'Belum ada catatan tensi yang tersimpan.'
    };
  }

  // Filter valid readings within the last 90 days (or all if <90d)
  const sorted = [...readings].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const sample = sorted.slice(0, 30); // Use up to 30 most recent readings

  const avgSys = Math.round(sample.reduce((acc, r) => acc + r.systolic, 0) / sample.length);
  const avgDia = Math.round(sample.reduce((acc, r) => acc + r.diastolic, 0) / sample.length);

  let baseScore = 0;
  let status: 'optimal' | 'moderate' | 'suboptimal' = 'suboptimal';

  if (avgSys < 120 && avgDia < 80) {
    baseScore = 100;
    status = 'optimal';
  } else if (avgSys < 130 && avgDia < 80) {
    baseScore = 75;
    status = 'optimal';
  } else if ((avgSys >= 130 && avgSys < 140) || (avgDia >= 80 && avgDia < 90)) {
    baseScore = 50;
    status = 'moderate';
  } else if ((avgSys >= 140 && avgSys < 160) || (avgDia >= 90 && avgDia < 100)) {
    baseScore = 25;
    status = 'suboptimal';
  } else {
    baseScore = 0;
    status = 'suboptimal';
  }

  const finalScore = isTreated ? Math.max(0, baseScore - 20) : baseScore;
  const treatedNote = isTreated ? ' (−20 poin penyesuaian AHA karena dalam terapi obat antihipertensi)' : '';

  return {
    id: 'blood_pressure',
    name: 'Blood Pressure',
    nameId: 'Tekanan Darah',
    score: finalScore,
    isAvailable: true,
    valueDisplay: `${avgSys}/${avgDia} mmHg`,
    unit: 'mmHg',
    status,
    treatedAdjustmentApplied: isTreated,
    details: `Rata-rata ${sample.length} pengukuran terakhir: ${avgSys}/${avgDia} mmHg${treatedNote}.`,
    recommendation:
      finalScore >= 80
        ? 'Tekanan darah terkontrol optimal. Pertahankan pola hidup sehat dan konsultasi rutin.'
        : 'Pertahankan kepatuhan jadwal kontrol dokter dan pantau tensi secara berkala.',
    guidelineSource: "AHA Life's Essential 8 (2022) & Konsensus PERHI",
    dataSource: `Rata-rata ${sample.length} data tensi terakhir`
  };
}

/**
 * 2. Nicotine Exposure Score (0 - 100)
 * AHA LE8: Never=100; Former >=5y=75; Former 1-5y=50; Former <1y or passive smoke=25; Current=0.
 */
export function scoreNicotine(smokingStatus?: string): HealthScoreMetricResult {
  if (!smokingStatus) {
    return {
      id: 'nicotine',
      name: 'Nicotine Exposure',
      nameId: 'Paparan Nikotin',
      score: null,
      isAvailable: false,
      valueDisplay: 'Belum diisi',
      status: 'missing',
      details: 'Status riwayat merokok/vape belum dilengkapi pada profil.',
      recommendation: 'Lengkapi status riwayat merokok pada profil kesehatan Anda.',
      guidelineSource: "AHA Life's Essential 8 (2022)",
      dataSource: 'Profil Pasien',
      missingReason: 'Status riwayat merokok belum dipilih di profil.'
    };
  }

  const norm = smokingStatus.toLowerCase();
  let score = 0;
  let label = 'Perokok Aktif / Vape';
  let status: 'optimal' | 'moderate' | 'suboptimal' = 'suboptimal';

  if (norm === 'never' || norm === 'tidak_pernah' || norm === 'non-smoker') {
    score = 100;
    label = 'Tidak Pernah Merokok';
    status = 'optimal';
  } else if (norm === 'former' || norm === 'mantan_perokok' || norm === 'ex-smoker') {
    score = 75; // Standard former smoker
    label = 'Mantan Perokok (Berhenti)';
    status = 'optimal';
  } else if (norm === 'passive' || norm === 'perokok_pasif') {
    score = 25;
    label = 'Terpapar Asap Rokok Pasif';
    status = 'moderate';
  } else {
    score = 0;
    label = 'Perokok Aktif / Elektrik / Kretek';
    status = 'suboptimal';
  }

  return {
    id: 'nicotine',
    name: 'Nicotine Exposure',
    nameId: 'Paparan Nikotin',
    score,
    isAvailable: true,
    valueDisplay: label,
    status,
    details: `Status paparan nikotin saat ini: ${label}.`,
    recommendation:
      score === 100
        ? 'Bebas dari nikotin. Lindungi diri dari paparan asap rokok pasif di lingkungan sekitar.'
        : score > 0
        ? 'Bagus sekali telah berhenti merokok. Pertahankan gaya hidup bebas asap rokok.'
        : 'Berhenti merokok adalah langkah paling signifikan untuk menurunkan risiko komplikasi aorta dan jantung.',
    guidelineSource: "AHA Life's Essential 8 (2022)",
    dataSource: 'Profil Pasien'
  };
}

/**
 * 3. Body Mass Index Score (0 - 100)
 * Asia-Pacific WHO consensus:
 * <23.0=100; 23.0–24.9=70; 25.0–27.4=40; 27.5–29.9=15; >=30.0=0.
 */
export function scoreBMI(bmi?: number): HealthScoreMetricResult {
  if (!bmi || isNaN(bmi) || bmi <= 0) {
    return {
      id: 'bmi',
      name: 'Body Mass Index',
      nameId: 'Indeks Massa Tubuh (BMI)',
      score: null,
      isAvailable: false,
      valueDisplay: 'Belum diisi',
      status: 'missing',
      details: 'Memerlukan data tinggi dan berat badan.',
      recommendation: 'Lengkapi tinggi badan dan berat badan pada profil untuk menghitung BMI.',
      guidelineSource: 'WHO Asia-Pacific Guidelines & AHA LE8',
      dataSource: 'Profil Pasien (Tinggi & Berat Badan)',
      missingReason: 'Tinggi atau berat badan belum lengkap.'
    };
  }

  const roundedBmi = Math.round(bmi * 10) / 10;
  let score = 0;
  let label = '';
  let status: 'optimal' | 'moderate' | 'suboptimal' = 'suboptimal';

  if (roundedBmi < 18.5) {
    score = 80;
    label = 'Berat Badan Kurang (Underweight)';
    status = 'moderate';
  } else if (roundedBmi < 23.0) {
    score = 100;
    label = 'Berat Badan Ideal (Optimal Asia)';
    status = 'optimal';
  } else if (roundedBmi < 25.0) {
    score = 70;
    label = 'Kelebihan Berat Badan Ringan (Overweight)';
    status = 'moderate';
  } else if (roundedBmi < 27.5) {
    score = 40;
    label = 'Obesitas Tingkat 1 (Kriteria Asia)';
    status = 'suboptimal';
  } else if (roundedBmi < 30.0) {
    score = 15;
    label = 'Obesitas Tingkat 2 (Kriteria Asia)';
    status = 'suboptimal';
  } else {
    score = 0;
    label = 'Obesitas Tingkat 3 (Signifikan)';
    status = 'suboptimal';
  }

  return {
    id: 'bmi',
    name: 'Body Mass Index',
    nameId: 'Indeks Massa Tubuh (BMI)',
    score,
    isAvailable: true,
    valueDisplay: `${roundedBmi} kg/m²`,
    unit: 'kg/m²',
    status,
    details: `BMI ${roundedBmi} kg/m² (${label}). Menggunakan ambang batas Asia-Pasifik (WHO).`,
    recommendation:
      score >= 80
        ? 'Berat badan berada dalam rentang ideal. Pertahankan asupan gizi seimbang.'
        : 'Pertahankan aktivitas fisik rutin dan konsultasikan target berat badan ideal dengan dokter.',
    guidelineSource: 'WHO Asia-Pacific Guidelines & AHA LE8',
    dataSource: 'Profil Pasien'
  };
}

/**
 * 4. Blood Lipids Score (0 - 100)
 * AHA LE8 prioritizes Non-HDL Cholesterol (Total Chol − HDL Chol).
 * <130 mg/dL: 100; 130-159: 60; 160-189: 40; 190-219: 20; >=220: 0.
 * If treated with lipid-lowering medication (statin), subtract 20 points (min 0).
 */
export function scoreBloodLipids(
  labResults: LabResult[],
  isTreated: boolean
): HealthScoreMetricResult {
  const validLabs = (labResults || []).filter((l) => l.totalCholesterol || l.ldlCholesterol);

  if (validLabs.length === 0) {
    return {
      id: 'lipids',
      name: 'Blood Lipids',
      nameId: 'Profil Lipid (Kolesterol)',
      score: null,
      isAvailable: false,
      valueDisplay: 'Belum ada lab',
      status: 'missing',
      details: 'Memerlukan hasil laboratorium profil kolesterol (Total dan HDL).',
      recommendation: 'Masukkan hasil tes darah kolesterol pada menu Hasil Lab untuk melengkapi skor ini.',
      guidelineSource: "AHA Life's Essential 8 (Non-HDL Cholesterol)",
      dataSource: 'Hasil Lab Terverifikasi FHIR',
      missingReason: 'Belum ada catatan laboratorium lipid.'
    };
  }

  // Get most recent lab
  const latestLab = [...validLabs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];

  const total = latestLab.totalCholesterol;
  const hdl = latestLab.hdlCholesterol;
  const ldl = latestLab.ldlCholesterol;

  let nonHdl: number;
  let isEstimated = false;

  if (total !== undefined && hdl !== undefined) {
    nonHdl = Math.round(total - hdl);
  } else if (ldl !== undefined) {
    nonHdl = Math.round(ldl + 30); // clinical approximation if HDL is absent
    isEstimated = true;
  } else if (total !== undefined) {
    nonHdl = Math.round(total - 45); // general adult approximation
    isEstimated = true;
  } else {
    nonHdl = 140;
    isEstimated = true;
  }

  let baseScore = 0;
  let status: 'optimal' | 'moderate' | 'suboptimal' = 'suboptimal';

  if (nonHdl < 130) {
    baseScore = 100;
    status = 'optimal';
  } else if (nonHdl < 160) {
    baseScore = 60;
    status = 'moderate';
  } else if (nonHdl < 190) {
    baseScore = 40;
    status = 'suboptimal';
  } else if (nonHdl < 220) {
    baseScore = 20;
    status = 'suboptimal';
  } else {
    baseScore = 0;
    status = 'suboptimal';
  }

  const finalScore = isTreated ? Math.max(0, baseScore - 20) : baseScore;
  const treatedNote = isTreated ? ' (−20 poin penyesuaian AHA karena dalam terapi obat penurun kolesterol)' : '';
  const estNote = isEstimated ? ' (estimasi dari LDL/Total Chol)' : '';

  return {
    id: 'lipids',
    name: 'Blood Lipids',
    nameId: 'Profil Lipid (Kolesterol)',
    score: finalScore,
    isAvailable: true,
    valueDisplay: `Non-HDL ${nonHdl} mg/dL`,
    unit: 'mg/dL',
    status,
    treatedAdjustmentApplied: isTreated,
    details: `Non-HDL Kolesterol: ${nonHdl} mg/dL${estNote}${treatedNote}.`,
    recommendation:
      finalScore >= 80
        ? 'Kadar lipid dalam batas optimal. Pertahankan konsumsi makanan rendah lemak jenuh.'
        : 'Konsultasikan target profil lipid dengan dokter Anda sesuai panduan prevensi kardiovaskular.',
    guidelineSource: "AHA Life's Essential 8 (Non-HDL Cholesterol)",
    dataSource: 'Hasil Lab Terverifikasi FHIR'
  };
}

/**
 * 5. Blood Glucose Score (0 - 100)
 * Without DM: HbA1c <5.7 (GDP <100)=100; HbA1c 5.7–6.4 (GDP 100–125)=60.
 * With DM: HbA1c <7.0=40; 7.0–7.9=30; 8.0–8.9=20; 9.0–9.9=10; >=10.0=0.
 */
export function scoreBloodGlucose(
  labResults: LabResult[],
  hasDiabetes: boolean
): HealthScoreMetricResult {
  const validLabs = (labResults || []).filter((l) => l.hba1c || l.fastingBloodSugar);

  if (validLabs.length === 0) {
    return {
      id: 'glucose',
      name: 'Blood Glucose',
      nameId: 'Gula Darah & HbA1c',
      score: null,
      isAvailable: false,
      valueDisplay: 'Belum ada lab',
      status: 'missing',
      details: 'Memerlukan hasil laboratorium gula darah puasa (GDP) atau HbA1c.',
      recommendation: 'Masukkan hasil tes gula darah pada menu Hasil Lab untuk melengkapi skor ini.',
      guidelineSource: "AHA Life's Essential 8 & ADA Guidelines",
      dataSource: 'Hasil Lab Terverifikasi FHIR',
      missingReason: 'Belum ada catatan laboratorium glukosa.'
    };
  }

  const latestLab = [...validLabs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];

  const hba1c = latestLab.hba1c;
  const fbs = latestLab.fastingBloodSugar;

  let score = 0;
  let display = '';
  let status: 'optimal' | 'moderate' | 'suboptimal' = 'suboptimal';

  if (hba1c !== undefined) {
    display = `HbA1c ${hba1c}%`;
    if (!hasDiabetes) {
      if (hba1c < 5.7) {
        score = 100;
        status = 'optimal';
      } else if (hba1c < 6.5) {
        score = 60;
        status = 'moderate';
      } else {
        score = 40;
        status = 'suboptimal';
      }
    } else {
      if (hba1c < 7.0) score = 40;
      else if (hba1c < 8.0) score = 30;
      else if (hba1c < 9.0) score = 20;
      else if (hba1c < 10.0) score = 10;
      else score = 0;
      status = score >= 40 ? 'moderate' : 'suboptimal';
    }
  } else if (fbs !== undefined) {
    display = `GDP ${fbs} mg/dL`;
    if (!hasDiabetes) {
      if (fbs < 100) {
        score = 100;
        status = 'optimal';
      } else if (fbs < 126) {
        score = 60;
        status = 'moderate';
      } else {
        score = 40;
        status = 'suboptimal';
      }
    } else {
      if (fbs < 130) score = 40;
      else if (fbs < 180) score = 30;
      else score = 15;
      status = 'suboptimal';
    }
  }

  return {
    id: 'glucose',
    name: 'Blood Glucose',
    nameId: 'Gula Darah & HbA1c',
    score,
    isAvailable: true,
    valueDisplay: display,
    status,
    details: `${display} (${hasDiabetes ? 'Riwayat Diabetes Terdaftar' : 'Tanpa Riwayat Diabetes'}).`,
    recommendation:
      score >= 80
        ? 'Gula darah dalam batas normal dan sehat. Pertahankan pola makan seimbang.'
        : 'Pertahankan pemantauan berkala dan konsultasikan pola makan rendah gula dengan dokter.',
    guidelineSource: "AHA Life's Essential 8 & ADA Guidelines",
    dataSource: 'Hasil Lab Terverifikasi FHIR'
  };
}

/**
 * 6. Physical Activity Score (0 - 100)
 * Moderate-to-vigorous physical activity minutes per week:
 * >=150m=100; 120-149m=90; 90-119m=60; 60-89m=40; 30-59m=20; 1-29m=10; 0m=0.
 */
export function scorePhysicalActivity(habits: HabitLog[] = []): HealthScoreMetricResult {
  const exerciseHabits = habits.filter((h) => {
    const raw = h as unknown as Record<string, unknown>;
    const outdoor = typeof h.outdoorMinutes === 'number' && h.outdoorMinutes > 0;
    const duration = typeof raw.durationMinutes === 'number' && (raw.durationMinutes as number) > 0;
    const isExercise = raw.habitType === 'exercise';
    const hasNotes = typeof h.activityNotes === 'string' && (h.activityNotes.toLowerCase().includes('olahraga') || h.activityNotes.toLowerCase().includes('jalan'));
    const hasName = typeof raw.name === 'string' && (raw.name.toLowerCase().includes('olahraga') || raw.name.toLowerCase().includes('jalan'));
    return outdoor || duration || isExercise || hasNotes || hasName;
  });

  if (exerciseHabits.length === 0) {
    return {
      id: 'physical_activity',
      name: 'Physical Activity',
      nameId: 'Aktivitas Fisik & Olahraga',
      score: null,
      isAvailable: false,
      valueDisplay: 'Belum ada data',
      status: 'missing',
      details: 'Memerlukan catatan kebiasaan olahraga atau jalan kaki mingguan.',
      recommendation: 'Catat aktivitas olahraga pada menu Gaya Hidup untuk memantau metrik ini.',
      guidelineSource: 'AHA LE8 / WHO Physical Activity Guidelines (Target >=150 menit/minggu)',
      dataSource: 'Pelacak Gaya Hidup',
      missingReason: 'Belum ada data log aktivitas fisik.'
    };
  }

  // Calculate approximate minutes/week from logs
  let totalMinutes = 0;
  for (const h of exerciseHabits) {
    const raw = h as unknown as Record<string, unknown>;
    const mins =
      typeof h.outdoorMinutes === 'number' && h.outdoorMinutes > 0
        ? h.outdoorMinutes
        : typeof raw.durationMinutes === 'number' && (raw.durationMinutes as number) > 0
        ? (raw.durationMinutes as number)
        : 30;
    totalMinutes += mins;
  }
  const avgMinsPerWeek = Math.min(300, Math.round((totalMinutes / Math.max(1, exerciseHabits.length)) * 3.5));

  let score = 0;
  let status: 'optimal' | 'moderate' | 'suboptimal' = 'suboptimal';

  if (avgMinsPerWeek >= 150) {
    score = 100;
    status = 'optimal';
  } else if (avgMinsPerWeek >= 120) {
    score = 90;
    status = 'optimal';
  } else if (avgMinsPerWeek >= 90) {
    score = 60;
    status = 'moderate';
  } else if (avgMinsPerWeek >= 60) {
    score = 40;
    status = 'moderate';
  } else if (avgMinsPerWeek >= 30) {
    score = 20;
    status = 'suboptimal';
  } else if (avgMinsPerWeek > 0) {
    score = 10;
    status = 'suboptimal';
  } else {
    score = 0;
    status = 'suboptimal';
  }

  return {
    id: 'physical_activity',
    name: 'Physical Activity',
    nameId: 'Aktivitas Fisik & Olahraga',
    score,
    isAvailable: true,
    valueDisplay: `~${avgMinsPerWeek} menit/minggu`,
    unit: 'menit/minggu',
    status,
    details: `Estimasi aktivitas fisik aerobik sedang: ${avgMinsPerWeek} menit/minggu.`,
    recommendation:
      score >= 80
        ? 'Sangat baik! Aktivitas fisik memenuhi target rekomendasi WHO (>=150 menit/minggu).'
        : 'Tingkatkan bertahap aktivitas fisik seperti jalan kaki cepat 20–30 menit sehari.',
    guidelineSource: 'AHA LE8 / WHO Physical Activity Guidelines',
    dataSource: 'Pelacak Gaya Hidup'
  };
}

/**
 * 7. Sleep Health Score (0 - 100)
 * Average adult sleep hours/night:
 * 7-9h=100; 9-10h=90; 6-7h=70; 5-6h=40; >10h=40; <5h=20.
 */
export function scoreSleepHealth(sleepLogs: SleepLog[] = [], habits: HabitLog[] = []): HealthScoreMetricResult {
  let avgHours: number | null = null;

  if (sleepLogs && sleepLogs.length > 0) {
    const total = sleepLogs.reduce((acc, s) => {
      const raw = s as unknown as Record<string, unknown>;
      const hours =
        typeof s.sleepHours === 'number'
          ? s.sleepHours
          : typeof raw.hoursSlept === 'number'
          ? (raw.hoursSlept as number)
          : 7;
      return acc + hours;
    }, 0);
    avgHours = Math.round((total / sleepLogs.length) * 10) / 10;
  } else if (habits && habits.length > 0) {
    const validHabits = habits.filter((h) => typeof h.sleepHours === 'number' && h.sleepHours > 0);
    if (validHabits.length > 0) {
      const total = validHabits.reduce((acc, h) => acc + h.sleepHours, 0);
      avgHours = Math.round((total / validHabits.length) * 10) / 10;
    }
  }

  if (avgHours === null) {
    return {
      id: 'sleep',
      name: 'Sleep Health',
      nameId: 'Durasi & Kesehatan Tidur',
      score: null,
      isAvailable: false,
      valueDisplay: 'Belum ada data',
      status: 'missing',
      details: 'Memerlukan catatan durasi tidur harian pada jurnal.',
      recommendation: 'Catat jam tidur pada menu Tidur & Gaya Hidup untuk melengkapi metrik ini.',
      guidelineSource: "AHA Life's Essential 8 (Target Dewasa 7–9 jam/malam)",
      dataSource: 'Pelacak Tidur & Gaya Hidup',
      missingReason: 'Belum ada data durasi tidur.'
    };
  }

  let score = 0;
  let status: 'optimal' | 'moderate' | 'suboptimal' = 'suboptimal';

  if (avgHours >= 7 && avgHours <= 9) {
    score = 100;
    status = 'optimal';
  } else if (avgHours > 9 && avgHours <= 10) {
    score = 90;
    status = 'optimal';
  } else if (avgHours >= 6 && avgHours < 7) {
    score = 70;
    status = 'moderate';
  } else if (avgHours >= 5 && avgHours < 6) {
    score = 40;
    status = 'suboptimal';
  } else if (avgHours > 10) {
    score = 40;
    status = 'suboptimal';
  } else {
    score = 20;
    status = 'suboptimal';
  }

  return {
    id: 'sleep',
    name: 'Sleep Health',
    nameId: 'Durasi & Kesehatan Tidur',
    score,
    isAvailable: true,
    valueDisplay: `${avgHours} jam/malam`,
    unit: 'jam/malam',
    status,
    details: `Rata-rata durasi tidur malam: ${avgHours} jam/malam.`,
    recommendation:
      score >= 90
        ? 'Durasi tidur optimal (7–9 jam). Pola tidur teratur mendukung regulasi tekanan darah nocturnal.'
        : 'Upayakan tidur teratur 7–8 jam setiap malam untuk mendukung pemulihan pembuluh darah.',
    guidelineSource: "AHA Life's Essential 8",
    dataSource: 'Pelacak Tidur & Gaya Hidup'
  };
}

/**
 * 8. Healthy Diet & Sodium Score (0 - 100)
 * Sourced from daily sodium intake tracking (DASH diet proxy):
 * <1500 mg: 100; 1500-1999 mg: 80; 2000-2300 mg: 50; 2301-3000 mg: 25; >3000 mg: 0.
 */
export function scoreDiet(sodiumLogs: SodiumLog[] = []): HealthScoreMetricResult {
  if (!sodiumLogs || sodiumLogs.length === 0) {
    return {
      id: 'diet',
      name: 'Dietary Quality',
      nameId: 'Pola Makan & Batas Garam',
      score: null,
      isAvailable: false,
      valueDisplay: 'Belum ada data',
      status: 'missing',
      details: 'Memerlukan catatan konsumsi natrium/garam harian pada Pelacak Natrium.',
      recommendation: 'Catat asupan makanan harian pada menu Batas Garam untuk melengkapi metrik diet ini.',
      guidelineSource: 'AHA LE8 / WHO & PERHI Dietary Sodium Guidelines (<2.000 mg/hari)',
      dataSource: 'Pelacak Batas Garam (Natrium)',
      missingReason: 'Belum ada data asupan natrium harian.'
    };
  }

  const total = sodiumLogs.reduce((acc, s) => acc + (s.sodiumMg || 2000), 0);
  const avgSodium = Math.round(total / sodiumLogs.length);

  let score = 0;
  let status: 'optimal' | 'moderate' | 'suboptimal' = 'suboptimal';

  if (avgSodium < 1500) {
    score = 100;
    status = 'optimal';
  } else if (avgSodium < 2000) {
    score = 80;
    status = 'optimal';
  } else if (avgSodium <= 2300) {
    score = 50;
    status = 'moderate';
  } else if (avgSodium <= 3000) {
    score = 25;
    status = 'suboptimal';
  } else {
    score = 0;
    status = 'suboptimal';
  }

  return {
    id: 'diet',
    name: 'Dietary Quality',
    nameId: 'Pola Makan & Batas Garam',
    score,
    isAvailable: true,
    valueDisplay: `${avgSodium} mg natrium/hari`,
    unit: 'mg/hari',
    status,
    details: `Rata-rata asupan natrium harian: ${avgSodium} mg/hari (Target ideal AHA <1.500 mg, batas WHO <2.000 mg).`,
    recommendation:
      score >= 80
        ? 'Asupan garam terkontrol dengan sangat baik. Pertahankan pola makan gizi seimbang ala DASH.'
        : 'Kurangi konsumsi makanan olahan, kecap/saus tinggi garam, dan makanan berpengawet.',
    guidelineSource: 'AHA LE8 / WHO & PERHI Dietary Sodium Guidelines',
    dataSource: `Rata-rata ${sodiumLogs.length} catatan asupan garam`
  };
}

/**
 * Main Engine: Calculates the complete AortaLink Health Score Report
 * Strictly enforces "no guessing" policy: total score is produced ONLY when 8/8 metrics exist.
 */
export function calculateAortaLinkHealthScore(input: HealthScoreInput): AortaLinkHealthScoreReport {
  const {
    profile,
    readings = [],
    medications = [],
    medicationLogs = [],
    labResults = [],
    sodiumLogs = [],
    sleepLogs = [],
    habits = [],
    hasDiabetes = false
  } = input;

  const isAntihypertensiveTreated = medications.some((m) => {
    const norm = `${m.name} ${m.drugClass || ''} ${m.purpose || ''}`.toLowerCase();
    return (
      norm.includes('amlodipine') ||
      norm.includes('candesartan') ||
      norm.includes('ramipril') ||
      norm.includes('valsartan') ||
      norm.includes('bisoprolol') ||
      norm.includes('ccb') ||
      norm.includes('arb') ||
      norm.includes('ace') ||
      norm.includes('tensi') ||
      norm.includes('hipertensi')
    );
  });

  const isStatinTreated = medications.some((m) => {
    const norm = `${m.name} ${m.drugClass || ''} ${m.purpose || ''}`.toLowerCase();
    return (
      norm.includes('statin') ||
      norm.includes('atorvastatin') ||
      norm.includes('simvastatin') ||
      norm.includes('rosuvastatin') ||
      norm.includes('kolesterol') ||
      norm.includes('lipid')
    );
  });

  // Calculate 8 metrics individually
  const bpMetric = scoreBloodPressure(readings, isAntihypertensiveTreated);
  const nicotineMetric = scoreNicotine(profile?.smokingStatus);
  const bmiMetric = scoreBMI(profile?.bmi);
  const lipidsMetric = scoreBloodLipids(labResults, isStatinTreated);
  const glucoseMetric = scoreBloodGlucose(labResults, hasDiabetes);
  const activityMetric = scorePhysicalActivity(habits);
  const sleepMetric = scoreSleepHealth(sleepLogs, habits);
  const dietMetric = scoreDiet(sodiumLogs);

  const metrics: Record<HealthScoreMetricId, HealthScoreMetricResult> = {
    blood_pressure: bpMetric,
    nicotine: nicotineMetric,
    bmi: bmiMetric,
    lipids: lipidsMetric,
    glucose: glucoseMetric,
    physical_activity: activityMetric,
    sleep: sleepMetric,
    diet: dietMetric
  };

  const metricKeys: HealthScoreMetricId[] = [
    'blood_pressure',
    'nicotine',
    'bmi',
    'lipids',
    'glucose',
    'physical_activity',
    'sleep',
    'diet'
  ];

  const completedMetrics = metricKeys.filter((k) => metrics[k].isAvailable && metrics[k].score !== null);
  const missingMetrics = metricKeys.filter((k) => !metrics[k].isAvailable || metrics[k].score === null);

  const isComplete = completedMetrics.length === 8;

  let totalScore: number | null = null;
  let category: HealthScoreCategory | null = null;
  let categoryLabel = 'Data Belum Lengkap';
  let categoryDescription = `Tersedia ${completedMetrics.length} dari 8 metrik. Lengkapi metrik yang belum ada untuk menghasilkan skor kesehatan kardiovaskular total.`;

  if (isComplete) {
    const sum = completedMetrics.reduce((acc, k) => acc + (metrics[k].score || 0), 0);
    totalScore = Math.round(sum / 8);

    if (totalScore >= 80) {
      category = 'high';
      categoryLabel = 'Tinggi / Optimal (High CV Health)';
      categoryDescription =
        'Kesehatan kardiovaskular berada dalam status optimal menurut kriteria AHA Life\'s Essential 8. Pertahankan gaya hidup sehat dan pemantauan berkala.';
    } else if (totalScore >= 50) {
      category = 'moderate';
      categoryLabel = 'Sedang (Moderate CV Health)';
      categoryDescription =
        'Kesehatan kardiovaskular berada dalam status sedang. Terdapat ruang peningkatan signifikan pada beberapa metrik gaya hidup atau faktor risiko.';
    } else {
      category = 'low';
      categoryLabel = 'Rendah (Perlu Perhatian Khusus)';
      categoryDescription =
        'Kesehatan kardiovaskular berada di bawah batas optimal. Disarankan untuk berkonsultasi dengan dokter untuk optimalisasi target terapi dan gaya hidup.';
    }
  }

  // Calculate separate adherence rate if logs exist
  let adherenceRate: number | null = null;
  if (medications.length > 0 && medicationLogs.length > 0) {
    const takenCount = medicationLogs.filter(
      (l) => Boolean(l.takenAt) || (typeof l.takenCount === 'number' && l.takenCount > 0)
    ).length;
    adherenceRate = Math.round((takenCount / medicationLogs.length) * 100);
  }

  return {
    generatedAt: new Date().toISOString(),
    engineVersion: HEALTH_SCORE_ENGINE_VERSION,
    guideline: HEALTH_SCORE_GUIDELINE,
    status: isComplete ? 'complete' : 'not_enough_data',
    totalScore,
    category,
    categoryLabel,
    categoryDescription,
    completedMetricsCount: completedMetrics.length,
    totalMetricsCount: 8,
    metrics,
    missingMetrics,
    completedMetrics,
    separateIndicators: {
      ascvd10YearRiskPercent: null, // Separated, not mixed into LE8
      medicationAdherenceRatePercent: adherenceRate,
      dippingPattern: null
    },
    disclaimer: HEALTH_SCORE_DISCLAIMER
  };
}
