/**
 * AortaLink On-Device Clinical ML — Adherence Impact Model
 * --------------------------------------------------------
 * A logistic regression trained on-device with full-batch gradient descent
 * on the user's OWN daily records. Each labelled day is one training example:
 *
 *   features = [1, adherence, sodium, sleep]
 *   label    = 1 when that day's average BP met the personal target
 *
 * The learned weights are reported as odds ratios with 95% bootstrap
 * confidence intervals; only ratios whose interval excludes 1 are
 * interpreted, and always as association, not causation. Measurement
 * frequency was dropped as a feature: people measure more often when their
 * BP is high (reverse causality). Deterministic — seeded bootstrap, so the
 * same data always yields the same model. No randomness, no server, no fabrication:
 * when there are fewer than MIN_LABELED_DAYS labelled days the analysis says
 * so instead of guessing.
 */

import type { BPReading, MedicationItem, MedicationLog, SleepLog, SodiumLog } from '../../types/blood-pressure.ts';
import { sigmoid, mean, round, seededRandom, quantile } from './statistics.ts';

export type AdherenceFeature = 'kepatuhan_obat' | 'natrium' | 'tidur';

export interface FeatureWeight {
  feature: AdherenceFeature;
  /** Raw logistic-regression weight (log-odds per unit feature). */
  weight: number;
}

export interface OddsRatioInterpretation {
  feature: AdherenceFeature;
  oddsRatio: number;
  /** 95% percentile-bootstrap confidence interval of the odds ratio. */
  ci95: [number, number];
  interpretation: string;
}

export interface DayGroupStats {
  n: number;
  avgSystolic: number | null;
  avgDiastolic: number | null;
}

export interface AdherenceAnalysis {
  /** False when fewer than MIN_LABELED_DAYS labelled days exist — the model refuses to guess. */
  sufficientData: boolean;
  minDaysRequired: number;
  nLabeledDays: number;
  /** Share of scheduled medication doses actually logged, 0..1 (null if no schedule). */
  adherenceRate: number | null;
  /** Share of labelled days on which the BP target was met, 0..1. */
  controlledDaysShare: number | null;
  model: {
    kind: 'logistic_regression_gradient_descent';
    weights: FeatureWeight[];
    learningRate: number;
    epochs: number;
    l2Regularization: number;
    bootstrapResamples: number;
    trainedAt: string;
  } | null;
  oddsRatios: OddsRatioInterpretation[] | null;
  /** Model estimate (0..1) that today's BP will meet the target, given the most recent behaviour. */
  controlProbabilityToday: number | null;
  evidence: {
    highAdherenceDays: DayGroupStats;
    lowAdherenceDays: DayGroupStats;
  } | null;
  assessment: string;
}

const MIN_LABELED_DAYS = 14;
const TRAIN_WINDOW_DAYS = 60;
const LEARNING_RATE = 0.1;
const EPOCHS = 300;
const L2 = 0.01;
const BOOTSTRAP_RESAMPLES = 200;

