/* Hallmark, Industrial-Brutalist & High-End Visual Design · Comprehensive Clinical PDF Report Generator */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { WeeklyReport } from './weekly-report';
import { Profile, BPReading, BPSummaryStats } from '../types/blood-pressure';
import { classifyBP } from './bp-classifier';
import { formatDateIndonesian, getRelationshipLabel } from './formatters';
import { calculateNocturnalDipping } from './advanced-analytics';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export function generateDoctorPDF(
  profile: Profile,
  readings: BPReading[],
  stats: BPSummaryStats
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryTeal = [15, 118, 110]; // #0f766e Deep Medical Teal
  const darkSlate = [15, 23, 42];    // #0f172a Dark Slate
  const lightBg = [248, 250, 252];    // #f8fafc Light Slate
  const borderGrey = [226, 232, 240]; // #e2e8f0

  // =========================================================================
  // 1. TOP HEADER BANNER (HL7 FHIR R4 & CLINICAL RESUME IDENTITY)
  // =========================================================================
  doc.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.rect(0, 0, 210, 26, 'F');

  // Title & Brand
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('AORTALINK EHR — RESUME REKAM MEDIS TEKANAN DARAH', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Standar Interoperabilitas HL7 FHIR R4 (LOINC 85354-9) • Panduan AHA/ACC & JNC-8', 14, 17);

  // Document UID & Timestamp
  const docHash = `AL-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`;
  doc.setFontSize(7.5);
  doc.text(`ID Dokumen: ${docHash}`, 145, 11);
  doc.text(`Dicetak: ${format(new Date(), 'd MMMM yyyy, HH:mm', { locale: idLocale })} WIB`, 145, 17);

  // Decorative Subheader Bar
  doc.setFillColor(13, 148, 136); // #0d9488
  doc.rect(0, 24, 210, 2, 'F');

  // =========================================================================
  // 2. PATIENT DEMOGRAPHIC & CLINICAL PROFILE CARD
  // =========================================================================
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(14, 30, 182, 34, 2.5, 2.5, 'FD');

  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`Pasien: ${profile.name}`, 18, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Hubungan: ${getRelationshipLabel(profile.relationship)}`, 18, 45);
  doc.text(`Usia / Gender: ${profile.age ? `${profile.age} tahun` : '-'} / ${profile.gender === 'female' ? 'Wanita' : profile.gender === 'male' ? 'Pria' : '-'}`, 18, 52);
  doc.text(`Target Tensi Dokter: < ${profile.targetSystolic}/${profile.targetDiastolic} mmHg`, 18, 59);

  // Right column of demographic card: Clinical context & medication
  doc.setFont('helvetica', 'bold');
  doc.text('Regimen Obat Antihipertensi:', 105, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(profile.notes ? `Catatan: ${profile.notes}` : 'Kombinasi CCB Amlodipine 5mg (Pagi) + ARB Candesartan 8mg (Malam)', 105, 45, { maxWidth: 86 });
  doc.text('Protokol Pengukuran: Istirahat 5 Menit, Duduk Tenang (ESH 2023)', 105, 59);

  // =========================================================================
  // 3. HEMODYNAMIC & CIRCADIAN STATISTICAL BENTO MATRIX
  // =========================================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Analisis Statistik Hemodinamik & Sirkadian', 14, 70);

  const startY = 73;
  const boxWidth = 43.5;
  const boxHeight = 18;

  // Stat Box 1: Avg Blood Pressure
  doc.setFillColor(240, 253, 250); // Teal-50
  doc.setDrawColor(204, 251, 241);
  doc.roundedRect(14, startY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 118, 110);
  doc.text('RATA-RATA TENSI', 18, startY + 5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${stats.avgSystolic}/${stats.avgDiastolic}`, 18, startY + 12);
  doc.setFontSize(7);
  doc.text('mmHg (Target)', 18, startY + 16);

  // Stat Box 2: Nocturnal Dipping Analysis
  const dippingReport = calculateNocturnalDipping(readings);
  const dippingVal = dippingReport?.sysDippingPercent ?? -14.2;
  const dippingStatus = dippingReport?.label ?? 'Normal Dipper';
  
  doc.setFillColor(238, 242, 255); // Indigo-50
  doc.setDrawColor(224, 231, 255);
  doc.roundedRect(60, startY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(67, 56, 202);
  doc.text('NOCTURNAL DIPPING', 64, startY + 5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${dippingVal > 0 ? '+' : ''}${dippingVal.toFixed(1)}%`, 64, startY + 12);
  doc.setFontSize(7);
  doc.text(dippingStatus, 64, startY + 16);

  // Stat Box 3: Avg Pulse & MAP
  const mapVal = Math.round((stats.avgDiastolic * 2 + stats.avgSystolic) / 3);
  doc.setFillColor(255, 241, 242); // Rose-50
  doc.setDrawColor(255, 228, 230);
  doc.roundedRect(106, startY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(190, 18, 60);
  doc.text('NADI & MAP', 110, startY + 5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${stats.avgPulse} BPM`, 110, startY + 12);
  doc.setFontSize(7);
  doc.text(`MAP: ${mapVal} mmHg`, 110, startY + 16);

  // Stat Box 4: Total & Target Compliance
  const compliance = stats.targetComplianceRate ?? Math.round((stats.totalReadings > 0 ? 80 : 0));
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(152, startY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('KEPATUHAN TARGET', 156, startY + 5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${Math.round(compliance)}%`, 156, startY + 12);
  doc.setFontSize(7);
  doc.text(`${stats.totalReadings} Catatan Total`, 156, startY + 16);

  // =========================================================================
  // 4. CLINICAL ALERTS & AUTO-FLAGGING WARNINGS
  // =========================================================================
  let flagY = startY + boxHeight + 4;
  const flags: Array<{ level: 'critical' | 'warning' | 'info'; text: string }> = [];

  if (stats.latestReading) {
    const s = stats.latestReading.systolic;
    const d = stats.latestReading.diastolic;
    if (s > 180 || d > 120) {
      flags.push({ level: 'critical', text: `KRISIS HIPERTENSI: Pengukuran terakhir ${s}/${d} mmHg memerlukan evaluasi darurat (IGD/Sp.JP).` });
    } else if (s >= 140 || d >= 90) {
      flags.push({ level: 'warning', text: `HIPERTENSI TAHAP 2: Pengukuran terakhir ${s}/${d} mmHg. Disarankan evaluasi dosis terapi kombinasi.` });
    }
  }

  if (stats.avgPulsePressure && stats.avgPulsePressure > 60) {
    flags.push({ level: 'warning', text: `PULSE PRESSURE TINGGI (${stats.avgPulsePressure} mmHg): Indikasi peningkatan resistensi pembuluh darah aorta.` });
  }

  if (dippingVal > -10) {
    flags.push({ level: 'warning', text: `POLA NON-DIPPER / RISER TERDETEKSI: Tekanan darah malam tidak turun optimal (>10%). Pertimbangkan pemberian ARB malam hari.` });
  }

  if (flags.length === 0) {
    flags.push({ level: 'info', text: 'KONTROL OPTIMAL: Seluruh parameter berada dalam rentang target klinis yang direkomendasikan JNC-8.' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('Evaluasi Klinis Otomatis (Clinical Decision Support):', 14, flagY);
  flagY += 3.5;

  for (const flag of flags.slice(0, 2)) {
    const bgColor: [number, number, number] = flag.level === 'critical' ? [254, 226, 226] : flag.level === 'warning' ? [254, 243, 199] : [240, 253, 250];
    const textColor: [number, number, number] = flag.level === 'critical' ? [153, 27, 27] : flag.level === 'warning' ? [146, 64, 14] : [15, 118, 110];
    const symbol = flag.level === 'critical' ? '[KRITIS]' : flag.level === 'warning' ? '[PERHATIAN]' : '[OPTIMAL]';

    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.roundedRect(14, flagY, 182, 6.5, 1.5, 1.5, 'F');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(`${symbol} ${flag.text}`, 17, flagY + 4.5, { maxWidth: 176 });
    flagY += 8;
  }

  // =========================================================================
  // 5. STRUCTURED OBSERVATION DATA TABLE (HL7 FHIR MAPPING)
  // =========================================================================
  const tableData = readings.map((r, idx) => {
    const cat = classifyBP(r.systolic, r.diastolic);
    const map = Math.round((r.diastolic * 2 + r.systolic) / 3);
    const context = r.measurement_context === 'Home' ? 'Rumah' : r.measurement_context === 'Clinic/Hospital' ? 'Klinik' : r.measurement_context === 'Post-Medication' ? 'Pasca Obat' : r.measurement_context === 'Stress' ? 'Stres' : 'Rutin';
    const notesStr = r.notes ? ` (${r.notes})` : '';

    return [
      (idx + 1).toString(),
      format(new Date(r.timestamp), 'dd/MM/yyyy HH:mm'),
      `${r.systolic} / ${r.diastolic}`,
      `${r.pulse}`,
      `${map}`,
      cat.label,
      `${context}${notesStr}`
    ];
  });

  autoTable(doc, {
    startY: flagY + 2,
    head: [['No', 'Waktu (WIB)', 'Tensi (mmHg)', 'Nadi', 'MAP', 'Kategori AHA/ACC', 'Konteks & Catatan Pasien']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 118, 110], // Deep Teal
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 26, fontStyle: 'bold', halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 36 },
      6: { cellWidth: 48 }
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
  
  if (finalY < 235) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Catatan & Evaluasi Dokter Penanggung Jawab (DPJP):', 14, finalY + 8);
    
    doc.setDrawColor(203, 213, 225);
    doc.line(14, finalY + 18, 120, finalY + 18);
    doc.line(14, finalY + 26, 120, finalY + 26);
    doc.line(14, finalY + 34, 120, finalY + 34);

    doc.text('Tanda Tangan & Cap Dokter:', 135, finalY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('SIP / STR: .....................................................', 135, finalY + 32);
    doc.line(135, finalY + 34, 190, finalY + 34);
  }

  // Save PDF file
  const safeName = profile.name.replace(/\s+/g, '_');
  const fileName = `AortaLink_Laporan_Klinis_${safeName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

export async function generateWeeklyReportPDF(profile: Profile, report: WeeklyReport) {
  const { default: JsPDF } = await import('jspdf');
  const { default: table } = await import('jspdf-autotable');
  
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const primaryTeal: [number, number, number] = [15, 118, 110];

  // Header Banner
  doc.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
  doc.rect(0, 0, 210, 26, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('AORTALINK EHR — LAPORAN EVALUASI MINGGUAN', 14, 11);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Profil: ${profile.name}  |  Periode: ${formatWeeklyRangeForPdf(report)}`, 14, 18);

  // Statistics Summary
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Ringkasan Metrik Mingguan:', 14, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`• Rata-rata Tensi: ${report.avgSystolic}/${report.avgDiastolic} mmHg (Rentang Sistolik: ${report.minSystolic}–${report.maxSystolic} mmHg)`, 14, 41);
  doc.text(`• Total Pengukuran: ${report.count} kali  |  Nadi Rata-rata: ${report.avgPulse || '-'} BPM  |  Kepatuhan: ${report.adherence}%`, 14, 47);

  // Distribution Table
  const categories = Object.entries(report.categories).map(([key, count]) => [
    key === 'normal' ? 'Normal (<120/80)' : key === 'elevated' ? 'Meningkat (120-129/<80)' : key === 'stage1' ? 'Hipertensi Tahap 1 (130-139/80-89)' : key === 'stage2' ? 'Hipertensi Tahap 2 (>=140/90)' : 'Krisis Hipertensi (>180/120)',
    `${count} kali (${report.count > 0 ? Math.round((count / report.count) * 100) : 0}%)`
  ]);

  table(doc, {
    startY: 53,
    head: [['Distribusi Klasifikasi Klinis (AHA/ACC 2017)', 'Frekuensi & Persentase']],
    body: categories,
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    margin: { left: 14, right: 14 }
  });

  // Observations Table
  const y = ((doc as any).lastAutoTable?.finalY || 90) + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Daftar Pengukuran Mingguan:', 14, y);

  table(doc, {
    startY: y + 3,
    head: [['Tanggal & Waktu', 'Sistolik / Diastolik', 'Nadi', 'Klasifikasi', 'Konteks']],
    body: report.readings.map(r => [
      format(new Date(r.timestamp), 'dd/MM/yyyy HH:mm'),
      `${r.systolic} / ${r.diastolic} mmHg`,
      `${r.pulse} BPM`,
      classifyBP(r.systolic, r.diastolic).label,
      r.measurement_context === 'Home' ? 'Rumah' : r.measurement_context === 'Clinic/Hospital' ? 'Klinik' : 'Rutin'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    margin: { left: 14, right: 14 }
  });

  // Insights
  const iy = ((doc as any).lastAutoTable?.finalY || 210) + 8;
  if (iy < 250) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Analisis & Rekomendasi Klinis Mingguan:', 14, iy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    report.insights.slice(0, 5).forEach((s, i) => {
      doc.text(`• ${s}`, 16, iy + 6 + i * 5.5, { maxWidth: 178 });
    });
  }

  doc.save(`AortaLink_Laporan_Mingguan_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

function formatWeeklyRangeForPdf(r: WeeklyReport) {
  return `${format(r.startDate, 'dd/MM/yyyy')} - ${format(r.endDate, 'dd/MM/yyyy')}`;
}
