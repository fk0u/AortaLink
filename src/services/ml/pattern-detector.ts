/**
 * AortaLink On-Device Clinical ML — Pattern Detector
 * --------------------------------------------------
 * Compares real subgroups of the user's own measurements (clinic vs home,
 * morning vs evening, weekday vs weekend) to surface behavioural BP patterns.
 * Every finding reports the group sizes behind it and degrades honestly to
 * "not_enough_data" when a comparison cannot be made.
 *
 * Group differences are only called 'significant' when the effect is large
 * enough to matter AND Welch's t-test gives p < 0.05. A large effect without
 * statistical support is reported as 'mild' (indicative). Thresholds-only
 * findings (masked hypertension, variability) carry pValue = null.
 */

import type { BPReading } from '../../types/blood-pressure.ts';
import { mean, stdDev, welchTTest } from './statistics.ts';

export type BpPatternKey =
  | 'white_coat'
  | 'masked_hypertension'
  | 'morning_surge'
  | 'high_variability'
  | 'weekend_effect';

export type PatternStrength = 'not_enough_data' | 'none' | 'mild' | 'significant';

export interface BpPatternFinding {
  key: BpPatternKey;
  label: string;
  detected: boolean;
  strength: PatternStrength;
  /** Effect size in mmHg (or mmHg stddev for variability); null when not computable. */
  effectSize: number | null;
  /** Sizes of the two groups being compared, e.g. [clinicN, homeN]. */
  groupSizes: [number, number];
  /** Welch t-test p-value for group comparisons; null for threshold-based findings. */
  pValue: number | null;
  interpretation: string;
}

const MIN_GROUP = 3;
const ALPHA = 0.05;

/** Effect + Welch test → strength. 'significant' needs both a large effect and p < ALPHA. */
function grade(a: number[], b: number[], strongEffect: number, mildEffect: number, absolute = false) {
  const diff = mean(a) - mean(b);
  const effect = absolute ? Math.abs(diff) : diff;
  const pValue = welchTTest(a, b)?.pValue ?? 1;
  const strength: PatternStrength =
    effect >= strongEffect && pValue < ALPHA ? 'significant' : effect >= mildEffect ? 'mild' : 'none';
  return { diff, pValue, strength };
}

function pText(p: number): string {
  return p < 0.001 ? 'p<0,001' : `p=${p.toFixed(3).replace('.', ',')}`;
}

export function detectBpPatterns(readings: BPReading[]): BpPatternFinding[] {
  return [
    detectWhiteCoat(readings),
    detectMaskedHypertension(readings),
    detectMorningSurge(readings),
    detectVariability(readings),
    detectWeekendEffect(readings)
  ];
}

function hoursOfDay(r: BPReading): number {
  return new Date(r.timestamp).getHours();
}

/** Clinic/office readings vs home readings — classic white-coat effect detection. */
function detectWhiteCoat(readings: BPReading[]): BpPatternFinding {
  const clinic = readings.filter((r) => r.measurement_context === 'Clinic/Hospital');
  const home = readings.filter((r) => r.measurement_context === 'Home' || !r.measurement_context);

  if (clinic.length < MIN_GROUP || home.length < MIN_GROUP) {
    return {
      key: 'white_coat',
      label: 'Efek White-Coat',
      detected: false,
      strength: 'not_enough_data',
      effectSize: null,
      groupSizes: [clinic.length, home.length],
      pValue: null,
      interpretation:
        'Butuh minimal 3 pengukuran di klinik/rumah sakit dan 3 di rumah untuk mendeteksi efek white-coat. Tandai konteks pengukuran saat mencatat.'
    };
  }

  const { diff, pValue, strength } = grade(clinic.map((r) => r.systolic), home.map((r) => r.systolic), 10, 5);
  if (strength === 'significant') {
    return {
      key: 'white_coat',
      label: 'Efek White-Coat',
      detected: true,
      strength: 'significant',
      effectSize: Math.round(diff),
      groupSizes: [clinic.length, home.length],
      pValue,
      interpretation: `Tekanan darah di fasilitas kesehatan rata-rata ${Math.round(diff)} mmHg lebih tinggi daripada di rumah. Ini pola khas white-coat hypertension — data rumah Anda lebih mewakili kondisi sehari-hari, namun sertakan kedua angka ini saat konsultasi (${pText(pValue)}).`
    };
  }
  if (strength === 'mild') {
    return {
      key: 'white_coat',
      label: 'Efek White-Coat',
      detected: true,
      strength: 'mild',
      effectSize: Math.round(diff),
      groupSizes: [clinic.length, home.length],
      pValue,
      interpretation: `Ada kecenderungan kenaikan ${Math.round(diff)} mmHg saat pengukuran di fasilitas kesehatan, tetapi belum bermakna secara statistik (${pText(pValue)}). Perbanyak pengukuran untuk konfirmasi.`
    };
  }
  return {
    key: 'white_coat',
    label: 'Efek White-Coat',
    detected: false,
    strength: 'none',
    effectSize: Math.round(diff),
    groupSizes: [clinic.length, home.length],
    pValue,
    interpretation: 'Tidak ada perbedaan bermakna antara pengukuran di klinik dan di rumah.'
  };
}

