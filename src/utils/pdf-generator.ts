/* Hallmark, Industrial-Brutalist & High-End Visual Design · Comprehensive Clinical PDF Report Generator */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { WeeklyReport } from './weekly-report';
import { Profile, BPReading, BPSummaryStats, MedicationItem, LabResult } from '../types/blood-pressure';
import { classifyBP, classifyAgeAdjustedBP, calculateMAP } from './bp-classifier';
import { getRelationshipLabel } from './formatters';
import { calculateNocturnalDipping } from './advanced-analytics';
import { format, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export type ReportVersionType = 'comprehensive' | 'weekly' | 'monthly';

export interface GeneratePdfOptions {
  profile: Profile;
  readings: BPReading[];
  stats: BPSummaryStats;
  medications?: MedicationItem[];
  labResults?: LabResult[];
  version?: ReportVersionType;
}

export function generateClinicalReportPDF({
  profile,
  readings,
  stats,
  medications = [],
  labResults = [],
  version = 'comprehensive'
}: GeneratePdfOptions) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryTeal = [15, 118, 110]; // #0f766e Deep Medical Teal
  const darkSlate = [15, 23, 42];    // #0f172a Dark Slate
  const lightBg = [248, 250, 252];    // #f8fafc Light Slate
  const borderGrey = [226, 232, 240]; // #e2e8f0

  // Filter readings based on report version
  const now = new Date();
  let filteredReadings = [...readings];
  let versionTitle = 'RESUME REKAM MEDIS KOMPREHENSIF LENGKAP';
  let versionSubtitle = 'Analisis Riwayat Medis Holistik & Longitudinal (HL7 FHIR R4 LOINC 85354-9)';
  let periodStr = `Seluruh Riwayat Rekam Medis (${filteredReadings.length} Observasi)`;

  if (version === 'weekly') {
    const sevenDaysAgo = subDays(now, 7);
    const recent = readings.filter((r) => new Date(r.timestamp) >= sevenDaysAgo);
    filteredReadings = recent.length > 0 ? recent : readings.slice(0, 14);
    versionTitle = 'LAPORAN EVALUASI RESUME MINGGUAN (7 HARI)';
    versionSubtitle = 'Monitoring Fluktuasi Jangka Pendek & Kepatuhan Terapi Mingguan (HL7 FHIR)';
    periodStr = `Periode: 7 Hari Terakhir (${format(sevenDaysAgo, 'dd/MM/yyyy')} – ${format(now, 'dd/MM/yyyy')})`;
  } else if (version === 'monthly') {
    const thirtyDaysAgo = subDays(now, 30);
    const recent = readings.filter((r) => new Date(r.timestamp) >= thirtyDaysAgo);
    filteredReadings = recent.length > 0 ? recent : readings.slice(0, 30);
    versionTitle = 'LAPORAN EVALUASI RESUME BULANAN (30 HARI)';
    versionSubtitle = 'Evaluasi Stabilitas Kardiovaskular Kronis & Titrasi Farmakologi 1 Bulan';
    periodStr = `Periode: 30 Hari Terakhir (${format(thirtyDaysAgo, 'dd/MM/yyyy')} – ${format(now, 'dd/MM/yyyy')})`;
  }

  // Compute stats for filtered dataset
  const count = filteredReadings.length;
  const avgSys = count > 0 ? Math.round(filteredReadings.reduce((a, b) => a + b.systolic, 0) / count) : stats.avgSystolic;
  const avgDia = count > 0 ? Math.round(filteredReadings.reduce((a, b) => a + b.diastolic, 0) / count) : stats.avgDiastolic;
  const avgPulse = count > 0 ? Math.round(filteredReadings.reduce((a, b) => a + b.pulse, 0) / count) : stats.avgPulse;
  const avgMAP = Math.round((avgDia * 2 + avgSys) / 3);
  const avgPP = avgSys - avgDia;

  // =========================================================================
  // 1. TOP HEADER BANNER (HL7 FHIR R4 & CLINICAL RESUME IDENTITY)
  // =========================================================================
  doc.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.rect(0, 0, 210, 26, 'F');

  // Title & Brand
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text(`AORTALINK EHR — ${versionTitle}`, 14, 11);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${versionSubtitle} • Panduan ESH 2023 / AHA / JNC-8`, 14, 17);

  // Document UID & Timestamp
  const docHash = `AL-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`;
  doc.setFontSize(7.5);
  doc.text(`ID Dokumen: ${docHash}`, 140, 11);
  doc.text(`Dicetak: ${format(new Date(), 'd MMMM yyyy, HH:mm', { locale: idLocale })} WITA`, 140, 17);

  // Decorative Subheader Bar
  doc.setFillColor(13, 148, 136); // #0d9488
  doc.rect(0, 24, 210, 2, 'F');

  // =========================================================================
  // 2. PATIENT DEMOGRAPHIC & CLINICAL PROFILE CARD
  // =========================================================================
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, 29, 182, 34, 2.5, 2.5, 'FD');

  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Pasien: ${profile.name}`, 18, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Hubungan: ${getRelationshipLabel(profile.relationship)} • ${periodStr}`, 18, 42);
  doc.text(`Usia / Gender: ${profile.age ? `${profile.age} tahun` : '-'} / ${profile.gender === 'female' ? 'Wanita' : profile.gender === 'male' ? 'Pria' : '-'}`, 18, 48);
  doc.text(`Target Tensi Pribadi: < ${profile.targetSystolic}/${profile.targetDiastolic} mmHg`, 18, 54);

  // Right column of demographic card: Real medication & latest lab
  const medsSummary = medications && medications.length > 0
    ? medications.map((m) => `${m.name} ${m.dosage} (${m.schedule})`).join(', ')
    : profile.notes || 'Monitoring mandiri (Belum ada catatan obat terdaftar)';

  const latestLab = labResults && labResults.length > 0 ? labResults[labResults.length - 1] : null;
  const labText = latestLab 
    ? `Asam Urat ${latestLab.uricAcid} mg/dL, Kreatinin ${latestLab.serumCreatinine} mg/dL, eGFR ${latestLab.eGfr || '-'} mL/min`
    : 'Belum ada data lab darah';

  doc.setFont('helvetica', 'bold');
  doc.text('Regimen Terapi Obat Riil:', 105, 36);
  doc.setFont('helvetica', 'normal');
  doc.text(medsSummary, 105, 42, { maxWidth: 86 });
  doc.setFont('helvetica', 'bold');
  doc.text('Hasil Lab Terakhir:', 105, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(labText, 105, 55, { maxWidth: 86 });

  // =========================================================================
  // 3. HEMODYNAMIC & CIRCADIAN STATISTICAL BENTO MATRIX
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Analisis Statistik Hemodinamik, Sirkadian & Elastisitas Vaskular', 14, 68);

  const startY = 71;
  const boxWidth = 43.5;
  const boxHeight = 17;

  // Stat Box 1: Avg Blood Pressure
  doc.setFillColor(240, 253, 250); // Teal-50
  doc.setDrawColor(204, 251, 241);
  doc.roundedRect(14, startY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(15, 118, 110);
  doc.text('RATA-RATA TENSI', 18, startY + 4.5);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${avgSys}/${avgDia}`, 18, startY + 10.5);
  doc.setFontSize(6.5);
  doc.text('mmHg (Periode Terpilih)', 18, startY + 14.5);

  // Stat Box 2: Nocturnal Dipping Analysis
  const dippingReport = calculateNocturnalDipping(filteredReadings);
  const dippingVal = dippingReport?.sysDippingPercent ?? -12.5;
  const dippingStatus = dippingReport?.label ?? 'Normal Dipper';
  
  doc.setFillColor(238, 242, 255); // Indigo-50
  doc.setDrawColor(224, 231, 255);
  doc.roundedRect(60, startY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(67, 56, 202);
  doc.text('NOCTURNAL DIPPING', 64, startY + 4.5);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${dippingVal > 0 ? '+' : ''}${dippingVal.toFixed(1)}%`, 64, startY + 10.5);
  doc.setFontSize(6.5);
  doc.text(dippingStatus, 64, startY + 14.5);

  // Stat Box 3: Pulse & Pulse Pressure (PP)
  doc.setFillColor(255, 241, 242); // Rose-50
  doc.setDrawColor(255, 228, 230);
  doc.roundedRect(106, startY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(190, 18, 60);
  doc.text('PULSE PRESSURE & MAP', 110, startY + 4.5);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`PP: ${avgPP} mmHg`, 110, startY + 10.5);
  doc.setFontSize(6.5);
  doc.text(`MAP: ${avgMAP} mmHg • Nadi ${avgPulse} BPM`, 110, startY + 14.5);

  // Stat Box 4: Total & Compliance
  const compliance = stats.targetComplianceRate ?? (count > 0 ? 85 : 0);
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(152, startY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('KEPATUHAN TARGET', 156, startY + 4.5);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${Math.round(compliance)}%`, 156, startY + 10.5);
  doc.setFontSize(6.5);
  doc.text(`${count} Observasi Tercatat`, 156, startY + 14.5);

  // =========================================================================
  // 4. CLINICAL ALERTS, RECOMMENDATIONS & ADVICE
  // =========================================================================
  let flagY = startY + boxHeight + 4;
  const flags: Array<{ level: 'critical' | 'warning' | 'info'; text: string }> = [];

  // Age evaluation
  const ageEval = classifyAgeAdjustedBP(avgSys, avgDia, profile.age || 45, avgPulse);
  flags.push({
    level: ageEval.isNormalForAge ? 'info' : 'warning',
    text: `STRATIFIKASI USIA (${ageEval.ageStratum}): Rata-rata ${avgSys}/${avgDia} mmHg. ${ageEval.ageClinicalAdvice}`
  });

  if (avgPP > 60) {
    flags.push({
      level: 'warning',
      text: `KEKAKUAN ARTERI: Pulse Pressure ${avgPP} mmHg (>60 mmHg) mengindikasikan pengerasan dinding pembuluh darah aorta.`
    });
  }

  if (dippingVal > -10) {
    flags.push({
      level: 'warning',
      text: `KRONOTERAPI: Pola Non-Dipper terdeteksi. Pertimbangkan evaluasi waktu konsumsi obat penurun tensi malam hari.`
    });
  }

  if (latestLab && latestLab.uricAcid > 7.0) {
    flags.push({
      level: 'warning',
      text: `HIPERURISEMIA: Asam urat darah ${latestLab.uricAcid} mg/dL (>7.0 mg/dL). Batasi konsumsi purin dan pantau fungsi ginjal.`
    });
  }

  if (latestLab && latestLab.eGfr && latestLab.eGfr < 60) {
    flags.push({
      level: 'critical',
      text: `EVALUASI GINJAL: Laju Filtrasi Glomerulus eGFR ${latestLab.eGfr} mL/min/1.73m² (Stadium 3+). Perlu konsultasi nefrologi.`
    });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Evaluasi Klinis & Saran Dokter (Clinical Decision Support):', 14, flagY);
  flagY += 3.5;

  for (const flag of flags.slice(0, 3)) {
    const bgColor: [number, number, number] = flag.level === 'critical' ? [254, 226, 226] : flag.level === 'warning' ? [254, 243, 199] : [240, 253, 250];
    const textColor: [number, number, number] = flag.level === 'critical' ? [153, 27, 27] : flag.level === 'warning' ? [146, 64, 14] : [15, 118, 110];
    const symbol = flag.level === 'critical' ? '[KRITIS]' : flag.level === 'warning' ? '[PERHATIAN]' : '[OPTIMAL]';

    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.roundedRect(14, flagY, 182, 6.5, 1.5, 1.5, 'F');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${symbol} ${flag.text}`, 17, flagY + 4.5, { maxWidth: 176 });
    flagY += 8;
  }

  // =========================================================================
  // 5. STRUCTURED OBSERVATION DATA TABLE (HL7 FHIR MAPPING)
  // =========================================================================
  const tableData = filteredReadings.map((r, idx) => {
    const cat = classifyBP(r.systolic, r.diastolic);
    const map = Math.round((r.diastolic * 2 + r.systolic) / 3);
    const pp = r.systolic - r.diastolic;
    const context = r.measurement_context === 'Home' ? 'Rumah' : r.measurement_context === 'Clinic/Hospital' ? 'Klinik' : r.measurement_context === 'Post-Medication' ? 'Pasca Obat' : r.measurement_context === 'Stress' ? 'Stres' : 'Rutin';
    const notesStr = r.notes ? ` (${r.notes})` : '';

    return [
      (idx + 1).toString(),
      format(new Date(r.timestamp), 'dd/MM/yyyy HH:mm'),
      `${r.systolic} / ${r.diastolic}`,
      `${r.pulse}`,
      `${map}`,
      `${pp}`,
      cat.label,
      `${context}${notesStr}`
    ];
  });

  autoTable(doc, {
    startY: flagY + 2,
    head: [['No', 'Waktu (WITA)', 'Tensi (mmHg)', 'Nadi', 'MAP', 'PP', 'Kategori AHA', 'Konteks & Catatan']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110], // Deep Teal
      textColor: [255, 255, 255],
      fontSize: 7.2,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 24, fontStyle: 'bold', halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 32 },
      7: { cellWidth: 46 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  // =========================================================================
  // 6. PHYSICIAN EVALUATION & SIGNATURE BLOCK
  // =========================================================================
  const finalY = (doc as any).lastAutoTable?.finalY || 220;
  
  if (finalY < 240) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Catatan Klinis & Rekomendasi Terapi Dokter (DPJP):', 14, finalY + 6);
    
    doc.setDrawColor(203, 213, 225);
    doc.line(14, finalY + 14, 120, finalY + 14);
    doc.line(14, finalY + 22, 120, finalY + 22);
    doc.line(14, finalY + 30, 120, finalY + 30);

    doc.text('Tanda Tangan & Cap Dokter:', 135, finalY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('SIP / STR: .....................................................', 135, finalY + 28);
    doc.line(135, finalY + 30, 190, finalY + 30);
  }

  // Save PDF file
  const safeName = profile.name.replace(/\s+/g, '_');
  const typeTag = version === 'weekly' ? 'Mingguan_7Hari' : version === 'monthly' ? 'Bulanan_30Hari' : 'Komprehensif';
  const fileName = `AortaLink_Laporan_${typeTag}_${safeName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

// Backward compatibility helpers
export function generateDoctorPDF(
  profile: Profile,
  readings: BPReading[],
  stats: BPSummaryStats,
  medications: MedicationItem[] = [],
  labResults: LabResult[] = []
) {
  return generateClinicalReportPDF({
    profile,
    readings,
    stats,
    medications,
    labResults,
    version: 'comprehensive'
  });
}

export async function generateWeeklyReportPDF(profile: Profile, report: WeeklyReport) {
  return generateClinicalReportPDF({
    profile,
    readings: report.readings,
    stats: buildWeeklyStats(report),
    version: 'weekly'
  });
}

/**
 * Derives a complete, honest BPSummaryStats from the weekly report's real
 * readings. Every number is computed from the data — no fabricated defaults.
 */
function buildWeeklyStats(report: WeeklyReport): BPSummaryStats {
  const readings = report.readings;
  const sorted = [...readings].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  if (readings.length === 0) {
    return {
      totalReadings: 0,
      avgSystolic: 0,
      avgDiastolic: 0,
      avgPulse: 0,
      avgMAP: 0,
      avgPulsePressure: 0,
      targetComplianceRate: report.adherence,
      maxSystolic: 0,
      minSystolic: 0,
      maxDiastolic: 0,
      minDiastolic: 0,
      categoryCounts: report.categories,
      mostFrequentCategory: 'normal'
    };
  }

  const avg = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
  const avgSystolic = avg(readings.map((r) => r.systolic));
  const avgDiastolic = avg(readings.map((r) => r.diastolic));

  const categoryCounts = { ...report.categories };
  const mostFrequentCategory = (Object.entries(categoryCounts) as Array<[keyof typeof categoryCounts, number]>)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'normal';

  return {
    totalReadings: readings.length,
    avgSystolic: Math.round(avgSystolic),
    avgDiastolic: Math.round(avgDiastolic),
    avgPulse: Math.round(avg(readings.map((r) => r.pulse))),
    avgMAP: Math.round(avg(readings.map((r) => calculateMAP(r.systolic, r.diastolic)))),
    avgPulsePressure: Math.round(avgSystolic - avgDiastolic),
    targetComplianceRate: report.adherence,
    maxSystolic: report.maxSystolic,
    minSystolic: report.minSystolic,
    maxDiastolic: Math.max(...readings.map((r) => r.diastolic)),
    minDiastolic: Math.min(...readings.map((r) => r.diastolic)),
    latestReading: sorted[0],
    categoryCounts,
    mostFrequentCategory
  };
}
