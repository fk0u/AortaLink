/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · Light Mode Minimalist SaaS Landing Page */
import React, { useState } from 'react';
import {
  Heart,
  BrainCircuit,
  Database,
  Smartphone,
  ArrowRight,
  LogIn,
  Layers,
  Sparkles,
  CheckCircle2,
  Zap,
  Building2,
  UserCheck
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
              <h1 className="text-base font-black tracking-tight text-slate-900">AortaLink SaaS</h1>
              <span className="text-[10px] font-extrabold text-teal-600 uppercase tracking-wider block">
                Open-Source AI EHR Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-extrabold text-xs transition-all active:scale-95 flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Masuk / Google SSO
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 space-y-20">
        
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold shadow-sm">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>HL7 FHIR R4 • NVIDIA NIM AI (z-ai/glm-5.2) • MongoDB Atlas</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Platform AI EHR SaaS untuk Pasien Mandiri &amp; Multi-Tenant Klinik
          </h2>

          <p className="text-base text-slate-600 font-medium leading-relaxed">
            Kelola rekam medis elektronik pribadi berstandar internasional, analisis tren sirkadian nocturnal dipping, konsultasi AI Spesialis Penyakit Dalam, serta sinkronisasi otomatis ke cloud MongoDB Atlas Cluster.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={onLaunchApp}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-black text-sm shadow-xl shadow-teal-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Coba Sekarang Gratis
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white border border-slate-200/90 text-slate-800 hover:bg-slate-50 font-bold text-sm shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4 text-teal-600" />
              Masuk Akun SaaS
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="p-3 rounded-2xl bg-teal-500 text-white w-fit shadow-md shadow-teal-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">HL7 FHIR R4 Standards</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Interoperabilitas medis internasional untuk Patient, Observation (LOINC 85354-9), dan MedicationStatement.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="p-3 rounded-2xl bg-sky-500 text-white w-fit shadow-md shadow-sky-500/20">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">NVIDIA NIM AI CDSS</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Model LLM <code>z-ai/glm-5.2</code> untuk konsultasi medis streaming, rekomendasi terapi CCB + ARB, dan evaluasi asam urat.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="p-3 rounded-2xl bg-emerald-500 text-white w-fit shadow-md shadow-emerald-500/20">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900">MongoDB Atlas Cluster</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Koneksi langsung klaster MongoDB Atlas (Public: <code>wfokmvwy</code>) untuk backup data rekam medis cloud real-time.
            </p>
          </div>
        </div>

        {/* SaaS Pricing Table */}
        <div className="space-y-8 text-center pt-4">
          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
              Pilihan Paket Langganan AortaLink SaaS
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Transparan, tanpa biaya tersembunyi. Dapatkan akses penuh ke AI CDSS &amp; Cloud Sync.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            
            {/* Free Trial Tier */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="p-2.5 rounded-2xl bg-slate-100 text-slate-800 w-fit">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-black text-slate-900">Uji Coba Gratis</h4>
                <div className="text-2xl font-black text-slate-900">
                  Rp 0 <span className="text-xs text-slate-400 font-normal">/ selamanya</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Hingga 30 Catatan Tensi</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Format JSON v1.1 / v2.0 Impor</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Laporan Grafik PDF Sederhana</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onLaunchApp}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition-all"
              >
                Mulai Uji Coba Gratis
              </button>
            </div>

            {/* Pro EHR Tier (Popular) */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-teal-500/5 to-white border-2 border-teal-500 shadow-xl space-y-4 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-teal-500 text-white text-[10px] font-black uppercase tracking-wider">
                Paling Populer
              </div>

              <div className="space-y-3">
                <div className="p-2.5 rounded-2xl bg-teal-500 text-white w-fit shadow-md shadow-teal-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-black text-slate-900">Pro EHR Personal</h4>
                <div className="text-2xl font-black text-slate-900">
                  Rp 49.000 <span className="text-xs text-slate-500 font-normal">/ bulan</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Unlimited Vital Signs &amp; Lab Results</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Konsultasi AI NVIDIA NIM (z-ai/glm-5.2)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>MongoDB Atlas Live Cluster Sync</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Aplikasi Mobile Flutter Cross-Platform</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 text-white font-extrabold text-xs shadow-md shadow-teal-500/20 hover:from-teal-600 hover:to-sky-600 transition-all"
              >
                Langganan Pro EHR Sekarang
              </button>
            </div>

            {/* Clinic Multi-Tenant Tier */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="p-2.5 rounded-2xl bg-sky-500 text-white w-fit shadow-md shadow-sky-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-black text-slate-900">Klinik Multi-Tenant</h4>
                <div className="text-2xl font-black text-slate-900">
                  Rp 299.000 <span className="text-xs text-slate-400 font-normal">/ bulan</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600 font-medium pt-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Multi-Profil Pasien &amp; Dokter Sp.PD</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>SMART on FHIR Hospital Integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Dedicated MongoDB Cluster Replica</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-all"
              >
                Daftar Tenant Klinik
              </button>
            </div>

          </div>
        </div>

        {/* Mobile App Section */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-teal-500/10 via-sky-500/10 to-transparent border border-teal-500/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-3xl bg-teal-500 text-white shadow-lg shadow-teal-500/20 shrink-0">
              <Smartphone className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">Aplikasi Mobile Flutter Cross-Platform</h3>
              <p className="text-xs text-slate-600 font-medium">
                Nikmati akses rekam medis kapan saja di iOS &amp; Android dengan sinkronisasi MongoDB Atlas Cluster real-time.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLaunchApp}
            className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-xs shadow-md shrink-0 flex items-center gap-2 hover:bg-slate-800 transition-all"
          >
            Buka Dashboard EHR SaaS
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p className="font-extrabold text-slate-800">AortaLink SaaS Platform — Powered by NVIDIA NIM AI &amp; MongoDB Atlas</p>
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
