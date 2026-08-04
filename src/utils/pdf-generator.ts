import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { WeeklyReport } from './weekly-report';
import { Profile, BPReading, BPSummaryStats } from '../types/blood-pressure';
import { classifyBP } from './bp-classifier';
import { formatDateIndonesian, getRelationshipLabel } from './formatters';
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

  const primaryColor = [2, 132, 199]; // Trust Blue #0284c7
  const darkSlate = [15, 23, 42];

  // 1. Header & Title Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('AORTALINK — LAPORAN REKAM MEDIS TEKANAN DARAH', 14, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Dicetak pada: ${format(new Date(), 'd MMMM yyyy, HH:mm', { locale: idLocale })}`, 14, 19);

  // 2. Patient Information Card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 28, 182, 30, 3, 3, 'FD');

  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Profil Pasien: ${profile.name}`, 18, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`Hubungan: ${getRelationshipLabel(profile.relationship)}`, 18, 43);
  doc.text(`Usia / Gender: ${profile.age ? `${profile.age} tahun` : '-'} / ${profile.gender === 'female' ? 'Wanita' : profile.gender === 'male' ? 'Pria' : '-'}`, 18, 50);

  doc.text(`Target Tekanan Darah: < ${profile.targetSystolic}/${profile.targetDiastolic} mmHg`, 110, 43);
  doc.text(`Catatan Medis Profil: ${profile.notes || 'Tidak ada'}`, 110, 50);

  // 3. Summary Statistics Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Ringkasan Statistik Pengukuran', 14, 66);

  const startY = 70;
  const boxWidth = 42;
  const boxHeight = 18;

  // Stat Box 1: Avg BP
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(204, 251, 241);
  doc.roundedRect(14, startY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(15, 118, 110);
  doc.text('RATA-RATA TENSI', 18, startY + 5);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${stats.avgSystolic}/${stats.avgDiastolic}`, 18, startY + 13);
  doc.setFontSize(8);
  doc.text('mmHg', 40, startY + 13);

  // Stat Box 2: Total Readings
  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(224, 242, 254);
  doc.roundedRect(60, startY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(3, 105, 161);
  doc.text('TOTAL PENCATATAN', 64, startY + 5);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${stats.totalReadings} kali`, 64, startY + 13);

  // Stat Box 3: Avg Pulse
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(106, startY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text('RATA-RATA NADI', 110, startY + 5);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${stats.avgPulse} BPM`, 110, startY + 13);

  // Stat Box 4: Min / Max BP
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(152, startY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('MIN / MAX TENSI', 156, startY + 5);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${stats.minSystolic}/${stats.minDiastolic} - ${stats.maxSystolic}/${stats.maxDiastolic}`, 156, startY + 13);

  // 4. Data Table
  const tableData = readings.map((r, idx) => {
    const cat = classifyBP(r.systolic, r.diastolic);
    const tagsStr = r.tags && r.tags.length > 0 ? ` [${r.tags.join(', ')}]` : '';
    const posStr = r.position ? ` (${r.position}, ${r.arm || 'kiri'})` : '';
    const fullNotes = `${r.notes || '-'}${tagsStr}${posStr}`;

    return [
      (idx + 1).toString(),
      formatDateIndonesian(r.timestamp),
      `${r.systolic} / ${r.diastolic}`,
      `${r.pulse} BPM`,
      cat.label,
      fullNotes
    ];
  });

  autoTable(doc, {
    startY: 94,
    head: [['No', 'Tanggal & Waktu', 'Tensi (mmHg)', 'Nadi', 'Kategori AHA', 'Catatan & Kondisi']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [2, 132, 199],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 42 },
      2: { cellWidth: 28, fontStyle: 'bold' },
      3: { cellWidth: 22 },
      4: { cellWidth: 38 },
      5: { cellWidth: 42 }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  // Footer for doctor's notes
  const finalY = (doc as any).lastAutoTable.finalY || 220;
  if (finalY < 240) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text('Catatan Dokter / Evaluasi Klinis:', 14, finalY + 10);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, finalY + 22, 120, finalY + 22);
    doc.line(14, finalY + 30, 120, finalY + 30);

    doc.text('Paraf / Tanda Tangan Dokter:', 140, finalY + 10);
    doc.line(140, finalY + 30, 190, finalY + 30);
  }

  // Save PDF file
  const fileName = `AortaLink_Laporan_${profile.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

export async function generateWeeklyReportPDF(profile: Profile, report: WeeklyReport) {
  const { default: JsPDF } = await import('jspdf');
  const { default: table } = await import('jspdf-autotable');
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFillColor(2, 132, 199); doc.rect(0, 0, 210, 25, 'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text('HEARTSYNC — LAPORAN MINGGUAN', 14, 13);
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.text(`Profil: ${profile.name}  |  ${formatWeeklyRangeForPdf(report)}`, 14, 20);
  doc.setTextColor(15,23,42); doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.text('Ringkasan Statistik', 14, 36);
  doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.text(`Rata-rata: ${report.avgSystolic}/${report.avgDiastolic} mmHg    Rentang sistolik: ${report.minSystolic}–${report.maxSystolic} mmHg`, 14, 43);
  doc.text(`Jumlah catatan: ${report.count}    Nadi rata-rata: ${report.avgPulse || '-'} BPM    Kepatuhan: ${report.adherence}%`, 14, 50);
  const categories = Object.entries(report.categories).map(([key,count]) => [key === 'normal' ? 'Normal' : key === 'elevated' ? 'Meningkat' : key === 'stage1' ? 'Hipertensi Tahap 1' : key === 'stage2' ? 'Hipertensi Tahap 2' : 'Krisis', String(count)]);
  table(doc, { startY: 56, head: [['Kategori','Jumlah']], body: categories, theme: 'grid', headStyles: { fillColor: [2,132,199] }, margin: {left:14,right:14} });
  const y = ((doc as any).lastAutoTable?.finalY || 90) + 8;
  doc.setFont('helvetica','bold'); doc.text('Catatan pengukuran minggu ini', 14, y);
  table(doc, { startY: y + 4, head: [['Tanggal','Sistolik/Diastolik','Nadi','Kategori']], body: report.readings.map(r => [format(new Date(r.timestamp),'dd/MM/yyyy HH:mm'), `${r.systolic}/${r.diastolic} mmHg`, `${r.pulse} BPM`, classifyBP(r.systolic,r.diastolic).label]), theme:'grid', headStyles:{fillColor:[2,132,199]}, bodyStyles:{fontSize:8}, margin:{left:14,right:14} });
  const iy = ((doc as any).lastAutoTable?.finalY || 220) + 8; doc.setFont('helvetica','bold'); doc.text('Insight', 14, iy); doc.setFont('helvetica','normal'); doc.setFontSize(9); report.insights.slice(0,6).forEach((s,i)=>doc.text(`• ${s}`, 16, iy + 7 + i*6, {maxWidth:178}));
  doc.save(`Laporan-Mingguan-HBS-${format(new Date(),'yyyy-MM-dd')}.pdf`);
}
function formatWeeklyRangeForPdf(r: WeeklyReport) { return `${format(r.startDate,'dd/MM/yyyy')} - ${format(r.endDate,'dd/MM/yyyy')}`; }
