import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useProfiles } from '../../hooks/useProfiles';
import { useReadings } from '../../hooks/useReadings';
import { useAppStore } from '../../store/useAppStore';
import { getRelationshipLabel } from '../../utils/formatters';
import { playClickSound } from '../../utils/audio-fx';
import { ArrowLeft, HeartPulse, Settings, SquarePen, Target, Users, Shield } from '../icons/AppIcons';
import { GUIDELINE_REGISTRY } from '../../utils/bp-classifier';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { profiles, activeProfile, switchProfile } = useProfiles();
  const { stats } = useReadings();
  const openProfileModal = useAppStore((state) => state.openProfileModal);
  const openScreeningModal = useAppStore((state) => state.openScreeningModal);

  const activeTarget = activeProfile ? `${activeProfile.targetSystolic}/${activeProfile.targetDiastolic} mmHg` : '-';

  const getProfileInitial = (name?: string) => {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <section className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              navigate({ to: '/dashboard' });
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <ArrowLeft size={16} />
            Kembali ke Ringkasan
          </button>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 inline-flex items-center gap-1">
              <Users size={12} /> Profil Pasien
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">
              Halaman Profil Pasien
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Kelola profil aktif, target tensi, skrining kesehatan FHIR, dan perpindahan antar anggota keluarga dari satu tempat.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              openScreeningModal();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-extrabold text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
          >
            <Shield size={16} />
            Skrining Kesehatan FHIR
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              openProfileModal();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 text-white font-extrabold text-xs shadow-lg shadow-teal-500/20 active:scale-95 transition-all"
          >
            <SquarePen size={16} />
            Kelola Profil
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              navigate({ to: '/settings' });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10 font-extrabold text-xs text-slate-700 dark:text-slate-200 shadow-sm active:scale-95 transition-all"
          >
            <Settings size={16} />
            Pengaturan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
        <article className="m3-surface-card p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-500 to-sky-500 text-white flex items-center justify-center font-black text-xl shadow-xl shadow-teal-500/25 shrink-0">
                {getProfileInitial(activeProfile?.name)}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black">Profil Aktif</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 truncate">
                  {activeProfile?.name || 'Belum ada profil'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {activeProfile ? getRelationshipLabel(activeProfile.relationship) : 'Profil default akan dibuat otomatis'}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 shrink-0">
              Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl p-4 bg-white/80 dark:bg-[#1c1c1e]/70 border border-slate-200/80 dark:border-white/10">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Target Tensi</p>
              <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                <Target size={16} className="text-teal-500" />
                {activeTarget}
              </p>
            </div>
            <div className="rounded-2xl p-4 bg-white/80 dark:bg-[#1c1c1e]/70 border border-slate-200/80 dark:border-white/10">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Catatan</p>
              <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
                <HeartPulse size={16} className="text-rose-500" />
                {stats.totalReadings}
              </p>
            </div>
            <div className="rounded-2xl p-4 bg-white/80 dark:bg-[#1c1c1e]/70 border border-slate-200/80 dark:border-white/10">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kepatuhan Target</p>
              <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                {stats.targetComplianceRate}%
              </p>
            </div>
            <div className="rounded-2xl p-4 bg-white/80 dark:bg-[#1c1c1e]/70 border border-slate-200/80 dark:border-white/10 sm:col-span-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Acuan Guideline Hipertensi</p>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100 mt-1">
                {GUIDELINE_REGISTRY[activeProfile?.guidelinePreference || 'esh_perhi'].name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {GUIDELINE_REGISTRY[activeProfile?.guidelinePreference || 'esh_perhi'].description}
              </p>
            </div>

            {/* Step 03: Anthropometry & Screening Summary Card */}
            <div className="rounded-2xl p-4 bg-gradient-to-br from-rose-50/70 to-amber-50/70 dark:from-rose-950/30 dark:to-amber-950/30 border border-rose-200/80 dark:border-rose-900/40 sm:col-span-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <Shield size={12} />
                  Skrining Antropometri &amp; Risiko Aorta (FHIR R4)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    openScreeningModal();
                  }}
                  className="text-[10px] font-bold text-rose-700 dark:text-rose-400 hover:underline"
                >
                  {activeProfile?.screeningCompletedAt ? 'Ubah Data' : 'Mulai Skrining'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Tinggi &amp; Berat</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">
                    {activeProfile?.heightCm ? `${activeProfile.heightCm} cm` : '–'} • {activeProfile?.weightKg ? `${activeProfile.weightKg} kg` : '–'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">BMI (Asia-Pasifik)</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">
                    {activeProfile?.bmi ? `${activeProfile.bmi} kg/m²` : '–'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Status Merokok</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">
                    {activeProfile?.smokingStatus === 'never'
                      ? 'Bukan Perokok'
                      : activeProfile?.smokingStatus === 'former'
                      ? 'Mantan Perokok'
                      : activeProfile?.smokingStatus === 'current'
                      ? 'Perokok Aktif'
                      : '–'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Status Skrining</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">
                    {activeProfile?.screeningCompletedAt ? 'Lengkap' : 'Belum Lengkap'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfile?.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => {
                    playClickSound();
                    switchProfile(profile.id);
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl border text-sm font-bold transition-all active:scale-95 ${
                    isActive
                      ? 'bg-teal-500 text-white border-teal-500 shadow-md shadow-teal-500/20'
                      : 'bg-white dark:bg-[#1c1c1e] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 text-[10px] flex items-center justify-center font-black">
                    {getProfileInitial(profile.name)}
                  </span>
                  {profile.name}
                </button>
              );
            })}
          </div>
        </article>

        <aside className="space-y-4">
          <div className="m3-surface-card p-5 space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Ringkasan Profil
            </h4>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between gap-3">
                <span>Total profil</span>
                <strong>{profiles.length}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Profil aktif</span>
                <strong>{activeProfile?.name || '-'}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Target aktif</span>
                <strong>{activeTarget}</strong>
              </div>
            </div>
          </div>

          <div className="m3-surface-card p-5 space-y-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <h4 className="text-sm font-black text-white">Aksi Cepat</h4>
            <p className="text-sm text-slate-300">
              Tambah atau edit detail profil tanpa perlu kembali ke modal utama.
            </p>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                openProfileModal();
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-slate-900 font-extrabold text-sm active:scale-95 transition-all"
            >
              <SquarePen size={16} />
              Buka Editor Profil
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
};
