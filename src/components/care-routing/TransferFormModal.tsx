import React, { useState } from 'react';
import { FileText, X, Printer, Send } from '../icons/AppIcons.tsx';
import { FacilityType, TransferForm } from '../../types/care-routing';

interface TransferFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientAge: number;
  latestSystolic: number;
  latestDiastolic: number;
  recommendedFacility: FacilityType;
  primaryReason: string;
}

export function TransferFormModal({
  isOpen,
  onClose,
  patientName,
  patientAge,
  latestSystolic,
  latestDiastolic,
  recommendedFacility,
  primaryReason
}: TransferFormModalProps) {
  const [targetFacility, setTargetFacility] = useState<FacilityType>(recommendedFacility);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Formulir Rujukan/Transfer</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 print:p-0 print:overflow-visible text-gray-800 dark:text-gray-200">
          <div className="space-y-4">
            
            {/* Patient Info */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Informasi Pasien</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nama</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Usia</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{patientAge} tahun</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tekanan Darah Terakhir</p>
                  <p className="font-bold text-red-600 dark:text-red-400">{latestSystolic}/{latestDiastolic} mmHg</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tanggal Pengajuan</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{new Date().toLocaleDateString('id-ID')}</p>
                </div>
              </div>
            </div>

            {/* Referral Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Alasan Rujukan
              </label>
              <textarea 
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 text-sm focus:ring-blue-500 focus:border-blue-500 border"
                rows={2}
                readOnly
                value={primaryReason}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fasilitas Tujuan
              </label>
              <select 
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 text-sm focus:ring-blue-500 focus:border-blue-500 border"
                value={targetFacility}
                onChange={(e) => setTargetFacility(e.target.value as FacilityType)}
              >
                <option value="IGD">Instalasi Gawat Darurat (IGD)</option>
                <option value="RS_RUJUKAN_JANTUNG">RS Rujukan / Poli Jantung</option>
                <option value="KLINIK_SPESIALIS">Klinik Spesialis</option>
                <option value="PUSKESMAS">Puskesmas / Faskes Primer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <textarea 
                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 text-sm focus:ring-blue-500 focus:border-blue-500 border"
                rows={3}
                placeholder="Tambahkan riwayat penyakit atau obat yang sedang dikonsumsi..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

          </div>
        </div>

        {/* Footer / Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 print:hidden">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={handlePrint}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Cetak
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Send className="w-4 h-4" />
            Simpan Rujukan
          </button>
        </div>

      </div>
    </div>
  );
}