/** Home readings high while recent clinic readings normal — masked hypertension direction. */
function detectMaskedHypertension(readings: BPReading[]): BpPatternFinding {
  const clinic = readings.filter((r) => r.measurement_context === 'Clinic/Hospital');
  const home = readings.filter((r) => r.measurement_context === 'Home' || !r.measurement_context);

  if (clinic.length < MIN_GROUP || home.length < MIN_GROUP) {
    return {
      key: 'masked_hypertension',
      label: 'Indikasi Masked Hypertension',
      detected: false,
      strength: 'not_enough_data',
      effectSize: null,
      groupSizes: [clinic.length, home.length],
      pValue: null,
      interpretation: 'Tidak dapat dievaluasi — butuh minimal 3 pengukuran di klinik dan 3 di rumah.'
    };
  }

  const avgHomeSys = mean(home.map((r) => r.systolic));
  const avgHomeDia = mean(home.map((r) => r.diastolic));
  const avgClinicSys = mean(clinic.map((r) => r.systolic));
  const avgClinicDia = mean(clinic.map((r) => r.diastolic));

  // ESH 2023: home hypertension ≥135/85, office normal <140/90.
  const homeHigh = avgHomeSys >= 135 || avgHomeDia >= 85;
  const clinicNormal = avgClinicSys < 140 && avgClinicDia < 90;

  if (homeHigh && clinicNormal) {
    return {
      key: 'masked_hypertension',
      label: 'Indikasi Masked Hypertension',
      detected: true,
      strength: 'significant',
      effectSize: Math.round(avgHomeSys - avgClinicSys),
      groupSizes: [clinic.length, home.length],
      pValue: null,
      interpretation: `Kebalikan white-coat: di rumah rata-rata ${Math.round(avgHomeSys)}/${Math.round(avgHomeDia)} mmHg (di atas batas), namun di klinik normal. Pola ini sering terlewat — sampaikan temuan ini kepada dokter Anda beserta data rumahnya.`
    };
  }
  return {
    key: 'masked_hypertension',
    label: 'Indikasi Masked Hypertension',
    detected: false,
    strength: 'none',
    effectSize: Math.round(avgHomeSys - avgClinicSys),
    groupSizes: [clinic.length, home.length],
    pValue: null,
    interpretation: 'Tidak ada indikasi tekanan tersembunyi — pengukuran rumah dan klinik Anda konsisten.'
  };
}

/** Early-morning (05–10) vs evening (18–23) systolic difference — morning surge screening. */
function detectMorningSurge(readings: BPReading[]): BpPatternFinding {
  const morning = readings.filter((r) => {
    const h = hoursOfDay(r);
    return h >= 5 && h < 10;
  });
  const evening = readings.filter((r) => {
    const h = hoursOfDay(r);
    return h >= 18 && h < 23;
  });

  if (morning.length < MIN_GROUP || evening.length < MIN_GROUP) {
    return {
      key: 'morning_surge',
      label: 'Lonjakan Pagi (Morning Surge)',
      detected: false,
      strength: 'not_enough_data',
      effectSize: null,
      groupSizes: [morning.length, evening.length],
      pValue: null,
      interpretation:
        'Butuh minimal 3 pengukuran pagi (05–10) dan 3 pengukuran malam (18–23). Ukur di kedua waktu secara bergantian.'
    };
  }

  const { diff, pValue, strength } = grade(morning.map((r) => r.systolic), evening.map((r) => r.systolic), 8, 4);
  if (strength === 'significant') {
    return {
      key: 'morning_surge',
      label: 'Lonjakan Pagi (Morning Surge)',
      detected: true,
      strength: 'significant',
      effectSize: Math.round(diff),
      groupSizes: [morning.length, evening.length],
      pValue,
      interpretation: `Pengukuran pagi rata-rata ${Math.round(diff)} mmHg lebih tinggi daripada malam. Selisih ini bermakna secara statistik (${pText(pValue)}). Ceritakan pola ini ke dokter dan bawa catatan pengukuran pagi/malam Anda.`
    };
  }
  if (strength === 'mild') {
    return {
      key: 'morning_surge',
      label: 'Lonjakan Pagi (Morning Surge)',
      detected: true,
      strength: 'mild',
      effectSize: Math.round(diff),
      groupSizes: [morning.length, evening.length],
      pValue,
      interpretation: `Ada kecenderungan kenaikan ${Math.round(diff)} mmHg di pagi hari, belum bermakna secara statistik (${pText(pValue)}). Lanjutkan pemantauan pagi/malam untuk konfirmasi.`
    };
  }
  return {
    key: 'morning_surge',
    label: 'Lonjakan Pagi (Morning Surge)',
    detected: false,
    strength: 'none',
    effectSize: Math.round(diff),
    groupSizes: [morning.length, evening.length],
    pValue,
    interpretation: 'Tidak ada lonjakan pagi yang bermakna — variasi pagi-malam Anda dalam batas wajar.'
  };
}

