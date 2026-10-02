import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import { db } from '../../db';
import { Profile, RelationshipType, GuidelineId } from '../../types/blood-pressure';
import { GUIDELINE_REGISTRY } from '../../utils/bp-classifier';
import { getRelationshipLabel } from '../../utils/formatters';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Edit3, Trash2, User, Users, Heart, Shield, Activity, Sparkles } from '../icons/AppIcons';
import { ConfirmModal } from '../common/ConfirmModal';
import { mongoDbAtlasService } from '../../services/db/mongodb-service';

export const ProfileModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.isProfileModalOpen);
  const closeModal = useAppStore((state) => state.closeProfileModal);
  const addToast = useAppStore((state) => state.addToast);
  const { profiles, activeProfile, switchProfile } = useProfiles();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<RelationshipType>('self');
  const [avatar, setAvatar] = useState('user');
  const [age, setAge] = useState<number | ''>(45);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [targetSystolic, setTargetSystolic] = useState(120);
  const [targetDiastolic, setTargetDiastolic] = useState(80);
  const [guidelinePreference, setGuidelinePreference] = useState<GuidelineId>('esh_perhi');
  const [notes, setNotes] = useState('');

  // Delete confirm state
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  const iconOptions = [
    { id: 'user', label: 'Utama', icon: User },
    { id: 'heart', label: 'Jantung', icon: Heart },
    { id: 'users', label: 'Keluarga', icon: Users },
    { id: 'shield', label: 'Proteksi', icon: Shield },
    { id: 'activity', label: 'Vital', icon: Activity },
    { id: 'sparkles', label: 'EHR', icon: Sparkles },
  ];

  const getProfileInitial = (pName?: string) => {
    if (!pName) return 'P';
    const parts = pName.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return pName.slice(0, 2).toUpperCase();
  };

  const resetForm = () => {
    setName('');
    setRelationship('self');
    setAvatar('user');
    setAge(45);
    setGender('male');
    setTargetSystolic(120);
    setTargetDiastolic(80);
    setGuidelinePreference('esh_perhi');
    setNotes('');
    setEditingProfile(null);
    setIsAddingNew(false);
  };

  const handleStartEdit = (profile: Profile) => {
    playClickSound();
    setEditingProfile(profile);
    setName(profile.name);
    setRelationship(profile.relationship);
    setAvatar(profile.avatar || 'user');
    setAge(profile.age ?? 45);
    setGender(profile.gender || 'male');
    setTargetSystolic(profile.targetSystolic);
    setTargetDiastolic(profile.targetDiastolic);
    setGuidelinePreference(profile.guidelinePreference || 'esh_perhi');
    setNotes(profile.notes || '');
    setIsAddingNew(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast({ type: 'warning', title: 'Data Kurang', message: 'Nama profil harus diisi.' });
      return;
    }

    try {
      if (editingProfile) {
        await db.profiles.update(editingProfile.id, {
          name,
          relationship,
          avatar,
          age: age === '' ? undefined : Number(age),
          gender,
          targetSystolic,
          targetDiastolic,
          guidelinePreference,
          notes
        });
        playSuccessChime();
        addToast({ type: 'success', title: 'Profil Diperbarui', message: `Profil ${name} telah diperbarui.` });
      } else {
        const newId = `profile-${Date.now()}`;
        await db.profiles.add({
          id: newId,
          name,
          relationship,
          avatar,
          age: age === '' ? undefined : Number(age),
          gender,
          targetSystolic,
          targetDiastolic,
          guidelinePreference,
          notes,
          createdAt: new Date().toISOString()
        });
        playSuccessChime();
        switchProfile(newId);
        addToast({ type: 'success', title: 'Profil Baru Ditambahkan', message: `Profil ${name} telah dibuat & diaktifkan.` });
      }

      // Sync changes to MongoDB Atlas Cloud in background
      mongoDbAtlasService.pushUserData().catch(() => {});

      resetForm();
    } catch (error) {
      addToast({ type: 'error', title: 'Gagal Menyimpan', message: 'Terjadi kesalahan saat menyimpan profil.' });
    }
  };

  const handleDeleteProfile = async () => {
    if (!deletingProfileId) return;
    try {
      if (profiles.length <= 1) {
        addToast({ type: 'warning', title: 'Tidak Bisa Dihapus', message: 'Minimal harus ada 1 profil tersisa.' });
        setDeletingProfileId(null);
        return;
      }

      const idToDelete = deletingProfileId;

      // 1. Delete from local Dexie (Cascade all tables)
      await Promise.all([
        db.profiles.delete(idToDelete),
        db.readings.where('profileId').equals(idToDelete).delete(),
        db.medications.where('profileId').equals(idToDelete).delete(),
        db.medicationLogs.where('profileId').equals(idToDelete).delete(),
        db.labResults.where('profileId').equals(idToDelete).delete(),
        db.habits.where('profileId').equals(idToDelete).delete(),
        db.sodiumLogs.where('profileId').equals(idToDelete).delete(),
        db.sleepLogs.where('profileId').equals(idToDelete).delete(),
        db.reminders.where('profileId').equals(idToDelete).delete(),
        db.fhirPatients.delete(idToDelete),
        db.fhirObservations.where('profileId').equals(idToDelete).delete(),
        db.fhirMedicationRequests.where('profileId').equals(idToDelete).delete(),
        db.fhirMedicationStatements.where('profileId').equals(idToDelete).delete(),
        db.ascvdProfiles.where('profileId').equals(idToDelete).delete(),
        db.clinicalNotes.where('profileId').equals(idToDelete).delete()
      ]);

      // 2. Delete from MongoDB Atlas Cloud
      await mongoDbAtlasService.deleteProfileCloud(idToDelete);

      // 3. Switch to remaining active profile
      if (activeProfile?.id === idToDelete) {
        const remaining = profiles.filter((p) => p.id !== idToDelete);
        if (remaining.length > 0) switchProfile(remaining[0].id);
      }

      // 4. Update cloud user settings
      mongoDbAtlasService.pushUserData().catch(() => {});

      playSuccessChime();
      addToast({ type: 'success', title: 'Profil Dihapus', message: 'Profil dan seluruh riwayatnya berhasil dihapus permanen.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Gagal Hapus', message: 'Tidak dapat menghapus profil.' });
    } finally {
      setDeletingProfileId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-[#1c1c1e] rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden my-auto max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                <User size={20} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Kelola Profil Pasien
              </h3>
            </div>
            <button
              onClick={() => {
                playClickSound();
                resetForm();
                closeModal();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            
            {/* View / Edit Mode Selector */}
            {!isAddingNew ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Daftar Profil Terdaftar ({profiles.length})
                  </span>
                  <button
                    onClick={() => {
                      playClickSound();
                      resetForm();
                      setIsAddingNew(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    <UserPlus size={14} />
                    Tambah Profil
                  </button>
                </div>

                {/* Profiles Cards List */}
                <div className="space-y-2">
                  {profiles.map((p) => {
                    const isActive = p.id === activeProfile?.id;
                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                          isActive
                            ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-500/40 shadow-sm'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div
                          onClick={() => {
                            playClickSound();
                            switchProfile(p.id);
                          }}
                          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                        >
                          <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                            {getProfileInitial(p.name)}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                                {p.name}
                              </h4>
                              {isActive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500 text-white">
                                  Aktif
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {getRelationshipLabel(p.relationship)} • Usia: {p.age || '-'} • Target: &lt;{p.targetSystolic}/{p.targetDiastolic} mmHg
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleStartEdit(p)}
                            className="p-2 rounded-xl text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-all active:scale-90"
                            title="Edit Profil"
                          >
                            <Edit3 size={16} />
                          </button>
                          {profiles.length > 1 && (
                            <button
                              onClick={() => {
                                playClickSound();
                                setDeletingProfileId(p.id);
                              }}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all active:scale-90"
                              title="Hapus Profil"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Add / Edit Profile Form */
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {editingProfile ? `Edit Profil: ${editingProfile.name}` : 'Tambah Profil Anggota Keluarga'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      resetForm();
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Batal
                  </button>
                </div>

                {/* Avatar Icon Options */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">
                    Pilih Simbol Profil
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {iconOptions.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setAvatar(item.id);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-90 shrink-0 ${
                            avatar === item.id
                              ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
                              : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                    Nama Lengkap / Panggilan
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Ibu Maryam / Ayah Hendra"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                {/* Relationship & Age */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                      Hubungan Keluarga
                    </label>
                    <select
                      value={relationship}
                      onChange={(e) => {
                        playClickSound();
                        setRelationship(e.target.value as any);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="self">Saya Sendiri</option>
                      <option value="parent">Orang Tua (Ibu / Ayah)</option>
                      <option value="spouse">Pasangan (Suami / Istri)</option>
                      <option value="child">Anak</option>
                      <option value="other">Keluarga Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                      Usia (Tahun)
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Contoh: 65"
                      min={1}
                      max={120}
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Target Blood Pressure */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200/80 dark:border-white/10">
                  <div>
                    <label className="text-[11px] font-bold text-sky-600 dark:text-sky-400 block mb-1">
                      Target Sistolik (&lt; mmHg)
                    </label>
                    <input
                      type="number"
                      value={targetSystolic}
                      onChange={(e) => setTargetSystolic(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 font-bold text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-teal-600 dark:text-teal-400 block mb-1">
                      Target Diastolik (&lt; mmHg)
                    </label>
                    <input
                      type="number"
                      value={targetDiastolic}
                      onChange={(e) => setTargetDiastolic(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 font-bold text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* Clinical Guideline Preference */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                    Acuan Guideline Hipertensi
                  </label>
                  <select
                    value={guidelinePreference}
                    onChange={(e) => setGuidelinePreference(e.target.value as GuidelineId)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="esh_perhi">ESH 2023 / PERHI 2021 (Default Indonesia — ≥140/90 mmHg)</option>
                    <option value="acc_aha_2025">ACC / AHA 2025 (Stage 1 ≥130/80 mmHg, PREVENT)</option>
                    <option value="esc_2024">ESC 2024 (Elevated 120–139/70–89, Hipertensi ≥140/90 mmHg)</option>
                  </select>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1 leading-normal">
                    {GUIDELINE_REGISTRY[guidelinePreference].description}
                  </span>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                    Catatan Medis Profil (Opsional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Memiliki riwayat alergi obat tertentu, rutin minum Amlodipine..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      resetForm();
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-[0.98]"
                  >
                    Simpan Profil
                  </button>
                </div>
              </form>
            )}

          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingProfileId)}
        title="Hapus Profil Pengguna?"
        message="Apakah Anda yakin ingin menghapus profil ini beserta seluruh data riwayat tekanan darahnya? Aksi ini tidak dapat dibatalkan."
        isDangerous={true}
        confirmText="Ya, Hapus Permanen"
        onConfirm={handleDeleteProfile}
        onCancel={() => setDeletingProfileId(null)}
      />
    </AnimatePresence>
  );
};
