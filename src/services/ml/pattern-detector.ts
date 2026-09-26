/**
 * AortaLink On-Device Clinical ML — Pattern Detector
 * --------------------------------------------------
 * Compares real subgroups of the user's own measurements (clinic vs home,
 * morning vs evening, weekday vs weekend) to surface behavioural BP patterns.
 * Every finding reports the group sizes behind it and degrades honestly to
 * "not_enough_data" when a comparison cannot be made.
 */

import { BPReading } from '../../types/blood-pressure';
import { mean, stdDev } from './statistics';

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
  interpretation: string;
}

const MIN_GROUP = 3;

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
      interpretation:
        'Butuh minimal 3 pengukuran di klinik/rumah sakit dan 3 di rumah untuk mendeteksi efek white-coat. Tandai konteks pengukuran saat mencatat.'
    };
  }

  const diff = mean(clinic.map((r) => r.systolic)) - mean(home.map((r) => r.systolic));
  if (diff >= 10) {
    return {
      key: 'white_coat',
      label: 'Efek White-Coat',
      detected: true,
      strength: 'significant',
      effectSize: Math.round(diff),
      groupSizes: [clinic.length, home.length],
      interpretation: `Tekanan darah di fasilitas kesehatan rata-rata ${Math.round(diff)} mmHg lebih tinggi daripada di rumah. Ini pola khas white-coat hypertension — data rumah Anda lebih mewakili kondisi sehari-hari, namun seretakan kedua angka ini saat konsultasi.`
    };
  }
  if (diff >= 5) {
    return {
      key: 'white_coat',
      label: 'Efek White-Coat',
      detected: true,
      strength: 'mild',
      effectSize: Math.round(diff),
      groupSizes: [clinic.length, home.length],
      interpretation: `Terdapat kecenderungan kenaikan ${Math.round(diff)} mmHg saat pengukuran di fasilitas kesehatan. Perbanyak pengukuran rumah untuk konfirmasi.`
    };
  }
  return {
    key: 'white_coat',
    label: 'Efek White-Coat',
    detected: false,
    strength: 'none',
    effectSize: Math.round(diff),
    groupSizes: [clinic.length, home.length],
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
      interpretation: 'Tidak dapat dievaluasi — butuh minimal 3 pengukuran di klinik dan 3 di rumah.'
    };
  }

  const avgHomeSys = mean(home.map((r) => r.systolic));
  const avgHomeDia = mean(home.map((r) => r.diastolic));
  const avgClinicSys = mean(clinic.map((r) => r.systolic));

  const homeHigh = avgHomeSys >= 135 || avgHomeDia >= 85;
  const clinicNormal = avgClinicSys < 130;

  if (homeHigh && clinicNormal) {
    return {
      key: 'masked_hypertension',
      label: 'Indikasi Masked Hypertension',
      detected: true,
      strength: 'significant',
      effectSize: Math.round(avgHomeSys - avgClinicSys),
      groupSizes: [clinic.length, home.length],
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
      interpretation:
        'Butuh minimal 3 pengukuran pagi (05–10) dan 3 pengukuran malam (18–23). Ukur di kedua waktu secara bergantian.'
    };
  }

  const diff = mean(morning.map((r) => r.systolic)) - mean(evening.map((r) => r.systolic));
  if (diff >= 8) {
    return {
      key: 'morning_surge',
      label: 'Lonjakan Pagi (Morning Surge)',
      detected: true,
      strength: 'significant',
      effectSize: Math.round(diff),
      groupSizes: [morning.length, evening.length],
      interpretation: `Pengukuran pagi rata-rata ${Math.round(diff)} mmHg lebih tinggi daripada malam. Lonjakan pagi adalah faktor risiko kardiovaskular yang penting — pastikan obat pagi diminum tepat waktu dan ceritakan pola ini ke dokter.`
    };
  }
  if (diff >= 4) {
    return {
      key: 'morning_surge',
      label: 'Lonjakan Pagi (Morning Surge)',
      detected: true,
      strength: 'mild',
      effectSize: Math.round(diff),
      groupSizes: [morning.length, evening.length],
      interpretation: `Ada kecenderungan kenaikan ${Math.round(diff)} mmHg di pagi hari. Lanjutkan pemantauan pagi/malam untuk konfirmasi.`
    };
  }
  return {
    key: 'morning_surge',
    label: 'Lonjakan Pagi (Morning Surge)',
    detected: false,
    strength: 'none',
    effectSize: Math.round(diff),
    groupSizes: [morning.length, evening.length],
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
      interpretation: 'Butuh minimal 3 pengukuran pada hari kerja dan 3 pada akhir pekan.'
    };
  }

  const diff = mean(weekend.map((r) => r.systolic)) - mean(weekday.map((r) => r.systolic));
  if (Math.abs(diff) >= 5) {
    const worse = diff > 0 ? 'akhir pekan' : 'hari kerja';
    return {
      key: 'weekend_effect',
      label: 'Pola Akhir Pekan',
      detected: true,
      strength: 'mild',
      effectSize: Math.round(diff),
      groupSizes: [weekday.length, weekend.length],
      interpretation: `Tekanan darah cenderung lebih tinggi pada ${worse} (selisih ${Math.round(Math.abs(diff))} mmHg). Cek pola makan, tidur, dan jadwal obat di waktu tersebut.`
    };
  }
  return {
    key: 'weekend_effect',
    label: 'Pola Akhir Pekan',
    detected: false,
    strength: 'none',
    effectSize: Math.round(diff),
    groupSizes: [weekday.length, weekend.length],
    interpretation: 'Tidak ada perbedaan bermakna antara hari kerja dan akhir pekan.'
  };
}
