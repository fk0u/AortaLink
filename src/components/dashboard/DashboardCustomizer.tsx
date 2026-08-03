import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Check, LayoutDashboard, Settings2 } from 'lucide-react';
import type { DashboardSection } from '../../utils/dashboard-preferences';

type Props = { preferences: DashboardSection[]; onChange: (preferences: DashboardSection[]) => void };

export function DashboardCustomizer({ preferences, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const move = (id: string, direction: -1 | 1) => {
    const visible = preferences.filter((section) => section.visible);
    const index = visible.findIndex((section) => section.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= visible.length) return;
    const next = [...visible];
    [next[index], next[target]] = [next[target], next[index]];
    const order = new Map(next.map((section, position) => [section.id, position]));
    onChange(preferences.map((section) => ({ ...section, order: order.get(section.id) ?? section.order })).sort((a, b) => a.order - b.order));
  };
  const toggle = (id: string) => onChange(preferences.map((section) => section.id === id ? { ...section, visible: !section.visible } : section));

  return <div className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-extrabold text-teal-700 shadow-sm transition hover:bg-teal-50 dark:border-teal-900 dark:bg-slate-900 dark:text-teal-300 dark:hover:bg-slate-800">
      <Settings2 className="h-4 w-4" /> Kustomisasi Dashboard
    </button>
    {open && <div className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-label="Kustomisasi Dashboard">
      <div className="mb-3 flex items-start gap-3"><LayoutDashboard className="mt-0.5 h-5 w-5 text-teal-500" /><div><h3 className="text-sm font-black">Kustomisasi Dashboard</h3><p className="text-[11px] text-slate-500">Pilih bagian dan atur urutannya.</p></div></div>
      <div className="space-y-1.5">{preferences.map((section) => <div key={section.id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2.5 dark:border-slate-800">
        <button type="button" onClick={() => toggle(section.id)} aria-label={`${section.visible ? 'Sembunyikan' : 'Tampilkan'} ${section.label}`} aria-pressed={section.visible} className={`flex min-w-0 flex-1 items-center gap-2 text-left text-xs font-bold ${section.visible ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 line-through'}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${section.visible ? 'bg-teal-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{section.visible && <Check className="h-3.5 w-3.5" />}</span>{section.label}</button>
        <button type="button" disabled={!section.visible || preferences.filter((item) => item.visible).findIndex((item) => item.id === section.id) === 0} onClick={() => move(section.id, -1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800" aria-label="Naikkan"><ArrowUp className="h-4 w-4" /></button>
        <button type="button" disabled={!section.visible || preferences.filter((item) => item.visible).findIndex((item) => item.id === section.id) === preferences.filter((item) => item.visible).length - 1} onClick={() => move(section.id, 1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800" aria-label="Turunkan"><ArrowDown className="h-4 w-4" /></button>
      </div>)}</div>
    </div>}
  </div>;
}
