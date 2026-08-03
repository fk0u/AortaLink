import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useProfiles } from '../../hooks/useProfiles';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ComposedChart, Line, BarChart, Bar, Cell } from 'recharts';

export const LifestyleCorrelation: React.FC = () => {
  const { activeProfile } = useProfiles();
  const [tab, setTab] = useState<'sodium' | 'sleep' | 'summary'>('sodium');
  const data = useLiveQuery(async () => {
    if (!activeProfile?.id) return { readings: [], sodium: [], sleep: [], meds: [] };
    const id = activeProfile.id;
    const [readings, sodium, sleep, meds] = await Promise.all([
      db.readings.where('profileId').equals(id).toArray(), db.sodiumLogs.where('profileId').equals(id).toArray(),
      db.sleepLogs.where('profileId').equals(id).toArray(), db.medicationLogs.where('profileId').equals(id).toArray()
    ]);
    return { readings, sodium, sleep, meds };
  }, [activeProfile?.id]);
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.readings.map(r => { const date = r.timestamp.slice(0, 10); return { date, systolic: r.systolic, sodiumMg: data.sodium.find(x => x.date === date)?.sodiumMg, sleepHours: data.sleep.find(x => x.date === date)?.sleepHours, takenCount: data.meds.find(x => x.date === date)?.takenCount }; }).filter(x => x.sodiumMg != null || x.sleepHours != null || x.takenCount != null);
  }, [data]);
  const groups = useMemo(() => ['< 1.500 mg', '1.500–2.300 mg', '> 2.300 mg'].map((label, i) => { const rows = chartData.filter(x => i === 0 ? x.sodiumMg! < 1500 : i === 1 ? x.sodiumMg! >= 1500 && x.sodiumMg! <= 2300 : x.sodiumMg! > 2300); return { label, avg: rows.length ? Math.round(rows.reduce((s, x) => s + x.systolic, 0) / rows.length) : 0 }; }), [chartData]);
  return <section className="hallmark-card p-4 md:p-5 space-y-4"><div className="flex flex-wrap gap-2">{[['sodium','Natrium vs Tekanan Darah'],['sleep','Tidur & Obat vs BP'],['summary','Ringkasan Kategori']].map(([key,label]) => <button key={key} onClick={() => setTab(key as typeof tab)} className={`px-3 py-2 rounded-xl text-xs font-bold ${tab === key ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{label}</button>)}</div>{!chartData.length ? <p className="py-12 text-center text-sm text-slate-500">Belum cukup data untuk analisis</p> : <div className="h-72"><ResponsiveContainer width="100%" height="100%">{tab === 'sodium' ? <ScatterChart><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="sodiumMg" name="Natrium (mg)"/><YAxis dataKey="systolic" name="Sistolik"/><Tooltip/><Scatter data={chartData} fill="#14b8a6"/></ScatterChart> : tab === 'sleep' ? <ComposedChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis yAxisId="left"/><YAxis yAxisId="right" orientation="right"/><Tooltip/><Line yAxisId="left" type="monotone" dataKey="sleepHours" stroke="#6366f1" name="Tidur (jam)"/><Line yAxisId="left" type="monotone" dataKey="takenCount" stroke="#f59e0b" name="Obat diminum"/><Line yAxisId="right" type="monotone" dataKey="systolic" stroke="#ef4444" name="Sistolik"/></ComposedChart> : <BarChart data={groups}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="label"/><YAxis/><Tooltip/><Bar dataKey="avg" name="Rata-rata sistolik" radius={[6,6,0,0]}>{groups.map((_,i)=><Cell key={i} fill={['#14b8a6','#f59e0b','#ef4444'][i]}/>)}</Bar></BarChart>}</ResponsiveContainer></div>}</section>;
};