/** Day-to-day variability (stddev of systolic) over the most recent 14 days. */
function detectVariability(readings: BPReading[]): BpPatternFinding {
  const cutoff = Date.now() - 14 * 86_400_000;
  const recent = readings.filter((r) => new Date(r.timestamp).getTime() >= cutoff);

  if (recent.length < MIN_GROUP) {
    return {
      key: 'high_variability',
      label: 'Variabilitas Tekanan Darah',
      detected: false,
      strength: 'not_enough_data',
      effectSize: null,
      groupSizes: [recent.length, 0],
      pValue: null,
      interpretation: 'Butuh minimal 3 pengukuran dalam 14 hari terakhir untuk menilai variabilitas.'
    };
  }

  const sd = stdDev(recent.map((r) => r.systolic));
  if (sd >= 12) {
    return {
      key: 'high_variability',
      label: 'Variabilitas Tekanan Darah',
      detected: true,
      strength: 'significant',
      effectSize: Math.round(sd),
      groupSizes: [recent.length, 0],
      pValue: null,
      interpretation: `Tekanan darah Anda berfluktuasi lebar (simpangan baku ${Math.round(sd)} mmHg dalam 14 hari). Variabilitas tinggi berkaitan dengan risiko kardiovaskular — periksa konsistensi waktu ukur, posisi duduk, dan kepatuhan obat.`
    };
  }
  if (sd >= 8) {
    return {
      key: 'high_variability',
      label: 'Variabilitas Tekanan Darah',
      detected: true,
      strength: 'mild',
      effectSize: Math.round(sd),
      groupSizes: [recent.length, 0],
      pValue: null,
      interpretation: `Fluktuasi antar-pengukuran cukup besar (simpangan baku ${Math.round(sd)} mmHg). Ukur pada jam yang sama setiap hari untuk hasil yang lebih dapat dibandingkan.`
    };
  }
  return {
    key: 'high_variability',
    label: 'Variabilitas Tekanan Darah',
    detected: false,
    strength: 'none',
    effectSize: Math.round(sd),
    groupSizes: [recent.length, 0],
    pValue: null,
    interpretation: `Pengukuran Anda konsisten (simpangan baku ${Math.round(sd)} mmHg) — kondisi ini ideal untuk memantau efek terapi.`
  };
}

/** Weekend (Sat–Sun) vs weekday (Mon–Fri) systolic difference. */
function detectWeekendEffect(readings: BPReading[]): BpPatternFinding {
  const weekend: BPReading[] = [];
  const weekday: BPReading[] = [];
  for (const r of readings) {
    const day = new Date(r.timestamp).getDay();
    if (day === 0 || day === 6) weekend.push(r);
    else weekday.push(r);
  }

  if (weekend.length < MIN_GROUP || weekday.length < MIN_GROUP) {
    return {
      key: 'weekend_effect',
      label: 'Pola Akhir Pekan',
      detected: false,
      strength: 'not_enough_data',
      effectSize: null,
      groupSizes: [weekday.length, weekend.length],
      pValue: null,
      interpretation: 'Butuh minimal 3 pengukuran pada hari kerja dan 3 pada akhir pekan.'
    };
  }

  const { diff, pValue, strength } = grade(weekend.map((r) => r.systolic), weekday.map((r) => r.systolic), 5, 5, true);
  if (strength !== 'none') {
    const worse = diff > 0 ? 'akhir pekan' : 'hari kerja';
    return {
      key: 'weekend_effect',
      label: 'Pola Akhir Pekan',
      detected: true,
      strength,
      effectSize: Math.round(diff),
      groupSizes: [weekday.length, weekend.length],
      pValue,
      interpretation: `Tekanan darah cenderung lebih tinggi pada ${worse} (selisih ${Math.round(Math.abs(diff))} mmHg, ${pText(pValue)}). Cek pola makan, tidur, dan jadwal obat di waktu tersebut.`
    };
  }
  return {
    key: 'weekend_effect',
    label: 'Pola Akhir Pekan',
    detected: false,
    strength: 'none',
    effectSize: Math.round(diff),
    groupSizes: [weekday.length, weekend.length],
    pValue,
    interpretation: 'Tidak ada perbedaan bermakna antara hari kerja dan akhir pekan.'
  };
}
