import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import { db } from '../../db';
import { BackupDataFormat } from '../../types/blood-pressure';
import { encryptBackupData, decryptBackupData, EncryptedPayload } from '../../utils/crypto-storage';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Key, ShieldCheck, Download, Upload, FileText, CheckCircle2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface SecurityBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityBackupModal: React.FC<SecurityBackupModalProps> = ({ isOpen, onClose }) => {
  const addToast = useAppStore((state) => state.addToast);
  const { activeProfile, switchProfile } = useProfiles();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab mode: 'export' | 'import' | 'security'
  const [activeSubTab, setActiveSubTab] = useState<'export' | 'import' | 'security'>('export');

  // Encryption password states
  const [enableEncryption, setEnableEncryption] = useState(true);
  const [exportPassword, setExportPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Import decrypt prompt state
  const [importFilePayload, setImportFilePayload] = useState<any | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [isEncryptedFile, setIsEncryptedFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset local states
  const resetForm = () => {
    setExportPassword('');
    setImportFilePayload(null);
    setImportPassword('');
    setIsEncryptedFile(false);
    setIsProcessing(false);
  };

  // Export Encrypted or Plain JSON Backup
  const handlePerformExport = async () => {
    try {
      setIsProcessing(true);

      const profiles = await db.profiles.toArray();
      const readings = await db.readings.toArray();
      const reminders = await db.reminders.toArray();

      const rawBackup: BackupDataFormat = {
        version: '1.1.0',
        exportedAt: new Date().toISOString(),
        profiles,
        readings,
        reminders
      };

      if (enableEncryption) {
        if (!exportPassword.trim() || exportPassword.length < 4) {
          addToast({ type: 'warning', title: 'Password Terlalu Pendek', message: 'Minimal password 4 karakter untuk enkripsi AES-256.' });
          setIsProcessing(false);
          return;
        }

        const encryptedResult = await encryptBackupData(rawBackup, exportPassword);
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(encryptedResult, null, 2));
        
        const anchor = document.createElement('a');
        anchor.setAttribute('href', dataStr);
        anchor.setAttribute('download', `AortaLink_Encrypted_Backup_${new Date().toISOString().slice(0, 10)}.albackup`);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        addToast({
          type: 'success',
          title: 'Cadangan Terenkripsi Disimpan',
          message: 'Berkas AES-256-GCM (.albackup) telah diunduh aman.'
        });
      } else {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rawBackup, null, 2));
        const anchor = document.createElement('a');
        anchor.setAttribute('href', dataStr);
        anchor.setAttribute('download', `AortaLink_Plain_Backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        addToast({
          type: 'success',
          title: 'Cadangan Standar Disimpan',
          message: 'Berkas JSON backup berhasil diunduh.'
        });
      }

      resetForm();
    } catch (err) {
      addToast({ type: 'error', title: 'Gagal Ekspor', message: 'Terjadi kesalahan saat memproses enkripsi.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Select File to Import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);

        setImportFilePayload(parsed);

        if (parsed.encrypted === true && parsed.algorithm === 'AES-GCM') {
          setIsEncryptedFile(true);
          addToast({ type: 'info', title: 'Berkas Terenkripsi Ditemukan', message: 'Masukkan kata sandi enkripsi untuk memulihkan.' });
        } else {
          setIsEncryptedFile(false);
        }
      } catch (err) {
        addToast({ type: 'error', title: 'Format Tidak Valid', message: 'File JSON/Cadangan rusak atau tidak didukung.' });
        setImportFilePayload(null);
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handlePerformRestore = async () => {
    if (!importFilePayload) return;

    try {
      setIsProcessing(true);
      let dataToRestore: BackupDataFormat;

      if (isEncryptedFile) {
        if (!importPassword) {
          addToast({ type: 'warning', title: 'Password Diperlukan', message: 'Silakan masukkan kata sandi dekripsi.' });
          setIsProcessing(false);
          return;
        }

        dataToRestore = await decryptBackupData(importFilePayload as EncryptedPayload, importPassword);
      } else {
        dataToRestore = importFilePayload;
      }

      if (!dataToRestore.profiles || !dataToRestore.readings) {
        throw new Error('Format data tidak lengkap.');
      }

      // Overwrite database
      await db.profiles.clear();
      await db.readings.clear();
      await db.reminders.clear();

      await db.profiles.bulkAdd(dataToRestore.profiles);
      await db.readings.bulkAdd(dataToRestore.readings);
      if (dataToRestore.reminders) {
        await db.reminders.bulkAdd(dataToRestore.reminders);
      }

      if (dataToRestore.profiles.length > 0) {
        switchProfile(dataToRestore.profiles[0].id);
      }

      addToast({
        type: 'success',
        title: 'Restorasi Berhasil!',
        message: `${dataToRestore.profiles.length} profil dan ${dataToRestore.readings.length} catatan tensi telah dipulihkan.`
      });

      resetForm();
      onClose();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Gagal Dekripsi / Restorasi',
        message: err.message || 'Kata sandi salah atau data terenkripsi rusak.'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] sm:pb-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Keamanan Data &amp; Cadangan Terenkripsi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Penyimpanan lokal IndexedDB + Enkripsi AES-256-GCM
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subtabs Selector */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 pt-3 gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('export')}
              className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'export'
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Cadangkan Data (Backup)
            </button>
            <button
              onClick={() => setActiveSubTab('import')}
              className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'import'
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Pulihkan Data (Restore)
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            
            {/* SUBTAB 1: EXPORT BACKUP */}
            {activeSubTab === 'export' && (
              <div className="space-y-5">
                <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-xs text-teal-900 dark:text-teal-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-teal-600" />
                    Enkripsi Standar Industri AES-256-GCM
                  </div>
                  <p className="text-teal-800 dark:text-teal-300">
                    Cadangan data Anda dapat dilindungi dengan Password/PIN. Kunci enkripsi diturunkan secara aman menggunakan PBKDF2 (100.000 iterasi) langsung di memori browser Anda.
                  </p>
                </div>

                {/* Encryption Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Aktifkan Enkripsi Password
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Melindungi isi file cadangan dari akses tanpa izin
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnableEncryption(!enableEncryption)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${enableEncryption ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5 transition-transform ${enableEncryption ? 'left-5.5' : 'left-0.5'}`}></span>
                  </button>
                </div>

                {/* Password Input (If encryption enabled) */}
                {enableEncryption && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                      <span>Buat Password Enkripsi:</span>
                      <span className="text-[10px] text-teal-600">Minimal 4 Karakter</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={exportPassword}
                        onChange={(e) => setExportPassword(e.target.value)}
                        placeholder="Masukkan password atau PIN rahasia..."
                        className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handlePerformExport}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-500 hover:to-sky-500 text-white font-bold text-xs shadow-xl shadow-teal-500/25 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isProcessing ? 'Memproses Enkripsi...' : enableEncryption ? 'Unduh Berkas Terenkripsi (.hsbackup)' : 'Unduh Berkas JSON Standar'}
                </button>
              </div>
            )}

            {/* SUBTAB 2: IMPORT RESTORE */}
            {activeSubTab === 'import' && (
              <div className="space-y-5">
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Pilih Berkas Cadangan (.hsbackup / .json)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Dukungan restorasi file terenkripsi AES-256 maupun JSON polos
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
                  >
                    Pilih File dari Perangkat
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.hsbackup"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Selected File Details & Password Prompt */}
                {importFilePayload && (
                  <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-teal-500" />
                        Berkas Terpilih
                      </span>
                      {isEncryptedFile ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
                          🔒 Terenkripsi (AES-GCM)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                          🔓 JSON Standar
                        </span>
                      )}
                    </div>

                    {isEncryptedFile && (
                      <div className="space-y-1 pt-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                          Masukkan Password Dekripsi:
                        </label>
                        <input
                          type="password"
                          value={importPassword}
                          onChange={(e) => setImportPassword(e.target.value)}
                          placeholder="Password yang digunakan saat ekspor..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        onClick={handlePerformRestore}
                        disabled={isProcessing}
                        className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-colors"
                      >
                        {isProcessing ? 'Dekripsi & Memulihkan...' : 'Pulihkan Database Sekarang'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
