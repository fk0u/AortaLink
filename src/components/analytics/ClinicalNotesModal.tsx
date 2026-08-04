import React, { useState } from 'react';
import { db } from '../../db';
import { ClinicalNote } from '../../types/blood-pressure';
import { useProfiles } from '../../hooks/useProfiles';
import { useAppStore } from '../../store/useAppStore';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Save, Plus, Tag, Clock, Stethoscope, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface ClinicalNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NOTE_TAGS = ['Rutin', 'Follow-up', 'Darurat', 'Evaluasi Obat', 'Lab Review', 'Rujukan'];

export const ClinicalNotesModal: React.FC<ClinicalNotesModalProps> = ({ isOpen, onClose }) => {
  const { activeProfile } = useProfiles();
  const addToast = useAppStore((state) => state.addToast);

  const [showForm, setShowForm] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const notes = useLiveQuery(
    async () => {
      if (!activeProfile?.id) return [];
      return await db.clinicalNotes
        .where('profileId')
        .equals(activeProfile.id)
        .reverse()
        .sortBy('timestamp');
    },
    [activeProfile?.id]
  );

  const toggleTag = (tag: string) => {
    playClickSound();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const resetForm = () => {
    setDoctorName('');
    setChiefComplaint('');
    setAssessment('');
    setPlan('');
    setSelectedTags([]);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!activeProfile || !chiefComplaint.trim()) {
      addToast({ type: 'warning', title: 'Keluhan Kosong', message: 'Keluhan utama wajib diisi.' });
      return;
    }

    playClickSound();
    setIsSaving(true);
    try {
      const note: Omit<ClinicalNote, 'id'> = {
        profileId: activeProfile.id,
        timestamp: new Date().toISOString(),
        doctorName: doctorName.trim() || undefined,
        chiefComplaint: chiefComplaint.trim(),
        assessment: assessment.trim(),
        plan: plan.trim(),
        tags: selectedTags,
        linkedReadingIds: []
      };
      await db.clinicalNotes.add(note as ClinicalNote);
      playSuccessChime();
      addToast({ type: 'success', title: 'Catatan Disimpan', message: 'Catatan klinis berhasil ditambahkan.' });
      resetForm();
    } catch (err) {
      addToast({ type: 'error', title: 'Gagal', message: 'Terjadi kesalahan saat menyimpan catatan.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await db.clinicalNotes.delete(id);
      addToast({ type: 'success', title: 'Dihapus', message: 'Catatan klinis berhasil dihapus.' });
    } catch {
      addToast({ type: 'error', title: 'Gagal', message: 'Tidak dapat menghapus catatan.' });
    } finally {
      setDeletingId(null);
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
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/20">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Jurnal Catatan Klinis
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Catatan SOAP dokter dengan timestamp
                </p>
              </div>
            </div>
            <button onClick={() => { playClickSound(); onClose(); }} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1 space-y-4">

            {/* New Note Form Toggle */}
            {!showForm ? (
              <button
                onClick={() => { playClickSound(); setShowForm(true); }}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 font-extrabold text-xs hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Tambah Catatan Klinis Baru
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/60"
              >
                {/* Doctor Name */}
                <label className="space-y-1 block">
                  <span className="text-[10px] font-bold text-slate-500">Nama Dokter (opsional)</span>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="Dr. ..."
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </label>

                {/* Chief Complaint (S) */}
                <label className="space-y-1 block">
                  <span className="text-[10px] font-bold text-slate-500">Keluhan Utama (Subjektif) *</span>
                  <textarea
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="Contoh: Sakit kepala bagian belakang sejak 2 hari..."
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </label>

                {/* Assessment (A) */}
                <label className="space-y-1 block">
                  <span className="text-[10px] font-bold text-slate-500">Penilaian / Diagnosis (Assessment)</span>
                  <textarea
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    placeholder="Contoh: Hipertensi Stage 2 tidak terkontrol..."
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </label>

                {/* Plan (P) */}
                <label className="space-y-1 block">
                  <span className="text-[10px] font-bold text-slate-500">Rencana Terapi (Plan)</span>
                  <textarea
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    placeholder="Contoh: Naikan dosis Candesartan menjadi 16mg malam hari..."
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </label>

                {/* Tags */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Tag className="w-3 h-3" /> Kategori</span>
                  <div className="flex flex-wrap gap-1.5">
                    {NOTE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border
                          ${selectedTags.includes(tag)
                            ? 'bg-violet-500 text-white border-violet-500'
                            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save / Cancel */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !chiefComplaint.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-xs shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? 'Menyimpan...' : 'Simpan Catatan'}
                  </button>
                  <button
                    onClick={() => { playClickSound(); resetForm(); }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </motion.div>
            )}

            {/* Existing Notes List */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Riwayat Catatan ({notes?.length || 0})
              </h5>

              {!notes || notes.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">Belum ada catatan klinis.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(note.timestamp), 'd MMM yyyy, HH:mm', { locale: idLocale })}
                            {note.doctorName && (
                              <span className="font-bold text-violet-500"> · {note.doctorName}</span>
                            )}
                          </div>
                          <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 line-clamp-2">
                            {note.chiefComplaint}
                          </p>
                        </div>
                        <button
                          onClick={() => setDeletingId(note.id!)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {note.assessment && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          <strong>Assessment:</strong> {note.assessment}
                        </p>
                      )}
                      {note.plan && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          <strong>Plan:</strong> {note.plan}
                        </p>
                      )}

                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {note.tags.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 rounded text-[9px] font-bold bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Delete confirmation */}
                      {deletingId === note.id && (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex-1">Hapus catatan ini?</span>
                          <button onClick={() => handleDelete(note.id!)} className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-bold">Ya</button>
                          <button onClick={() => setDeletingId(null)} className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">Batal</button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
