import React, { useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import { db, newSyncId } from '../../db';
import { BPCategoryKey, DateFilterRange, BPReading, BackupDataFormat } from '../../types/blood-pressure';
import { Search, Filter, Download, Upload, X, Database } from '../icons/AppIcons';
import { normalizeBackupPayload, restoreBackupPayload } from '../../utils/backup';
import { playClickSound, playSuccessChime, playAlertSound } from '../../utils/audio-fx';
import { validateBPRange } from '../../security/sanitizer';

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
    playClickSound();
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

    playSuccessChime();
    addToast({ type: 'success', title: 'Ekspor CSV Berhasil', message: `${readings.length} data tensi berhasil diekspor.` });
  };

  // Export Full JSON Backup
  const handleExportJSON = async () => {
    playClickSound();
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

      playSuccessChime();
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

        // Full replace through the sync-aware path: removed records are
        // tombstoned so cloud sync doesn't bring them back.
        await restoreBackupPayload(normalizeBackupPayload(backupData));

        if (backupData.profiles.length > 0) {
          switchProfile(backupData.profiles[0].id);
        }

        playSuccessChime();
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
        let skippedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length >= 4) {
            const systolic = parseInt(cols[1], 10);
            const diastolic = parseInt(cols[2], 10);
            const rawPulse = cols[3] ? parseInt(cols[3], 10) : undefined;
            const pulse = !isNaN(rawPulse as number) ? rawPulse : undefined;

            const validation = validateBPRange(systolic, diastolic, pulse);
            if (!validation.valid) {
              skippedCount++;
              continue;
            }

            newReadings.push({
              id: (cols[0] && cols[0].trim().length > 0) ? cols[0].trim() : newSyncId(),
              profileId: activeProfileId,
              systolic,
              diastolic,
              pulse,
              timestamp: cols[4]?.trim() || new Date().toISOString(),
              position: (cols[5]?.trim() as any) || 'duduk',
              arm: (cols[6]?.trim() as any) || 'kiri',
              tags: cols[7] ? cols[7].split(';').map((t) => t.trim()).filter(Boolean) : [],
              notes: cols[8] ? cols[8].replace(/^"|"$/g, '').replace(/""/g, '"') : ''
            });
          }
        }

        if (newReadings.length > 0) {
          await db.readings.bulkAdd(newReadings);
          playSuccessChime();
          const skipMsg = skippedCount > 0 ? ` (${skippedCount} baris tidak valid dilewati)` : '';
          addToast({
            type: 'success',
            title: 'Impor CSV Berhasil',
            message: `${newReadings.length} data tensi telah ditambahkan${skipMsg}.`
          });
        } else {
          playAlertSound();
          addToast({
            type: 'error',
            title: 'Gagal Impor CSV',
            message: skippedCount > 0 ? `Semua baris (${skippedCount}) memiliki nilai tensi di luar batas valid.` : 'Tidak ada data valid yang ditemukan.'
          });
        }
      } catch (err) {
        addToast({ type: 'error', title: 'Gagal Impor CSV', message: 'Format file CSV tidak valid.' });
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="rounded-[24px] bg-white dark:bg-[#1c1c1e] border border-slate-200/80 dark:border-white/10 p-4 shadow-sm space-y-3">
      
      {/* Top Search & Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search size={16} className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari angka tensi, catatan, atau label..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#2c2c2e] border border-slate-200/80 dark:border-white/10 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              aria-label="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Quick Export/Import Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs active:scale-95 transition-all"
            title="Ekspor Data ke File CSV"
          >
            <Download size={14} />
            CSV
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold text-xs active:scale-95 transition-all border border-teal-200 dark:border-teal-900/60"
            title="Backup Seluruh Database JSON"
          >
            <Database size={14} />
            JSON
          </button>

          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs active:scale-95 transition-all"
            title="Pulihkan Cadangan Database JSON"
          >
            <Upload size={14} />
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

      {/* Filter Chips Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-white/10">
        
        {/* Date Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {(['7days', '30days', '90days', 'all'] as DateFilterRange[]).map((range) => {
            const labels: Record<string, string> = {
              '7days': '7 Hari',
              '30days': '30 Hari',
              '90days': '90 Hari',
              'all': 'Semua'
            };
            const isSelected = dateFilter === range;

            return (
              <button
                key={range}
                type="button"
                onClick={() => {
                  playClickSound();
                  setDateFilter(range);
                }}
                className={`m3-chip whitespace-nowrap text-[11px] py-1 px-3 ${
                  isSelected
                    ? 'bg-teal-500 text-white border-teal-500 shadow-md shadow-teal-500/25'
                    : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {labels[range]}
              </button>
            );
          })}
        </div>

        {/* AHA Category Selector Pill */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <Filter size={14} className="text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => {
              playClickSound();
              setCategoryFilter(e.target.value as any);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] border border-slate-200/80 dark:border-white/10 text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            <option value="all">Semua Kategori Klinis</option>
            <option value="optimal">Optimal (&lt; 120/80)</option>
            <option value="normal">Normal</option>
            <option value="elevated">Normal-Tinggi / Meningkat</option>
            <option value="stage1">Hipertensi Derajat 1</option>
            <option value="stage2">Hipertensi Derajat 2</option>
            <option value="stage3">Hipertensi Derajat 3 (≥ 180/110)</option>
            <option value="crisis">Hipertensi Berat (&gt; 180/120)</option>
          </select>
        </div>

      </div>

    </div>
  );
};
