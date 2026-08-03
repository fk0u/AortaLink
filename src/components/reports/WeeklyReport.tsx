import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useProfiles } from '../../hooks/useProfiles';
import { useReadings } from '../../hooks/useReadings';
import { createWeeklyReport, formatWeeklyRange } from '../../utils/weekly-report';
import { generateWeeklyReportPDF } from '../../utils/pdf-generator';
import { Download, TrendingUp, CalendarDays } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const WeeklyReport: React.FC = () => {
  const { activeProfile } = useProfiles(); const { rawReadings } = useReadings(); const [busy, setBusy] = useState(false);
  const sodium = useLiveQuery(() => activeProfile ? db.sodiumLogs.where('profileId').equals(activeProfile.id).toArray() : [], [activeProfile?.id]) || [];
  const report = useMemo(() => createWeeklyReport(rawReadings, sodium), [rawReadings, sodium]);
  const chart = report.readings.map(r => ({ tanggal: new Date(r.timestamp).toLocaleDateString('id-ID',{weekday:'short'}), sistolik:r.systolic, diastolik:r.diastolic }));
  const download = async () => { if (!activeProfile || !report.count) return; setBusy(true); try { await generateWeeklyReportPDF(activeProfile, report); } finally { setBusy(false); } };
  return <section className="space-y-4">
    <div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Laporan Mingguan</h2><p className="text-xs text-slate-500">Ringkasan otomatis 7 hari terakhir · {formatWeeklyRange(report)}</p></div><CalendarDays className="text-sky-500" /></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['Rata-rata',`${report.avgSystolic}/${report.avgDiastolic}`, 'mmHg'],['Rentang sistolik',`${report.minSystolic}–${report.maxSystolic}`,'mmHg'],['Jumlah catatan',report.count,'kali'],['Kepatuhan',`${report.adherence}%`,'hari']].map(([label,value,unit])=><div className="hallmark-card p-4" key={label as string}><p className="text-[10px] uppercase font-bold text-slate-400">{label}</p><p className="text-xl font-black text-slate-800 dark:text-white mt-1">{value}</p><p className="text-[10px] text-slate-400">{unit}</p></div>)}</div>
    {chart.length > 0 && <div className="hallmark-card p-4"><h3 className="font-bold text-sm mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-sky-500"/>Tren tekanan darah</h3><ResponsiveContainer width="100%" height={180}><LineChart data={chart}><XAxis dataKey="tanggal" tick={{fontSize:10}}/><YAxis width={28} tick={{fontSize:10}}/><Tooltip/><Line type="monotone" dataKey="sistolik" stroke="#0284c7" strokeWidth={2} dot={{r:3}}/><Line type="monotone" dataKey="diastolik" stroke="#14b8a6" strokeWidth={2} dot={{r:3}}/></LineChart></ResponsiveContainer></div>}
    <div className="hallmark-card p-4"><h3 className="font-bold text-sm mb-3">Insight minggu ini</h3><ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">{report.insights.map((i,n)=><li key={n} className="flex gap-2"><span className="text-sky-500">•</span>{i}</li>)}</ul></div>
    <button onClick={download} disabled={busy || !report.count} className="hallmark-button-primary w-full py-3.5 inline-flex justify-center items-center gap-2 disabled:opacity-50"><Download className="w-4 h-4"/>{busy?'Membuat PDF…':'Unduh Laporan PDF'}</button>
  </section>;
};
