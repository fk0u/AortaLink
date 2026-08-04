/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · Google OAuth Verification Compliant Terms of Service */
import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Heart, ArrowLeft, ShieldAlert, Layers, CheckCircle2 } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

export const TermsOfServicePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-500 selection:text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center text-white shadow-sm">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <span className="font-black text-sm text-slate-900 tracking-tight">AortaLink EHR</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 space-y-8">
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 border-b border-slate-200 pb-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-extrabold">
            <FileText className="w-3.5 h-3.5 text-sky-600" />
            <span>Syarat &amp; Ketentuan Penggunaan Platform</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Syarat &amp; Ketentuan (Terms of Service)
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Terakhir Diperbarui: 4 Agustus 2026 • Kompatibel dengan HL7 FHIR R4 Standards &amp; Google Auth
          </p>
        </motion.div>

        <div className="space-y-6 text-xs text-slate-700 leading-relaxed font-medium">
          
          <section className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              1. Penerimaan Ketentuan
            </h2>
            <p>
              Dengan mendaftar, mengakses, atau menggunakan layanan AortaLink EHR SaaS Platform, Anda menyatakan menyetujui dan terikat oleh Syarat &amp; Ketentuan ini. Jika Anda tidak menyetujui bagian mana pun dari ketentuan ini, Anda tidak diperkenankan menggunakan layanan kami.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              2. Sanggahan Medis (Medical Disclaimer)
            </h2>
            <p>
              Platform AortaLink dan fitur AI Clinical Decision Support System (CDSS) dirancang sebagai alat bantu pencatatan mandiri dan edukasi kesehatan.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>AortaLink <strong>BUKAN</strong> pengganti konsultasi, diagnosis, atau perawatan dari dokter profesional medis berlisensi.</li>
              <li>Jangan pernah mengabaikan atau menunda meminta nasihat medis profesional karena informasi yang Anda baca di aplikasi ini.</li>
              <li>Dalam situasi darurat medis, segera hubungi nomor darurat atau IGD rumah sakit terdekat.</li>
            </ul>
          </section>

          <section className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              3. Hak Kekayaan Intelektual &amp; Interoperabilitas FHIR R4
            </h2>
            <p>
              Seluruh hak cipta, merek dagang, dan kode sumber AortaLink adalah milik pengembang platform. Data rekam medis pasien sepenuhnya adalah milik pengguna dan dapat diekspor secara bebas menggunakan standar HL7 FHIR R4 dan format JSON terbuka.
            </p>
          </section>

          <section className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              4. Akun Pengguna &amp; Pembatalan Layanan
            </h2>
            <p>
              Anda bertanggung jawab untuk menjaga kerahasiaan kata sandi dan akun Google Anda. AortaLink berhak menangguhkan akun yang melanggar hukum atau menyalahgunakan sistem API cloud.
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p className="font-extrabold text-slate-800">© 2026 AortaLink EHR SaaS Platform • All Rights Reserved</p>
      </footer>
    </div>
  );
};
