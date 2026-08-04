import React, { useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import { db } from '../../db';
import { BPCategoryKey, DateFilterRange, BPReading, BackupDataFormat } from '../../types/blood-pressure';
import { Search, Filter, Download, Upload, X, Database } from 'lucide-react';

export const HistoryFilter: React.FC = () => {
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setSearchQuery = useAppStore((state) => state.setSearchQuery);
  const dateFilter = useAppStore((state) => state.dateFilter);
  const setDateFilter = useAppStore((state) => state.setDateFilter);
  const categoryFilter = useAppStore((state) => state.categoryFilter);
  const setCategoryFilter = useAppStore((state) => state.setCategoryFilter);
  const addToast = useAppStore((state) => state.addToast);
  const { activeProfileId, activeProfile, switchProfile } = useProfiles();

  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Export CSV helper
  const handleExportCSV = async () => {
    if (!activeProfileId) return;
    const readings = await db.readings.where('profileId').equals(activeProfileId).sortBy('timestamp');
    if (readings.length === 0) {
      addToast({ type: 'info', title: 'Ekspor Data', message: 'Belum ada data tensi untuk diekspor.' });
      return;
    }

    const headers = ['ID', 'Sistolik', 'Diastolik', 'Pulse', 'Timestamp', 'Posisi', 'Lengan', 'Tags', 'Catatan'];
    const rows = readings.map((r) => [
      r.id,
      r.systolic,
      r.diastolic,
      r.pulse,
      r.timestamp,
      r.position || '',
      r.arm || '',
      (r.tags || []).join(';'),
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AortaLink_${activeProfile?.name || 'User'}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({ type: 'success', title: 'Ekspor CSV Berhasil', message: `${readings.length} data tensi berhasil diekspor.` });
  };

  // Export Full JSON Backup
  const handleExportJSON = async () => {
    try {
      const profiles = await db.profiles.toArray();
      const readings = await db.readings.toArray();
      const reminders = await db.reminders.toArray();

      const backup: BackupDataFormat = {
        version: '1.1.0',
        exportedAt: new Date().toISOString(),
        profiles,
        readings,
        reminders
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `AortaLink_Full_Backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      addToast({ type: 'success', title: 'Cadangan JSON Siap', message: 'Seluruh profil & riwayat berhasil disimpan.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Gagal Ekspor JSON', message: 'Terjadi kesalahan ekspor database.' });
    }
  };

  // Import Full JSON Restore
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const backupData: BackupDataFormat = JSON.parse(content);

        if (!backupData.profiles || !backupData.readings) {
          throw new Error('Format JSON cadangan tidak valid');
        }

        await db.profiles.clear();
        await db.readings.clear();
        await db.reminders.clear();

        await db.profiles.bulkAdd(backupData.profiles);
        await db.readings.bulkAdd(backupData.readings);
        if (backupData.reminders) {
          await db.reminders.bulkAdd(backupData.reminders);
        }

        if (backupData.profiles.length > 0) {
          switchProfile(backupData.profiles[0].id);
        }

        addToast({
          type: 'success',
          title: 'Restorasi Database Berhasil',
          message: `${backupData.profiles.length} profil dan ${backupData.readings.length} pencatatan berhasil dipulihkan.`
        });
      } catch (err) {
        addToast({ type: 'error', title: 'Gagal Impor JSON', message: 'File JSON cadangan rusak atau tidak valid.' });
      }
    };
    reader.readAsText(file);
  };

  // Import CSV helper
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProfileId) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length <= 1) return;

        const newReadings: BPReading[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length >= 4) {
            newReadings.push({
              profileId: activeProfileId,
              systolic: parseInt(cols[1]),
              diastolic: parseInt(cols[2]),
              pulse: parseInt(cols[3]),
              timestamp: cols[4] || new Date().toISOString(),
              position: (cols[5] as any) || 'duduk',
              arm: (cols[6] as any) || 'kiri',
              tags: cols[7] ? cols[7].split(';') : [],
              notes: cols[8] ? cols[8].replace(/^"|"$/g, '').replace(/""/g, '"') : ''
            });
          }
        }

        if (newReadings.length > 0) {
          await db.readings.bulkAdd(newReadings);
          addToast({
            type: 'success',
            title: 'Impor CSV Berhasil',
            message: `${newReadings.length} data tensi telah ditambahkan.`
          });
        }
      } catch (err) {
        addToast({ type: 'error', title: 'Gagal Impor CSV', message: 'Format file CSV tidak valid.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-lg shadow-slate-200/40 dark:shadow-none space-y-4">
      
      {/* Top Search & Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari catatan, label, atau angka tensi..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Export / Import Actions */}
        <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
            title="Ekspor Data ke File CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>

          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-semibold text-xs transition-colors"
            title="Backup Seluruh Database JSON"
          >
            <Database className="w-3.5 h-3.5" />
            Backup JSON
          </button>

          <button
            onClick={() => jsonInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
            title="Pulihkan Cadangan Database JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            Restore
          </button>

          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />

          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJSON}
            className="hidden"
          />
        </div>
      </div>

      {/* Date & Category Filter Bars */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        
        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['7days', '30days', '90days', 'all'] as DateFilterRange[]).map((range) => {
            const labels: Record<string, string> = {
              '7days': '7 Hari Terakhir',
              '30days': '30 Hari Terakhir',
              '90days': '90 Hari',
              'all': 'Semua Riwayat'
            };
            const isSelected = dateFilter === range;

            return (
              <button
                key={range}
                onClick={() => setDateFilter(range)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {labels[range]}
              </button>
            );
          })}
        </div>

        {/* AHA Category Selector Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Semua Kategori</option>
            <option value="normal">🟢 Normal</option>
            <option value="elevated">🟡 Meningkat (Elevated)</option>
            <option value="stage1">🟠 Hipertensi Tahap 1</option>
            <option value="stage2">🔴 Hipertensi Tahap 2</option>
            <option value="crisis">🚨 Krisis Hipertensi</option>
          </select>
        </div>

      </div>
    </div>
  );
};
