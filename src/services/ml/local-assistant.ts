/**
 * AortaLink On-Device Clinical ML — Local Assistant
 * -------------------------------------------------
 * A deterministic question-answering layer on top of the ML report. Free-text
 * questions are matched to a fixed set of intents by keyword scoring; each
 * answer is assembled from numbers the engine actually computed for the user.
 * When no intent matches, the assistant says what it can and cannot answer —
 * it never improvises.
 */

import { LabResult, MedicationItem, Profile } from '../../types/blood-pressure';
import type { ClinicalMlReport } from './ml-engine';

export type LocalIntent =
  | 'summary'
  | 'trend'
  | 'patterns'
  | 'adherence'
  | 'dipping'
  | 'labs'
  | 'meds'
  | 'target'
  | 'emergency';

export interface LocalAssistantQuestion {
  id: LocalIntent;
  label: string;
}

export interface LocalAssistantAnswer {
  text: string;
  /** Which report sections the answer was assembled from — shown to the user for transparency. */
  sources: string[];
}

export function getCuratedQuestions(): LocalAssistantQuestion[] {
  return [
    { id: 'summary', label: 'Ringkasan kondisi saya' },
    { id: 'trend', label: 'Bagaimana tren tensi saya?' },
    { id: 'patterns', label: 'Pola apa yang terdeteksi?' },
    { id: 'adherence', label: 'Bagaimana kepatuhan obat saya?' },
    { id: 'dipping', label: 'Pola tidur/malam saya?' },
    { id: 'target', label: 'Apakah saya sudah mencapai target?' },
    { id: 'labs', label: 'Tinjau hasil lab saya' },
    { id: 'meds', label: 'Tinjau obat saya' }
  ];
}

const INTENT_KEYWORDS: Array<{ intent: LocalIntent; words: string[] }> = [
  { intent: 'summary', words: ['ringkasan', 'kesimpulan', 'gimana', 'bagaimana', 'kondisi', 'status', 'secara keseluruhan'] },
  { intent: 'trend', words: ['tren', 'trend', 'naik', 'turun', 'memburuk', 'membaik', 'mingguan', 'minggu', 'prediksi', 'forecast'] },
  { intent: 'patterns', words: ['pola', 'white', 'coat', 'surge', 'pagi', 'variabilitas', 'fluktuasi', 'weekend', 'akhir pekan', 'tersembunyi'] },
  { intent: 'adherence', words: ['kepatuhan', 'patuh', 'lupa', 'minum obat', 'ketaatan', 'adherensi', 'telat'] },
  { intent: 'dipping', words: ['dipping', 'malam', 'tidur', 'nokturnal', 'sirkadian'] },
  { intent: 'target', words: ['target', 'capai', 'terkontrol', 'kontrol', 'aman', 'normal', 'ideal'] },
  { intent: 'labs', words: ['lab', 'laboratorium', 'asam urat', 'kreatinin', 'gula', 'kolesterol', 'ginjal', 'egfr'] },
  { intent: 'meds', words: ['obat', 'dosis', 'regimen', 'amlodipine', 'arb', 'ccb', 'golongan'] },
  { intent: 'emergency', words: ['darurat', 'bahaya', '180', 'krisis', 'crisis', 'sesak', 'nyeri dada', 'pusing hebat'] }
];

/** Best-effort intent match for free text; null when nothing scores above the threshold. */
export function resolveFreeTextIntent(text: string): LocalIntent | null {
  const normalized = text.toLowerCase().trim();
  if (!normalized) return null;

  let best: { intent: LocalIntent; score: number } | null = null;
  for (const { intent, words } of INTENT_KEYWORDS) {
    let score = 0;
    for (const word of words) {
      if (normalized.includes(word)) score += word.includes(' ') ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { intent, score };
    }
  }
  // Require at least one strong signal to avoid guessing.
  return best && best.score >= 2 ? best.intent : null;
}