interface LabeledDay {
  dateKey: string; // YYYY-MM-DD
  adherence: number; // 0..1, logged doses / scheduled doses
  sodiumNorm: number; // 0..1.5, grams-ish scale (mg / 2000)
  sleepNorm: number; // hours / 8
  label: 0 | 1;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Doses expected per day from a medication's schedule. As-needed meds are excluded. */
export function scheduledDosesPerDay(med: MedicationItem): number {
  switch (med.schedule) {
    case 'pagi':
    case 'siang':
    case 'sore':
    case 'malam':
      return 1;
    case 'pagi_malam':
      return 2;
    case 'sesuai_kebutuhan':
      return 0; // as-needed — excluded from the adherence denominator
    default:
      return 1;
  }
}

export function analyzeAdherenceImpact(input: {
  medications: MedicationItem[];
  medicationLogs: MedicationLog[];
  readings: BPReading[];
  sodiumLogs: SodiumLog[];
  sleepLogs: SleepLog[];
  targetSystolic: number;
  targetDiastolic: number;
}): AdherenceAnalysis {
  const { medications, medicationLogs, readings, sodiumLogs, sleepLogs, targetSystolic, targetDiastolic } = input;

  const scheduledMeds = medications.filter((m) => scheduledDosesPerDay(m) > 0);
  const dailyScheduledDoses = scheduledMeds.reduce((sum, m) => sum + scheduledDosesPerDay(m), 0);

  // Index real logs and readings by calendar day.
  const dosesByDay = new Map<string, number>();
  for (const log of medicationLogs) {
    if (!log.takenAt) continue;
    const key = dateKey(new Date(log.takenAt));
    dosesByDay.set(key, (dosesByDay.get(key) || 0) + 1);
  }

  const readingsByDay = new Map<string, BPReading[]>();
  for (const r of readings) {
    const key = dateKey(new Date(r.timestamp));
    const list = readingsByDay.get(key);
    if (list) list.push(r);
    else readingsByDay.set(key, [r]);
  }

  const sodiumByDay = new Map<string, number>();
  for (const s of sodiumLogs) {
    sodiumByDay.set(s.date, (sodiumByDay.get(s.date) || 0) + s.sodiumMg);
  }

  const sleepByDay = new Map<string, number>();
  for (const s of sleepLogs) {
    if (!sleepByDay.has(s.date)) sleepByDay.set(s.date, s.sleepHours);
  }

  // Build labelled training days over the recent window.
  const labelledDays: LabeledDay[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0); // include today's partial data
  for (let i = 1; i <= TRAIN_WINDOW_DAYS; i++) {
    const d = new Date(today.getTime() - i * 86_400_000);
    const key = dateKey(d);

    const dayReadings = readingsByDay.get(key);
    if (!dayReadings || dayReadings.length === 0) continue; // no reading that day → no label possible

    const avgSys = mean(dayReadings.map((r) => r.systolic));
    const avgDia = mean(dayReadings.map((r) => r.diastolic));

    const adherence = dailyScheduledDoses > 0 ? Math.min(1, (dosesByDay.get(key) || 0) / dailyScheduledDoses) : 0;
    const sodiumMg = sodiumByDay.get(key);
    const sleepHours = sleepByDay.get(key);

    labelledDays.push({
      dateKey: key,
      adherence,
      sodiumNorm: sodiumMg !== undefined ? Math.min(1.5, sodiumMg / 2000) : 1.0, // neutral prior at the DASH upper bound
      sleepNorm: sleepHours !== undefined ? Math.min(1.2, sleepHours / 8) : 1.0, // neutral prior at 8h
      label: avgSys <= targetSystolic && avgDia <= targetDiastolic ? 1 : 0
    });
  }

  const nLabeledDays = labelledDays.length;
  const controlledCount = labelledDays.filter((d) => d.label === 1).length;

  let overallAdherence: number | null = null;
  if (scheduledMeds.length > 0 && dailyScheduledDoses > 0 && nLabeledDays > 0) {
    const totalScheduled = nLabeledDays * dailyScheduledDoses;
    const totalTaken = labelledDays.reduce((sum, d) => sum + d.adherence * dailyScheduledDoses, 0);
    overallAdherence = totalScheduled > 0 ? totalTaken / totalScheduled : null;
  }

  const base: AdherenceAnalysis = {
    sufficientData: false,
    minDaysRequired: MIN_LABELED_DAYS,
    nLabeledDays,
    adherenceRate: overallAdherence,
    controlledDaysShare: nLabeledDays > 0 ? controlledCount / nLabeledDays : null,
    model: null,
    oddsRatios: null,
    controlProbabilityToday: null,
    evidence: null,
    assessment: buildInsufficientAssessment(nLabeledDays, MIN_LABELED_DAYS, scheduledMeds.length)
  };

  if (nLabeledDays < MIN_LABELED_DAYS) return base;

  const weights = trainLogistic(labelledDays);
  const epochs = EPOCHS;

  // Percentile bootstrap: refit on resampled days (seeded → reproducible).
  const rand = seededRandom(nLabeledDays * 7919 + controlledCount);
  const bootWeights: number[][] = [];
  for (let b = 0; b < BOOTSTRAP_RESAMPLES; b++) {
    const sample = labelledDays.map(() => labelledDays[Math.floor(rand() * nLabeledDays)]);
    bootWeights.push(trainLogistic(sample));
  }

  const featureNames: AdherenceFeature[] = ['kepatuhan_obat', 'natrium', 'tidur'];
  const featureWeights: FeatureWeight[] = featureNames.map((name, i) => ({ feature: name, weight: weights[i + 1] }));

  const oddsRatios: OddsRatioInterpretation[] = featureWeights
    .map((fw, i) => {
      const boot = bootWeights.map((w) => w[i + 1]);
      const ci95: [number, number] = [Math.exp(quantile(boot, 0.025)), Math.exp(quantile(boot, 0.975))];
      return {
        feature: fw.feature,
        oddsRatio: Math.exp(fw.weight),
        ci95,
        interpretation: interpretOddsRatio(fw.feature, fw.weight, ci95)
      };
    })
    .filter((o) => o.interpretation.length > 0);

  // Probability estimate for today given the most recent behaviour (yesterday's actuals).
  const yesterdayKey = dateKey(new Date(today.getTime() - 86_400_000));
  const yesterdayDay = labelledDays.find((d) => d.dateKey === yesterdayKey);
  const probFeatures = [
    1,
    yesterdayDay ? yesterdayDay.adherence : mean(labelledDays.map((d) => d.adherence)),
    yesterdayDay ? yesterdayDay.sodiumNorm : mean(labelledDays.map((d) => d.sodiumNorm)),
    yesterdayDay ? yesterdayDay.sleepNorm : mean(labelledDays.map((d) => d.sleepNorm))
  ];
  const controlProbabilityToday = sigmoid(probFeatures.reduce((sum, f, i) => sum + f * weights[i], 0));

  // Descriptive evidence: BP on high- vs low-adherence days (correlation, not causation).
  const high = labelledDays.filter((d) => d.adherence >= 0.8);
  const low = labelledDays.filter((d) => d.adherence < 0.5);
  const evidence = {
    highAdherenceDays: dayStats(high, readingsByDay),
    lowAdherenceDays: dayStats(low, readingsByDay)
  };

  // Only a factor whose CI excludes 1 can be called dominant.
  const supported = oddsRatios.map((o) => featureWeights.find((fw) => fw.feature === o.feature)!);
  const dominant = [...supported].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))[0] ?? null;

  return {
    sufficientData: true,
    minDaysRequired: MIN_LABELED_DAYS,
    nLabeledDays,
    adherenceRate: overallAdherence,
    controlledDaysShare: nLabeledDays > 0 ? controlledCount / nLabeledDays : null,
    model: {
      kind: 'logistic_regression_gradient_descent',
      weights: featureWeights,
      learningRate: LEARNING_RATE,
      epochs,
      l2Regularization: L2,
      bootstrapResamples: BOOTSTRAP_RESAMPLES,
      trainedAt: new Date().toISOString()
    },
    oddsRatios,
    controlProbabilityToday,
    evidence,
    assessment: buildAssessment(
      overallAdherence,
      controlledCount / nLabeledDays,
      dominant,
      controlProbabilityToday,
      nLabeledDays,
      controlledCount
    )
  };
}

