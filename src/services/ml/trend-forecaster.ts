/**
 * AortaLink On-Device Clinical ML — Trend Forecaster
 * --------------------------------------------------
 * OLS regression over the user's real readings to model the systolic /
 * diastolic trajectory, quantify the weekly change, and project the next
 * days with a t-based 95% prediction interval. The model is fitted on-device from the
 * user's own data only — nothing is uploaded and nothing is invented.
 */

import type { BPReading } from '../../types/blood-pressure.ts';
import { olsFit, predictionHalfWidth, type RegressionResult } from './statistics.ts';

export type TrendDirection = 'rising' | 'falling' | 'stable';

export interface TrendForecastPoint {
  date: string; // ISO
  systolic: number;
  diastolic: number;
  low: number; // 95% prediction interval lower bound (systolic)
  high: number; // 95% prediction interval upper bound (systolic)
}

export interface BpTrendForecast {
  nReadings: number;
  spanDays: number;
  /** False when there is too little data to identify a trend (< 5 readings or < 7 days span). */
  sufficientData: boolean;
  systolic: RegressionResult | null;
  diastolic: RegressionResult | null;
  /** Fitted change per week, mmHg (positive = increasing). */
  slopePerWeekSystolic: number | null;
  slopePerWeekDiastolic: number | null;
  direction: TrendDirection;
  /** True when the slope is large enough to matter AND distinguishable from zero (slope t-test p < 0.05). */
  isClinicallySignificant: boolean;
  forecast: TrendForecastPoint[];
  assessment: string;
  confidenceNote: string;
}

/** Minimum data for the regression to be reported at all. */
const MIN_READINGS = 5;
const MIN_SPAN_DAYS = 7;
/** A slope must exceed this (mmHg/week) AND pass the slope t-test to be called significant. */
const SIGNIFICANT_SLOPE_PER_WEEK = 1.5;
const ALPHA = 0.05;
/** |slope| below this (mmHg/week) is treated as flat. */
const STABLE_SLOPE_EPSILON = 1.0;