export function getCapabilityAnswer(): LocalAssistantAnswer {
  return {
    text: [
      'Saya asisten analisis lokal AortaLink — jawaban saya selalu dihitung dari data asli Anda, bukan teks generatif.',
      '',
      'Yang bisa Anda tanyakan:',
      '• Ringkasan kondisi & capaian target',
      '• Tren tekanan darah dan proyeksi mingguan',
      '• Pola: white-coat, lonjakan pagi, variabilitas, akhir pekan',
      '• Kepatuhan obat dan keterkaitannya dengan kontrol',
      '• Pola nokturnal (dipping)',
      '• Tinjauan hasil lab dan regimen obat',
      '',
      'Saya tidak bisa mendiagnosis, meresepkan obat, atau menjawab di luar data Anda — untuk itu konsultasikan dengan dokter.'
    ].join('\n'),
    sources: ['kapabilitas asisten']
  };
}

export function answerLocalQuestion(
  intent: LocalIntent,
  report: ClinicalMlReport,
  ctx: { profile: Profile | null; medications: MedicationItem[]; latestLab: LabResult | null }
): LocalAssistantAnswer {
  switch (intent) {
    case 'summary':
      return answerSummary(report);
    case 'trend':
      return answerTrend(report);
    case 'patterns':
      return answerPatterns(report);
    case 'adherence':
      return answerAdherence(report);
    case 'dipping':
      return answerDipping(report);
    case 'target':
      return answerTarget(report, ctx.profile);
    case 'labs':
      return answerLabs(report, ctx.latestLab);
    case 'meds':
      return answerMeds(report, ctx.medications);
    case 'emergency':
      return answerEmergency(report);
  }
}

function answerSummary(report: ClinicalMlReport): LocalAssistantAnswer {
  const { dataSummary, trend, adherence } = report;
  const parts: string[] = [];
  parts.push(
    `Basis analisis: ${dataSummary.totalReadings} pengukuran dari ${dataSummary.profileName}${dataSummary.spanDays > 0 ? ` dalam ${dataSummary.spanDays} hari` : ''}.`
  );
  if (trend.sufficientData) {
    parts.push(`Tren: ${trend.assessment}`);
  } else {
    parts.push(trend.assessment);
  }
  if (adherence.sufficientData) {
    parts.push(adherence.assessment);
  }
  const detected = report.patterns.filter((p) => p.detected);
  if (detected.length > 0) {
    parts.push(`Pola terdeteksi: ${detected.map((p) => p.label).join(', ')}.`);
  }
  const top = report.insights.find((i) => i.priority === 'critical' || i.priority === 'warning');
  if (top) {
    parts.push(`Perlu perhatian: ${top.title} — ${top.body}`);
  }
  return { text: parts.join('\n\n'), sources: ['ringkasan data', 'model tren', 'model kepatuhan', 'detektor pola'] };
}

function answerTrend(report: ClinicalMlReport): LocalAssistantAnswer {
  const { trend } = report;
  const parts: string[] = [trend.sufficientData ? trend.assessment : trend.assessment];
  if (trend.sufficientData && trend.systolic) {
    parts.push(
      `Rata-rata keyakinan model: ${trend.confidenceNote} Proyeksi 7 hari ke depan: ${trend.forecast[0].systolic}/${trend.forecast[0].diastolic} → ${trend.forecast[trend.forecast.length - 1].systolic}/${trend.forecast[trend.forecast.length - 1].diastolic} mmHg (pita keyakinan 95% ${trend.forecast[trend.forecast.length - 1].low}–${trend.forecast[trend.forecast.length - 1].high}).`
    );
    if (trend.slopePerWeekDiastolic !== null) {
      parts.push(`Perubahan diastolik: ${trend.slopePerWeekDiastolic > 0 ? '+' : ''}${trend.slopePerWeekDiastolic.toFixed(1)} mmHg/minggu.`);
    }
  }
  return { text: parts.join('\n\n'), sources: ['model regresi tren (OLS)'] };
}

