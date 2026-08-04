import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Phone, Share2, Send, Heart, ShieldAlert } from 'lucide-react';
import { useProfiles } from '../../hooks/useProfiles';
import { useReadings } from '../../hooks/useReadings';
import { classifyBP } from '../../utils/bp-classifier';
import { playAlertSound } from '../../utils/audio-fx';

interface FamilySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FamilySOSModal: React.FC<FamilySOSModalProps> = ({ isOpen, onClose }) => {
  const { activeProfile } = useProfiles();
  const { stats } = useReadings();

  const [caregiverPhone, setCaregiverPhone] = useState('081234567890');
  const [doctorPhone, setDoctorPhone] = useState('089988776655');

  const latest = stats.latestReading;
  const category = latest ? classifyBP(latest.systolic, latest.diastolic) : null;

  const handleSendWhatsAppSOS = (phone: string, targetName: string) => {
    playAlertSound();
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;

    const message = `🚨 *DARURAT AORTALINK - KONDISI MEDIS KRITIS* 🚨\n\nNama Pasien: *${activeProfile?.name || 'Pasien'}*\nTekanan Darah Terakhir: *${latest ? `${latest.systolic}/${latest.diastolic} mmHg` : 'Tidak Diketahui'}*\nDenyut Nadi: *${latest?.pulse || '--'} BPM*\nStatus AHA: *${category?.label || 'Krisis Hipertensi'}*\nWaktu Pengukuran: *${latest ? new Date(latest.timestamp).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')}*\n\n_Dimohon untuk segera menghubungi pasien atau datang ke lokasi!_`;

    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] sm:pb-4 bg-rose-950/80 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-[32px] max-w-md w-full shadow-2xl border border-rose-300 dark:border-rose-900 overflow-hidden my-auto p-6 space-y-6 text-center"
        >
          <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-900/60 pb-3">
            <div className="flex items-center gap-2 text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              Kontak Darurat Caregiver (SOS)
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center mx-auto animate-bounce">
              <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
              Kirim Notifikasi Darurat 1-Klik
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Langsung kirim pesan WhatsApp darurat terformat dengan detail tensi terakhir ke anggota keluarga/caregiver.
            </p>
          </div>

          {/* Current Reading Summary Card */}
          {latest && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-rose-600 dark:text-rose-400 block">
                Tensi Saat Ini:
              </span>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {latest.systolic} / {latest.diastolic} <span className="text-xs font-bold text-slate-400">mmHg</span>
              </div>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
                {category?.label}
              </span>
            </div>
          )}

          {/* Caregiver Phone Input & WhatsApp SOS Trigger */}
          <div className="space-y-3 text-left">
            <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
              Nomor WhatsApp Keluarga / Caregiver:
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={caregiverPhone}
                onChange={(e) => setCaregiverPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              />
              <button
                onClick={() => handleSendWhatsAppSOS(caregiverPhone, 'Keluarga')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                WhatsApp
              </button>
            </div>

            {/* Ambulance Direct Call */}
            <div className="pt-2">
              <a
                href="tel:118"
                className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-xl shadow-rose-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Phone className="w-4 h-4" />
                Panggil Ambulans Darurat (118 / 112)
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
