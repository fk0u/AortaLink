/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · Light Mode Minimalist JSON Backup Modal */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Upload, FileJson, FileUp, Sparkles } from 'lucide-react';
import {
  exportFullAortaLinkJsonPayload,
  createAortaLinkJsonFilename,
  downloadJsonBlob,
  restoreAortaLinkJsonPayload
} from '../../utils/json-importer-exporter';
import { useAppStore } from '../../store/useAppStore';

interface JsonImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JsonImportExportModal: React.FC<JsonImportExportModalProps> = ({
  isOpen,
  onClose
}) => {
  const addToast = useAppStore((state) => state.addToast);
  const setCacheDirty = useAppStore((state) => state.setCacheDirty);
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState('');

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      const payload = await exportFullAortaLinkJsonPayload();
      const filename = createAortaLinkJsonFilename();
      downloadJsonBlob(filename, payload);
      addToast({
        type: 'success',
        title: 'Ekspor JSON Berhasil',
        message: `Berkas ${filename} berhasil diunduh.`
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Ekspor Gagal', message: 'Gagal mengekspor data JSON.' });
    }
  };

  const processJsonText = async (jsonText: string) => {
    setIsImporting(true);
    try {
      const res = await restoreAortaLinkJsonPayload(jsonText);
      if (res.success) {
        setCacheDirty(true);
        addToast({ type: 'success', title: 'Impor Berhasil!', message: res.message });
        setPastedJsonText('');
        onClose();
      } else {
        addToast({ type: 'error', title: 'Impor Gagal', message: res.message });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Berkas atau teks JSON tidak dapat dibaca.' });
    } finally {
      setIsImporting(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      addToast({ type: 'error', title: 'Format Tidak Sesuai', message: 'Hanya berkas .json yang didukung.' });
      return;
    }

    try {
      const text = await file.text();
      await processJsonText(text);
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Gagal membaca berkas berkas JSON.' });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handlePasteSubmit = () => {
    if (!pastedJsonText.trim()) {
      addToast({ type: 'warning', title: 'Teks Kosong', message: 'Tempelkan teks JSON terlebih dahulu.' });
      return;
    }
    processJsonText(pastedJsonText);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-auto flex flex-col text-slate-900 dark:text-slate-100 max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-teal-500 text-white shadow-md shadow-teal-500/20">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Ekspor &amp; Impor Berkas JSON EHR
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Interoperabilitas &amp; Backup Data Rekam Medis (v1.1 / v2.0 &amp; HL7 FHIR R4)
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto">
            
            {/* Export Section */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-slate-100">
                  <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Ekspor Cadangan JSON Rekam Medis</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                  Version 2.0.0
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Unduh seluruh riwayat tensi, profil, pengingat obat, dan FHIR R4 ke berkas JSON.
              </p>
              <button
                type="button"
                onClick={handleExport}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-extrabold text-xs shadow-md shadow-teal-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Unduh Backup JSON
              </button>
            </div>

            {/* File Upload Section Drag & Drop */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-slate-100">
                <Upload className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Metode 1: Unggah / Drag &amp; Drop Berkas .json</span>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`p-5 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                  dragActive
                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 hover:border-teal-400'
                }`}
              >
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="json-file-upload"
                  disabled={isImporting}
                />
                <label htmlFor="json-file-upload" className="cursor-pointer space-y-1.5 block">
                  <div className="w-9 h-9 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                    <FileUp className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-black text-slate-800 dark:text-slate-200">
                    {isImporting ? 'Memproses Berkas...' : 'Pilih Berkas JSON atau Drag & Drop'}
                  </div>
                </label>
              </div>
            </div>

            {/* Textarea Paste JSON Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Metode 2: Tempelkan Teks Raw JSON di Sini
                </label>
              </div>
              <textarea
                rows={5}
                value={pastedJsonText}
                onChange={(e) => setPastedJsonText(e.target.value)}
                placeholder='Tempelkan isi JSON v1.1 / v2.0 (contoh: { "version": "1.1.0", "profiles": [...], "readings": [...] })'
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={handlePasteSubmit}
                disabled={isImporting || !pastedJsonText.trim()}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-sky-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {isImporting ? 'Memproses JSON...' : 'Impor Data dari Teks JSON di Atas'}
              </button>
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400 font-medium shrink-0">
            Kompatibel dengan Format v1.0.0, v1.1.0, v2.0.0, &amp; HL7 FHIR R4
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