function answerPatterns(report: ClinicalMlReport): LocalAssistantAnswer {
  const computable = report.patterns.filter((p) => p.strength !== 'not_enough_data');
  const insufficient = report.patterns.filter((p) => p.strength === 'not_enough_data');
  const parts: string[] = [];
  if (computable.length === 0) {
    parts.push('Belum ada pola yang dapat dihitung — data pengukuran belum cukup untuk perbandingan antar-kelompok.');
  }
  for (const p of computable) {
    parts.push(`${p.label}: ${p.interpretation}`);
  }
  if (insufficient.length > 0) {
    parts.push(`Belum dapat dinilai: ${insufficient.map((p) => p.label).join(', ')} — ${insufficient[0].interpretation}`);
  }
  return { text: parts.join('\n\n'), sources: ['detektor pola (perbandingan kelompok nyata)'] };
}

function answerAdherence(report: ClinicalMlReport): LocalAssistantAnswer {
  const { adherence } = report;
  const parts: string[] = [adherence.assessment];
  if (adherence.sufficientData && adherence.evidence) {
    const { highAdherenceDays, lowAdherenceDays } = adherence.evidence;
    if (highAdherenceDays.n > 0 && lowAdherenceDays.n > 0 && highAdherenceDays.avgSystolic !== null && lowAdherenceDays.avgSystolic !== null) {
      const diff = Math.round(highAdherenceDays.avgSystolic - lowAdherenceDays.avgSystolic);
      parts.push(
        `Data Anda: pada ${highAdherenceDays.n} hari dengan kepatuhan tinggi, rata-rata sistolik ${highAdherenceDays.avgSystolic} mmHg; pada ${lowAdherenceDays.n} hari dengan kepatuhan rendah, ${lowAdherenceDays.avgSystolic} mmHg (selisih ${diff >= 0 ? '+' : ''}${diff} mmHg). Ini korelasi dari data Anda sendiri, bukan janji hasil.`
      );
    }
    if (adherence.controlProbabilityToday !== null) {
      parts.push(`Estimasi model untuk hari ini: ${Math.round(adherence.controlProbabilityToday * 100)}% peluang hari terkontrol, berdasarkan perilaku terbaru Anda.`);
    }
  }
  return { text: parts.join('\n\n'), sources: ['model regresi logistik on-device', 'log konsumsi obat'] };
}

function answerDipping(report: ClinicalMlReport): LocalAssistantAnswer {
  const { dipping } = report;
  if (!dipping) {
    return {
      text: 'Pola nokturnal membutuhkan pengukuran di siang dan malam hari. Ukur sekali di siang hari dan sekali setelah pukul 22:00 (atau segera setelah bangun) dalam beberapa hari berbeda.',
      sources: ['panel dipping sirkadian']
    };
  }
  const parts = [
    `${dipping.label}: penurunan sistolik malam ${dipping.sysDippingPercent.toFixed(1)}% (siang ${Math.round(dipping.daytimeAvgSystolic)}/${Math.round(dipping.daytimeAvgDiastolic)} → malam ${Math.round(dipping.nighttimeAvgSystolic)}/${Math.round(dipping.nighttimeAvgDiastolic)} mmHg).`,
    dipping.clinicalAdvice
  ];
  return { text: parts.join('\n\n'), sources: ['panel dipping sirkadian'] };
}

function answerTarget(report: ClinicalMlReport, profile: Profile | null): LocalAssistantAnswer {
  const targetSys = profile?.targetSystolic || 120;
  const targetDia = profile?.targetDiastolic || 80;
  const share = report.adherence.controlledDaysShare;
  const parts: string[] = [];
  if (share === null) {
    parts.push(`Target profil Anda ≤${targetSys}/${targetDia} mmHg. Belum ada hari dengan pengukuran untuk menilai capaian.`);
  } else {
    parts.push(
      `Target Anda ≤${targetSys}/${targetDia} mmHg tercapai pada ${Math.round(share * 100)}% hari pengukuran (${report.adherence.nLabeledDays} hari dianalisis).`
    );
  }
  if (report.trend.sufficientData) {
    parts.push(report.trend.direction === 'rising' ? 'Perhatian: tren Anda sedang menjauh dari target.' : 'Tren Anda menuju atau mempertahankan target.');
  }
  return { text: parts.join('\n\n'), sources: ['target profil', 'model kepatuhan'] };
}