/** Full-batch gradient-descent logistic regression with L2 on non-bias terms. Deterministic. */
function trainLogistic(days: LabeledDay[]): number[] {
  const weights = [0, 0, 0, 0]; // [bias, adherence, sodium, sleep]
  const n = days.length;
  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const gradient = [0, 0, 0, 0];
    for (const day of days) {
      const features = [1, day.adherence, day.sodiumNorm, day.sleepNorm];
      const z = features.reduce((sum, f, i) => sum + f * weights[i], 0);
      const error = sigmoid(z) - day.label;
      for (let i = 0; i < features.length; i++) gradient[i] += error * features[i];
    }
    for (let i = 0; i < weights.length; i++) {
      const reg = i === 0 ? 0 : L2 * weights[i];
      weights[i] -= (LEARNING_RATE / n) * gradient[i] + LEARNING_RATE * reg;
    }
  }
  return weights;
}

function dayStats(days: LabeledDay[], readingsByDay: Map<string, BPReading[]>,): DayGroupStats {
  if (days.length === 0) return { n: 0, avgSystolic: null, avgDiastolic: null };
  const allReadings = days.flatMap((d) => readingsByDay.get(d.dateKey) || []);
  if (allReadings.length === 0) return { n: days.length, avgSystolic: null, avgDiastolic: null };
  return {
    n: days.length,
    avgSystolic: round(mean(allReadings.map((r) => r.systolic)), 1),
    avgDiastolic: round(mean(allReadings.map((r) => r.diastolic)), 1)
  };
}

