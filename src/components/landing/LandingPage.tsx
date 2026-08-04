/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · Light Mode Minimalist Landing Page */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  ShieldCheck,
  BrainCircuit,
  Database,
  Smartphone,
  Download,
  ArrowRight,
  LogIn,
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { AuthModal } from '../auth/AuthModal';

interface LandingPageProps {
  onLaunchApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp }) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-500 selection:text-white flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center shadow-md shadow-teal-500/20 text-white">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900">AortaLink</h1>
              <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider block">
                Open-Source AI EHR Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition-all active:scale-95 flex items-center gap-1.5"
            >
              <LogIn className="w-4 h-4 text-teal-600" />
              Masuk / Daftar
            </button>

            <button
              type="button"
              onClick={onLaunchApp}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-extrabold text-xs shadow-md shadow-teal-500/20 transition-all active:scale-95 flex items-center gap-2"
            >
              Buka Dashboard EHR
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 space-y-16">
        <div className="text-center space-y-6 max-w-3xl mx-auto pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold shadow-sm">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>HL7 FHIR R4 Compliant &amp; NVIDIA NIM AI Powered</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Rekam Medis Elektronik Pribadi dengan Presisi Klinis &amp; AI
          </h2>

          <p className="text-base text-slate-600 font-medium leading-relaxed">
            <strong>AortaLink</strong> menjembatani data mentah vital signs pasien dengan analisis klinis Spesialis Penyakit Dalam (Sp.PD), deteksi ritme sirkadian nocturnal dipping, serta sinkronisasi cloud MongoDB Atlas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={onLaunchApp}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-black text-sm shadow-xl shadow-teal-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Mulai EHR Platform Sekarang
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white border border-slate-200/90 text-slate-800 hover:bg-slate-50 font-bold text-sm shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4 text-teal-600" />
              Masuk / Buat Akun Pasien
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="p-3 rounded-2xl bg-teal-500 text-white w-fit shadow-md shadow-teal-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">HL7 FHIR R4 Standard</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Struktur data interoperabilitas internasional untuk Patient, Observation (LOINC 85354-9, 14927-8, 2160-0, 3084-1), dan MedicationRequest.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="p-3 rounded-2xl bg-sky-500 text-white w-fit shadow-md shadow-sky-500/20">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">NVIDIA NIM AI CDSS Engine</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Integrasi AI LLM model <code>z-ai/glm-5.2</code> untuk konsultasi medis streaming &amp; evaluasi risiko kardiovaskular.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="p-3 rounded-2xl bg-emerald-500 text-white w-fit shadow-md shadow-emerald-500/20">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">MongoDB Atlas Cloud Sync</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Sinkronisasi aman cloud database MongoDB Atlas dengan kredensial API terenkripsi untuk backup &amp; multi-device.
            </p>
          </div>

        </div>

        {/* Mobile App Banner */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-teal-500/10 via-sky-500/10 to-transparent border border-teal-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-3xl bg-teal-500 text-white shadow-lg shadow-teal-500/20 shrink-0">
              <Smartphone className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Aplikasi Mobile Flutter Cross-Platform</h3>
              <p className="text-xs text-slate-600 font-medium">
                Tersedia di iOS &amp; Android dengan fitur lengkap vital signs logger, combination medication tracker, &amp; AI consultation.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLaunchApp}
            className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-xs shadow-md shrink-0 flex items-center gap-2 hover:bg-slate-800 transition-all"
          >
            <Download className="w-4 h-4 text-teal-400" />
            Pelajari Flutter Mobile App
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p className="font-extrabold text-slate-800">AortaLink — Open-Source AI-Powered EHR Platform (HL7 FHIR R4 Compliant)</p>
      </footer>

      {/* Auth Modal Trigger */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => onLaunchApp()}
      />
    </div>
  );
};