function answerLabs(report: ClinicalMlReport, latestLab: LabResult | null): LocalAssistantAnswer {
  if (!latestLab || report.dataSummary.labResults === 0) {
    return {
      text: 'Belum ada hasil laboratorium. Tambahkan hasil lab di menu Lab agar asisten dapat meninjau asam urat, kreatinin, dan eGFR Anda bersama data tensi.',
      sources: ['hasil lab (kosong)']
    };
  }
  const parts: string[] = [];
  parts.push(
    `Lab terakhir: asam urat ${latestLab.uricAcid} mg/dL, kreatinin ${latestLab.serumCreatinine} mg/dL, ureum ${latestLab.bloodUrea} mg/dL${latestLab.eGfr ? `, eGFR ${latestLab.eGfr} mL/min/1.73m²` : ''}.`
  );
  if (latestLab.uricAcid >= 7) {
    parts.push(`Asam urat ${latestLab.uricAcid} mg/dL berada di atas ambang 7,0 — relevan jika Anda menjalani terapi diuretik.`);
  }
  if (latestLab.eGfr && latestLab.eGfr < 60) {
    parts.push(`eGFR ${latestLab.eGfr} mL/min/1.73m² menandakan fungsi ginjal perlu dipantau — sampaikan ke dokter bersama riwayat tensi Anda.`);
  }
  if (latestLab.fastingBloodSugar) {
    parts.push(`Gula darah puasa tercatat ${latestLab.fastingBloodSugar} mg/dL.`);
  }
  parts.push('Angka-angka ini berasal dari hasil lab yang Anda masukkan sendiri. Interpretasi klinis akhir tetap milik dokter Anda.');
  return { text: parts.join('\n\n'), sources: ['hasil laboratorium'] };
}

function answerMeds(report: ClinicalMlReport, medications: MedicationItem[]): LocalAssistantAnswer {
  const scheduled = medications.filter((m) => m.schedule !== 'sesuai_kebutuhan');
  if (scheduled.length === 0) {
    return {
      text: 'Belum ada regimen obat terjadwal. Tambahkan di tab Terapi — dengan regimen tercatat, model kepatuhan dapat menghitung kaitan antara kepatuhan dan kontrol tekanan darah Anda.',
      sources: ['regimen obat (kosong)']
    };
  }
  const lines = scheduled.map((m) => `• ${m.name} ${m.dosage} (${m.drugClass}) — jadwal ${m.schedule.replace('_', '/')}`);
  const parts = [`Regimen terjadwal Anda (${scheduled.length} obat):`, ...lines];
  if (report.adherence.adherenceRate !== null) {
    parts.push(`Kepatuhan tercatat: ${Math.round(report.adherence.adherenceRate * 100)}% dari dosis terjadwal.`);
  }
  parts.push('Asisten lokal tidak mengubah atau merekomendasikan dosis — diskusikan regimen ini dengan dokter.');
  return { text: parts.join('\n'), sources: ['regimen obat', 'model kepatuhan'] };
}

function answerEmergency(report: ClinicalMlReport): LocalAssistantAnswer {
  const latest = report.insights.find((i) => i.id === 'crisis');
  if (latest) {
    return { text: `${latest.body}`, sources: ['pengukuran terakhir'] };
  }
  return {
    text: 'Pengukuran terakhir Anda tidak berada di zona krisis (≥180/120 mmHg). Namun jika Anda mengalami nyeri dada, sesak napas, bicara pelan, atau kelemahan wajah/tubuh satu sisi, jangan menunggu data — segera cari pertolongan medis atau gunakan tombol SOS Darurat di dashboard.',
    sources: ['pengukuran terakhir']
  };
}