function interpretOddsRatio(feature: AdherenceFeature, weight: number, ci95: [number, number]): string {
  if (Math.abs(weight) < 0.1) return ''; // negligible contribution — do not overinterpret
  if (ci95[0] <= 1 && ci95[1] >= 1) return ''; // CI includes 1 — no supported association
  const or = Math.exp(weight);
  const featureLabel: Record<AdherenceFeature, string> = {
    kepatuhan_obat: 'Kepatuhan minum obat',
    natrium: 'Asupan natrium',
    tidur: 'Durasi tidur'
  };
  const direction = weight > 0 ? 'lebih tinggi' : 'lebih rendah';
  return `${featureLabel[feature]} berasosiasi dengan peluang hari terkontrol yang ${direction} (OR ${or.toFixed(1)}, CI 95% ${ci95[0].toFixed(1)}–${ci95[1].toFixed(1)}). Ini asosiasi dari data Anda, bukan bukti sebab-akibat.`;
}

function buildInsufficientAssessment(nLabeledDays: number, required: number, scheduledMedCount: number): string {
  const medNote =
    scheduledMedCount === 0
      ? ' Belum ada obat terjadwal — tambahkan regimen obat di tab Terapi agar kepatuhan dapat dipelajari model.'
      : '';
  if (nLabeledDays === 0) {
    return `Model keterkaitan kepatuhan belum memiliki data${medNote} Catat pengukuran dan konsumsi obat setiap hari.`;
  }
  return `Model butuh minimal ${required} hari data bermakna, baru terkumpul ${nLabeledDays} hari.${medNote} Teruskan pengukuran harian — analisis akan aktif otomatis.`;
}

function buildAssessment(
  adherence: number | null,
  controlledShare: number,
  dominant: FeatureWeight | null,
  probabilityToday: number,
  nDays: number,
  controlledDays: number
): string {
  const adherenceText =
    adherence === null
      ? 'Tidak ada obat terjadwal'
      : `Kepatuhan obat Anda ${Math.round(adherence * 100)}%`;
  const controlText = `${controlledDays} dari ${nDays} hari terkontrol (${Math.round(controlledShare * 100)}%)`;
  const probText = ` Estimasi model untuk hari ini: ${Math.round(probabilityToday * 100)}% peluang terkontrol (perkiraan statistik, bukan jaminan).`;

  const dominantText = !dominant
    ? 'Belum ada faktor yang asosiasinya didukung data (interval kepercayaan masih mencakup 1).'
    : dominant.feature === 'kepatuhan_obat'
      ? 'Kepatuhan minum obat paling berasosiasi dengan kontrol tekanan darah Anda.'
      : dominant.feature === 'natrium'
        ? 'Asupan natrium paling berasosiasi dengan kontrol tekanan darah Anda.'
        : 'Durasi tidur paling berasosiasi dengan kontrol tekanan darah Anda.';

  if (adherence !== null && adherence < 0.7) {
    return `${adherenceText} dan ${controlText}. Kepatuhan di bawah 70%: dosis yang terlewat adalah penyebab umum tekanan darah tidak terkontrol.${probText}`;
  }
  return `${adherenceText}, ${controlText}. ${dominantText}${probText}`;
}
