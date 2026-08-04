import React, { useMemo } from 'react';
import { useProfiles } from '../../hooks/useProfiles';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { calculateMedicationAdherence } from '../../utils/medication-adherence';
import { motion } from 'framer-motion';
import { Pill, CheckCircle2, AlertTriangle, XCircle, TrendingUp, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export const MedicationAdherencePanel: React.FC = () => {
  const { activeProfile } = useProfiles();

  const medications = useLiveQuery(
    async () => {
      if (!activeProfile?.id) return [];
      return await db.medications.where('profileId').equals(activeProfile.id).toArray();
    },
    [activeProfile?.id]
  );

  const medLogs = useLiveQuery(
    async () => {
      if (!activeProfile?.id) return [];
      return await db.medicationLogs.where('profileId').equals(activeProfile.id).toArray();
    },
    [activeProfile?.id]
  );

  const adherence = useMemo(
    () => calculateMedicationAdherence(medications || [], medLogs || [], 30),
    [medications, medLogs]
  );

  if (!medications || medications.length === 0) return null;

  const riskConfig = {
    patuh: { color: 'emerald', icon: CheckCircle2, chartColor: '#10b981' },
    kurang_patuh: { color: 'amber', icon: AlertTriangle, chartColor: '#f59e0b' },
    tidak_patuh: { color: 'rose', icon: XCircle, chartColor: '#f43f5e' }
  };

  const cfg = riskConfig[adherence.riskLevel];
  const RiskIcon = cfg.icon;

  const donutData = [
    { name: 'Diminum', value: adherence.totalTakenDoses },
    { name: 'Terlewat', value: Math.max(0, adherence.totalExpectedDoses - adherence.totalTakenDoses) }
  ];
  const DONUT_COLORS = [cfg.chartColor, '#e2e8f0'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="hallmark-card p-4 md:p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/20">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              Indeks Kepatuhan Minum Obat
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Tingkat kepatuhan 30 hari terakhir
            </p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border
          ${cfg.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : ''}
          ${cfg.color === 'amber' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' : ''}
          ${cfg.color === 'rose' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' : ''}
        `}>
          {adherence.riskLabel}
        </span>
      </div>

      {/* Main Content: Donut + Stats */}
      <div className="flex items-center gap-4">
        {/* Donut Chart */}
        <div className="w-28 h-28 shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={48}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {donutData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={DONUT_COLORS[index]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-black
              ${cfg.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : ''}
              ${cfg.color === 'amber' ? 'text-amber-600 dark:text-amber-400' : ''}
              ${cfg.color === 'rose' ? 'text-rose-600 dark:text-rose-400' : ''}
            `}>
              {adherence.adherencePercent}%
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[9px] text-slate-400 font-bold block">Dosis Diminum</span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">{adherence.totalTakenDoses}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[9px] text-slate-400 font-bold block">Dosis Seharusnya</span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">{adherence.totalExpectedDoses}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[9px] text-slate-400 font-bold block flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Streak</span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">{adherence.streak} hari</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[9px] text-slate-400 font-bold block flex items-center gap-1"><Calendar className="w-3 h-3" /> Terlewat</span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100">{adherence.missedDoses.length}</span>
          </div>
        </div>
      </div>

      {/* Description & Advice */}
      <div className={`p-3 rounded-2xl border text-xs
        ${cfg.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60' : ''}
        ${cfg.color === 'amber' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60' : ''}
        ${cfg.color === 'rose' ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60' : ''}
      `}>
        <div className="flex items-center gap-1.5 font-extrabold text-slate-900 dark:text-slate-100">
          <RiskIcon className="w-4 h-4 shrink-0" />
          {adherence.riskDescription}
        </div>
      </div>

      {/* Recent Missed Doses (if any) */}
      {adherence.missedDoses.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-[10px] font-extrabold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Lihat {Math.min(adherence.missedDoses.length, 10)} dosis terlewat terakhir
          </summary>
          <div className="mt-2 space-y-1">
            {adherence.missedDoses.slice(-10).reverse().map((m, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300">{m.medicationName}</span>
                <span className="text-slate-400">{m.date} ({m.schedule})</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </motion.div>
  );
};