export function forecastBpTrend(readings: BPReading[], horizonDays = 7): BpTrendForecast {
  const validReadings = readings.filter((r) => !r.isExcludedFromAverages);
  const effectiveReadings = validReadings.length >= MIN_READINGS ? validReadings : readings;
  const sorted = [...effectiveReadings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const nReadings = sorted.length;
  const empty: BpTrendForecast = {
    nReadings,
    spanDays: 0,
    sufficientData: false,
    systolic: null,
    diastolic: null,
    slopePerWeekSystolic: null,
    slopePerWeekDiastolic: null,
    direction: 'stable',
    isClinicallySignificant: false,
    forecast: [],
    assessment:
      nReadings === 0
        ? 'Belum ada data pengukuran. Catat setidaknya 5 pengukuran selama 7 hari agar model tren dapat bekerja.'
        : `Baru ${nReadings} pengukuran. Model tren membutuhkan minimal 5 pengukuran dalam rentang 7 hari.`,
    confidenceNote: 'Data belum cukup untuk memodelkan tren.'
  };
  if (nReadings < MIN_READINGS) return empty;

  const firstTime = new Date(sorted[0].timestamp).getTime();
  const lastTime = new Date(sorted[nReadings - 1].timestamp).getTime();
  const spanDays = (lastTime - firstTime) / 86_400_000;
  if (spanDays < MIN_SPAN_DAYS) {
    return {
      ...empty,
      spanDays: Math.round(spanDays),
      assessment: `Pengukuran baru membentang ${Math.round(spanDays)} hari. Lanjutkan pengukuran harian minimal 7 hari agar tren dapat diidentifikasi.`
    };
  }

  // x = days since first reading (fractional), y = mmHg.
  const sysPoints = sorted.map((r) => ({
    x: (new Date(r.timestamp).getTime() - firstTime) / 86_400_000,
    y: r.systolic
  }));
  const diaPoints = sorted.map((r) => ({
    x: (new Date(r.timestamp).getTime() - firstTime) / 86_400_000,
    y: r.diastolic
  }));

  const sysFit = olsFit(sysPoints);
  const diaFit = olsFit(diaPoints);
  if (!sysFit) {
    return {
      ...empty,
      spanDays: Math.round(spanDays),
      assessment:
        'Pengukuran terkonsentrasi pada waktu yang hampir bersamaan sehingga tren waktu belum dapat diidentifikasi. Ukur secara teratur setiap hari.'
    };
  }

  const slopePerWeekSystolic = sysFit.slope * 7;
  const slopePerWeekDiastolic = diaFit ? diaFit.slope * 7 : null;

  const direction: TrendDirection =
    slopePerWeekSystolic >= STABLE_SLOPE_EPSILON
      ? 'rising'
      : slopePerWeekSystolic <= -STABLE_SLOPE_EPSILON
        ? 'falling'
        : 'stable';

  const isClinicallySignificant =
    Math.abs(slopePerWeekSystolic) >= SIGNIFICANT_SLOPE_PER_WEEK && sysFit.slopePValue < ALPHA;

  // Project the next `horizonDays` days with a 95% prediction interval.
  const forecast: TrendForecastPoint[] = [];
  for (let day = 1; day <= horizonDays; day++) {
    const t = lastTime + day * 86_400_000;
    const x = (t - firstTime) / 86_400_000;
    const sys = sysFit.intercept + sysFit.slope * x;
    const dia = diaFit ? diaFit.intercept + diaFit.slope * x : sorted[nReadings - 1].diastolic;
    const band = predictionHalfWidth(sysFit, x);
    forecast.push({
      date: new Date(t).toISOString(),
      systolic: Math.round(sys),
      diastolic: Math.round(dia),
      low: Math.round(sys - band),
      high: Math.round(sys + band)
    });
  }

  const assessment = buildAssessment(direction, isClinicallySignificant, slopePerWeekSystolic, sysFit, nReadings);
  const confidenceNote = buildConfidenceNote(sysFit.r2, nReadings, spanDays);

  return {
    nReadings,
    spanDays: Math.round(spanDays),
    sufficientData: true,
    systolic: sysFit,
    diastolic: diaFit,
    slopePerWeekSystolic,
    slopePerWeekDiastolic,
    direction,
    isClinicallySignificant,
    forecast,
    assessment,
    confidenceNote
  };
}

function buildAssessment(
  direction: TrendDirection,
  significant: boolean,
  slopePerWeek: number,
  fit: RegressionResult,
  n: number
): string {
  const slopeText = `${slopePerWeek > 0 ? '+' : ''}${slopePerWeek.toFixed(1)} mmHg/minggu`;
  if (!significant) {
    if (direction === 'stable') {
      return `Tren tekanan darah Anda stabil (${slopeText}) berdasarkan ${n} pengukuran terakhir. Pertahankan rutinitas pengukuran.`;
    }
    return `Tren cenderung ${direction === 'rising' ? 'naik' : 'turun'} ${slopeText}, namun belum bermakna secara statistik (p=${fmtP(fit.slopePValue)}, R² ${fit.r2.toFixed(2)}) sehingga belum dapat disimpulkan.`;
  }
  if (direction === 'rising') {
    return `Tren naik ${slopeText}, bermakna secara statistik (p=${fmtP(fit.slopePValue)}, R² ${fit.r2.toFixed(2)}, n=${n}). Bawa catatan tren ini ke kunjungan dokter berikutnya.`;
  }
  return `Tren turun ${slopeText}, bermakna secara statistik (p=${fmtP(fit.slopePValue)}, R² ${fit.r2.toFixed(2)}, n=${n}). Ini gambaran data Anda, bukan bukti sebab-akibat.`;
}

export function fmtP(p: number): string {
  return p < 0.001 ? '<0,001' : p.toFixed(3).replace('.', ',');
}

function buildConfidenceNote(r2: number, n: number, spanDays: number): string {
  if (r2 < 0.15) {
    return `Keyakinan rendah (R² ${r2.toFixed(2)}) — ${n} pengukuran selama ${Math.round(spanDays)} hari masih mengandung banyak fluktuasi harian.`;
  }
  if (r2 < 0.4) {
    return `Keyakinan sedang (R² ${r2.toFixed(2)}) dari ${n} pengukuran selama ${Math.round(spanDays)} hari.`;
  }
  return `Keyakinan baik (R² ${r2.toFixed(2)}) dari ${n} pengukuran selama ${Math.round(spanDays)} hari.`;
}
