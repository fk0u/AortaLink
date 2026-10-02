import React, { useState } from 'react';
import { useResearchStore } from '../../store/useResearchStore';
import { FlaskConical, ShieldCheck, AlertCircle, X, Download } from '../icons/AppIcons';
import { ALGORITHM_VERSIONS } from '../../services/config/release-mode';
import { exportPseudonymizedCSV, exportPseudonymizedFHIRBundle } from '../../services/research/pseudonymized-exporter';
import { db } from '../../db';

export const ResearchConsentModal: React.FC = () => {
  const {
    isConsentModalOpen,
    closeConsentModal,
    isActive,
    studyId,
    consentRecord,
    activate,
    withdraw
  } = useResearchStore();

  const [inputStudyId, setInputStudyId] = useState('');
  const [participantPseudonym, setParticipantPseudonym] = useState('');
  const [institution, setInstitution] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isConsentModalOpen) return null;

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!inputStudyId.trim()) {
      setErrorMsg('Harap masukkan Study ID / Kode Protokol Penelitian.');
      return;
    }
    if (!agreed) {
      setErrorMsg('Anda harus membaca dan menyetujui Lembar Persetujuan (Informed Consent).');
      return;
    }

    const res = activate({
      studyId: inputStudyId.trim().toUpperCase(),
      consentVersion: '1.0.0',
      participantPseudonym: participantPseudonym.trim() || undefined,
      piOrInstitution: institution.trim() || undefined
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Gagal mengaktifkan mode riset.');
    } else {
      closeConsentModal();
    }
  };

  const handleExportCSV = async () => {
    const allReadings = await db.readings.toArray();
    const csv = exportPseudonymizedCSV(allReadings);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aortalink-research-${studyId || 'study'}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportFHIR = async () => {
    const allReadings = await db.readings.toArray();
    const allProfiles = await db.profiles.toArray();
    const activeProf = allProfiles[0];
    const bundle = exportPseudonymizedFHIRBundle(allReadings, activeProf);
    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: 'application/fhir+json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aortalink-research-bundle-${studyId || 'study'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FlaskConical size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Pengaturan Mode Riset & Akademik (SaMD)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pintu masuk fitur penelitian klinis untuk jurnal, tesis, atau skripsi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeConsentModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-600 dark:text-slate-300">
          {isActive ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
                  <ShieldCheck size={18} />
                  <span>Mode Riset Saat Ini Aktif</span>
                </div>
                <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300 font-mono">
                  <p>Study ID: <strong className="text-slate-900 dark:text-white">{studyId}</strong></p>
                  <p>Partisipan Pseudonim: <strong className="text-slate-900 dark:text-white">{consentRecord?.participantPseudonym}</strong></p>
                  <p>Versi Consent: {consentRecord?.consentVersion} ({new Date(consentRecord?.consentedAt || '').toLocaleDateString('id-ID')})</p>
                  <p>Institusi / Peneliti: {consentRecord?.piOrInstitution}</p>
                </div>
              </div>

              {/* Version manifest info */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1 font-mono">
                <p className="font-bold text-slate-700 dark:text-slate-300">Manifest Algoritma Paper:</p>
                <p>Engine Version: {ALGORITHM_VERSIONS.engineVersion}</p>
                <p>Guideline: {ALGORITHM_VERSIONS.guideline}</p>
                <p>Health Score Standard: {ALGORITHM_VERSIONS.le8Version}</p>
              </div>

              {/* Dataset export */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Ekspor Dataset Ter-pseudonimisasi (PII-Free)
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <Download size={14} />
                    <span>Unduh CSV Riset Ter-pseudonimisasi</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportFHIR}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Download size={14} />
                    <span>Unduh FHIR R4 Bundle Ter-pseudonimisasi</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Tarik persetujuan dan kembali ke Mode Publik?')) {
                      withdraw();
                      closeConsentModal();
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors"
                >
                  Tarik Persetujuan Partisipan (Withdraw)
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleActivate} className="space-y-5">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 leading-relaxed">
                  Secara default, AortaLink dirilis sebagai aplikasi non-alkes publik. Mode Riset/Akademik membuka fitur SaMD (analisis ML lokal, klasifikasi guideline klinis, dan scoring LE8) untuk keperluan studi etik penelitian yang disetujui KEPK.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Study ID / Kode Protokol Penelitian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: AORTA-UGM-2026 atau KEPK-FK-001"
                    value={inputStudyId}
                    onChange={(e) => setInputStudyId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pseudonim Partisipan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Default: auto-generate PT-XXXXXXXX"
                      value={participantPseudonym}
                      onChange={(e) => setParticipantPseudonym(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Institusi / Principal Investigator (PI)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Lab Kardiologi FK UI"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Informed Consent Text Box */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Lembar Penjelasan & Informed Consent (Versi 1.0.0)
                </label>
                <div className="h-32 overflow-y-auto p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 space-y-2">
                  <p className="font-bold text-slate-800 dark:text-slate-200">1. Tujuan Penelitian:</p>
                  <p>Aplikasi ini digunakan sebagai instrumen pencatatan dan evaluasi algoritma pemantauan tekanan darah untuk keperluan riset ilmiah. Algoritma ini bersifat eksperimental dan bukan dasar pengambilan tindakan medis darurat.</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">2. Kerahasiaan Data & Pseudonimisai:</p>
                  <p>Semua ekspor data riset dianonimkan (pseudonim). Nama, kontak telepon, email, dan alamat tidak disertakan dalam dataset riset.</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">3. Hak Penarikan Diri (Withdrawal):</p>
                  <p>Partisipan berhak menarik persetujuan kapan saja tanpa sanksi apa pun melalui tombol 'Tarik Persetujuan' di aplikasi ini.</p>
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>
                  Saya telah membaca dan menyetujui Lembar Persetujuan Partisipan Riset (Informed Consent) dan mengonfirmasi bahwa penggunaan ini dilakukan dalam kerangka penelitian/akademik.
                </span>
              </label>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeConsentModal}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!agreed}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition-colors shadow-sm"
                >
                  Konfirmasi & Aktifkan Mode Riset
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
