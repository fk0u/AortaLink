import { subDays, startOfDay, endOfDay, format, differenceInCalendarDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { BPReading, BPCategoryKey, SodiumLog } from '../types/blood-pressure';
import { classifyBP } from './bp-classifier';

export interface WeeklyReport { startDate: Date; endDate: Date; previousStartDate: Date; previousEndDate: Date; readings: BPReading[]; previousReadings: BPReading[]; count: number; avgSystolic: number; avgDiastolic: number; minSystolic: number; maxSystolic: number; avgPulse: number; categories: Record<BPCategoryKey, number>; morning: number; evening: number; adherence: number; insights: string[]; sodiumHighDays?: number; }
const emptyCategories = (): Record<BPCategoryKey, number> => ({ normal: 0, elevated: 0, stage1: 0, stage2: 0, crisis: 0 });
const avg = (xs: number[]) => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');

export function createWeeklyReport(readings: BPReading[], sodiumLogs: SodiumLog[] = [], now = new Date()): WeeklyReport {
  const endDate = endOfDay(now); const startDate = startOfDay(subDays(now, 6));
  const previousEndDate = endOfDay(subDays(now, 7)); const previousStartDate = startOfDay(subDays(now, 13));
  const inRange = (r: BPReading, start: Date, end: Date) => { const t = new Date(r.timestamp); return t >= start && t <= end; };
  const current = readings.filter(r => inRange(r, startDate, endDate)).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
  const previous = readings.filter(r => inRange(r, previousStartDate, previousEndDate));
  const categories = emptyCategories(); current.forEach(r => categories[classifyBP(r.systolic, r.diastolic).key]++);
  const days = new Set(current.map(r => dayKey(new Date(r.timestamp))));
  const morning = current.filter(r => new Date(r.timestamp).getHours() < 12).length;
  const evening = current.filter(r => new Date(r.timestamp).getHours() >= 17).length;
  const insights: string[] = [];
  if (!current.length) insights.push('Belum ada cukup data untuk menyusun ringkasan minggu ini. Mulai catat tekanan darah secara rutin.');
  else {
    if (previous.length) { const delta = avg(current.map(r=>r.systolic)) - avg(previous.map(r=>r.systolic)); if (Math.abs(delta) >= 3) insights.push(`Rata-rata sistolik ${delta > 0 ? 'naik' : 'turun'} ${Math.abs(delta)} mmHg dibanding minggu lalu.`); else insights.push('Rata-rata sistolik relatif stabil dibanding minggu lalu.'); }
    const normalDays = new Set(current.filter(r => classifyBP(r.systolic,r.diastolic).key === 'normal').map(r => dayKey(new Date(r.timestamp)))).size;
    insights.push(`Tekanan darah kategori normal tercatat pada ${normalDays} dari 7 hari.`);
    if (days.size < 7) insights.push(`Konsistensi pengukuran ${days.size} dari 7 hari; usahakan mencatat setiap hari.`); else insights.push('Pengukuran tercatat setiap hari minggu ini. Pertahankan kebiasaan baik!');
    const best = [...days].map(d => ({ d, value: avg(current.filter(r=>dayKey(new Date(r.timestamp))===d).map(r=>r.systolic)) })).sort((a,b)=>a.value-b.value)[0];
    if (best) insights.push(`Hari dengan rata-rata sistolik terendah: ${format(new Date(best.d), 'EEEE', {locale: idLocale})}.`);
    if (morning && evening) insights.push(`Terbagi ${morning} pengukuran pagi dan ${evening} pengukuran sore/malam.`);
    const highSodium = new Set(sodiumLogs.filter(s => s.sodiumMg >= 2300 && s.date >= dayKey(startDate) && s.date <= dayKey(endDate)).map(s=>s.date));
    const highReadings = current.filter(r => highSodium.has(dayKey(new Date(r.timestamp))));
    if (highReadings.length && highSodium.size) insights.push(`Pada ${highSodium.size} hari dengan sodium tinggi, tercatat ${highReadings.length} pengukuran; hubungan ini bukan diagnosis.`);
  }
  return { startDate,endDate,previousStartDate,previousEndDate,readings:current,previousReadings:previous,count:current.length,avgSystolic:avg(current.map(r=>r.systolic)),avgDiastolic:avg(current.map(r=>r.diastolic)),minSystolic:current.length?Math.min(...current.map(r=>r.systolic)):0,maxSystolic:current.length?Math.max(...current.map(r=>r.systolic)):0,avgPulse:avg(current.map(r=>r.pulse).filter(Boolean)),categories,morning,evening,adherence:Math.round(days.size/7*100),insights };
}
export const formatWeeklyRange = (r: WeeklyReport) => `${format(r.startDate,'d MMM',{locale:idLocale})} – ${format(r.endDate,'d MMM yyyy',{locale:idLocale})}`;
