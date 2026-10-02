import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import { db, newSyncId } from '../../db';
import { useFocusTrap } from '../../utils/modal-a11y';
import { BodyPosition, ArmUsed, MeasurementContext, BPReading } from '../../types/blood-pressure';
import { classifyBP, classifyAgeAdjustedBP } from '../../utils/bp-classifier';
import { playClickSound, playSuccessChime, playAlertSound } from '../../utils/audio-fx';
import { normalizeClinicalText } from '../../security/sanitizer';
import { getLocalDateTimeForInput, parseLocalDateTimeInput } from '../../utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus, 
  Minus, 
  Heart, 
  Calendar, 
  Clock, 
  Tag, 
  MessageSquare, 
  Check, 
  Mic, 
  MicOff, 
  Sparkles, 
  Activity,
  Calculator,
  ShieldCheck,
  AlertTriangle
} from '../icons/AppIcons';

export const ReadingFormModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.isReadingModalOpen);
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);
  const closeModal = useAppStore((state) => state.closeReadingModal);
  const editingReading = useAppStore((state) => state.editingReading);
  const addToast = useAppStore((state) => state.addToast);
  const { activeProfileId, activeProfile } = useProfiles();

  // Form inputs state
  const [systolic, setSystolic] = useState<number>(120);
  const [diastolic, setDiastolic] = useState<number>(80);
  const [pulse, setPulse] = useState<number>(72);
  const [timestamp, setTimestamp] = useState<string>(() => getLocalDateTimeForInput());
  const [position, setPosition] = useState<BodyPosition>('duduk');
  const [arm, setArm] = useState<ArmUsed>('kiri');
  const [measurementContext, setMeasurementContext] = useState<MeasurementContext>('Home');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Triple Measurement Mode (ESH / AHA Gold Standard Protocol)
  const [showTripleMode, setShowTripleMode] = useState(false);
  const [t1Sys, setT1Sys] = useState(122);
  const [t1Dia, setT1Dia] = useState(82);
  const [t2Sys, setT2Sys] = useState(119);
  const [t2Dia, setT2Dia] = useState(79);
  const [t3Sys, setT3Sys] = useState(118);
  const [t3Dia, setT3Dia] = useState(78);

  const applyTripleAverage = () => {
    playSuccessChime();
    const avgSys = Math.round((t1Sys + t2Sys + t3Sys) / 3);
    const avgDia = Math.round((t1Dia + t2Dia + t3Dia) / 3);
    setSystolic(avgSys);
    setDiastolic(avgDia);
    setShowTripleMode(false);
    addToast({
      type: 'success',
      title: 'Protokol ESH Berhasil',
      message: `Rata-rata 3x pengukuran (${avgSys}/${avgDia} mmHg) diterapkan.`
    });
  };

  // Web Speech API Voice Dictation State
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  const commonTags = ['Pagi', 'Malam', 'Sesudah Obat', 'Sebelum Obat', 'Klinik / RS', 'Stres / Kerja', 'Olahraga', 'Kopi / Kafein'];

  const contextOptions: { value: MeasurementContext; label: string }[] = [
    { value: 'Home', label: 'Rumah (Rutin)' },
    { value: 'Clinic/Hospital', label: 'Klinik / RS (White Coat)' },
    { value: 'Post-Medication', label: 'Sesudah Minum Obat' },
    { value: 'Stress', label: 'Saat Stres / Lelah' }
  ];

  // Initialize or reset form values
  useEffect(() => {
    if (editingReading) {
      setSystolic(editingReading.systolic);
      setDiastolic(editingReading.diastolic);
      setPulse(editingReading.pulse);
      setTimestamp(getLocalDateTimeForInput(editingReading.timestamp));
      setPosition(editingReading.position || 'duduk');
      setArm(editingReading.arm || 'kiri');
      setMeasurementContext(editingReading.measurement_context || 'Home');
      setSelectedTags(editingReading.tags || []);
      setNotes(editingReading.notes || '');
    } else {
      setSystolic(120);
      setDiastolic(80);
      setPulse(72);
      setTimestamp(getLocalDateTimeForInput());
      setPosition('duduk');
      setArm('kiri');
      setMeasurementContext('Home');
      setSelectedTags([]);
      setNotes('');
    }
  }, [editingReading, isOpen]);

  // Voice Dictation handler (Web Speech API)
  const toggleVoiceDictation = () => {
    playClickSound();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addToast({
        type: 'warning',
        title: 'Browser Tidak Mendukung Dikte',
        message: 'Browser Anda belum mendukung Web Speech API.'
      });
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        addToast({
          type: 'info',
          title: 'Mendengarkan...',
          message: 'Ucapkan contoh: "Tensi 130 per 85 nadi 75"'
        });
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceTranscript(text);
        
        // Parse numbers from Indonesian voice text
        const numbers = text.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
          const sys = parseInt(numbers[0], 10);
          const dia = parseInt(numbers[1], 10);
          if (sys >= 60 && sys <= 250) setSystolic(sys);
          if (dia >= 40 && dia <= 160) setDiastolic(dia);
          if (numbers.length >= 3) {
            const pul = parseInt(numbers[2], 10);
            if (pul >= 40 && pul <= 200) setPulse(pul);
          }
          playSuccessChime();
          addToast({
            type: 'success',
            title: 'Suara Berhasil Dikenali',
            message: `Tensi terdeteksi: ${sys}/${dia} mmHg`
          });
        } else {
          setNotes((prev) => (prev ? `${prev} | ${text}` : text));
          addToast({
            type: 'info',
            title: 'Dikte Ditambahkan ke Catatan',
            message: `"${text}"`
          });
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    playClickSound();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfileId) {
      addToast({ type: 'error', title: 'Profil Belum Dipilih', message: 'Silakan pilih profil pasien terlebih dahulu.' });
      return;
    }

    if (systolic < 60 || systolic > 260 || diastolic < 40 || diastolic > 180) {
      playAlertSound();
      addToast({ type: 'error', title: 'Nilai Tidak Valid', message: 'Periksa kembali nilai sistolik & diastolik Anda.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const sanitized = normalizeClinicalText(notes);

      const finalIsoTimestamp = parseLocalDateTimeInput(timestamp);

      if (editingReading && editingReading.id) {
        await db.readings.update(editingReading.id, {
          systolic,
          diastolic,
          pulse,
          timestamp: finalIsoTimestamp,
          position,
          arm,
          measurement_context: measurementContext,
          tags: selectedTags,
          notes: sanitized
        });
        playSuccessChime();
        addToast({ type: 'success', title: 'Catatan Diperbarui', message: `Data ${systolic}/${diastolic} mmHg tersimpan.` });
      } else {
        await db.readings.add({
          id: newSyncId(),
          profileId: activeProfileId,
          systolic,
          diastolic,
          pulse,
          timestamp: finalIsoTimestamp,
          position,
          arm,
          measurement_context: measurementContext,
          tags: selectedTags,
          notes: sanitized
        });
        playSuccessChime();
        addToast({ type: 'success', title: 'Catatan Tersimpan', message: `Data tensi ${systolic}/${diastolic} mmHg berhasil dicatat.` });
      }

      closeModal();
    } catch (err) {
      addToast({ type: 'error', title: 'Gagal Menyimpan', message: 'Terjadi kesalahan sistem saat menyimpan ke database.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCategory = classifyBP(
    systolic,
    diastolic,
    activeProfile?.guidelinePreference,
    { isHomeMeasurement: measurementContext === 'Home' }
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
          
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Material 3 Bottom Sheet / Modal Card */}
          <motion.div
            ref={trapRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-lg bg-white dark:bg-[#1c1c1e] rounded-t-[32px] sm:rounded-[32px] border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col z-10"
          >
            {/* Grabber Handle */}
            <div className="m3-bottom-sheet-grabber sm:hidden" />

            {/* Header */}
            <div className="px-5 pt-3 pb-3 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 leading-tight">
                    {editingReading ? 'Edit Catatan Tensi' : 'Catat Tekanan Darah'}
                  </h3>
                  <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                    Profil: {activeProfile?.name || 'Pasien'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isListening
                      ? 'bg-rose-500 text-white animate-bounce shadow-md shadow-rose-500/30'
                      : 'bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                  }`}
                  title="Dikte Suara Hasil Pengukuran"
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#2c2c2e] text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Tutup modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSave} className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
              
              {/* Age-Stratified Clinical Assessment & Hemodynamics Banner */}
              {(() => {
                const ageEval = classifyAgeAdjustedBP(
                  systolic,
                  diastolic,
                  activeProfile?.age || 45,
                  pulse,
                  activeProfile?.guidelinePreference
                );
                return (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${ageEval.isNormalForAge ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {ageEval.ageStratum} • Target {ageEval.ageTargetText}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 mt-0.5">
                          {currentCategory.label} {ageEval.isIsolatedSystolicHypertension ? '• ISH' : ''}
                        </h4>
                      </div>
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono border ${currentCategory.badgeClass}`}>
                        {systolic}/{diastolic} mmHg
                      </span>
                    </div>

                    {/* Hemodynamic Telemetry Row: Pulse Pressure (PP), MAP, RPP */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 dark:border-white/10 text-center">
                      <div className="p-1.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200/60 dark:border-white/10">
                        <span className="text-[9px] font-extrabold text-slate-400 block">Pulse Pressure</span>
                        <span className={`text-xs font-black font-mono ${ageEval.pulsePressureStatus === 'wide' ? 'text-rose-500' : 'text-teal-600 dark:text-teal-400'}`}>
                          {ageEval.pulsePressure} mmHg
                        </span>
                        <span className="text-[8px] text-slate-400 block leading-tight">
                          {ageEval.pulsePressureStatus === 'wide' ? 'Kekakuan Arteri' : 'Normal'}
                        </span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200/60 dark:border-white/10">
                        <span className="text-[9px] font-extrabold text-slate-400 block">MAP (Perfusi)</span>
                        <span className="text-xs font-black font-mono text-sky-600 dark:text-sky-400">
                          {ageEval.map} mmHg
                        </span>
                        <span className="text-[8px] text-slate-400 block leading-tight">Normal 70–105</span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-white dark:bg-[#1c1c1e] border border-slate-200/60 dark:border-white/10">
                        <span className="text-[9px] font-extrabold text-slate-400 block">Beban Jantung (RPP)</span>
                        <span className="text-xs font-black font-mono text-purple-600 dark:text-purple-400">
                          {ageEval.rpp ? ageEval.rpp.toLocaleString() : '-'}
                        </span>
                        <span className="text-[8px] text-slate-400 block leading-tight">
                          {ageEval.rppStatus === 'high' ? 'Beban Tinggi' : 'Optimal'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      {ageEval.ageClinicalAdvice}
                    </p>
                  </div>
                );
              })()}

              {/* Triple Measurement Protocol Toggle Button */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowTripleMode(!showTripleMode)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  <Calculator size={13} />
                  <span>{showTripleMode ? 'Tutup Protokol 3x Pengukuran' : 'Gunakan Protokol ESH (Rata-rata 3x Pengukuran)'}</span>
                </button>
              </div>

              {/* Triple Measurement Mode Card */}
              {showTripleMode && (
                <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-teal-900 dark:text-teal-200">
                      Standar ESH 2023 (3x Pengukuran Interval 1 Menit)
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-teal-200 dark:bg-teal-900 text-teal-900 dark:text-teal-200">
                      Akurasi Emas
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-xl bg-white dark:bg-[#1c1c1e] text-center border border-teal-100 dark:border-teal-900 space-y-1">
                      <span className="text-[9px] font-black text-slate-400 block">Ukur 1</span>
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          value={t1Sys}
                          onChange={(e) => setT1Sys(Number(e.target.value))}
                          className="w-10 text-center font-mono font-bold text-xs bg-slate-100 dark:bg-[#2c2c2e] rounded p-1"
                        />
                        <span className="text-slate-400">/</span>
                        <input
                          type="number"
                          value={t1Dia}
                          onChange={(e) => setT1Dia(Number(e.target.value))}
                          className="w-10 text-center font-mono font-bold text-xs bg-slate-100 dark:bg-[#2c2c2e] rounded p-1"
                        />
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white dark:bg-[#1c1c1e] text-center border border-teal-100 dark:border-teal-900 space-y-1">
                      <span className="text-[9px] font-black text-slate-400 block">Ukur 2</span>
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          value={t2Sys}
                          onChange={(e) => setT2Sys(Number(e.target.value))}
                          className="w-10 text-center font-mono font-bold text-xs bg-slate-100 dark:bg-[#2c2c2e] rounded p-1"
                        />
                        <span className="text-slate-400">/</span>
                        <input
                          type="number"
                          value={t2Dia}
                          onChange={(e) => setT2Dia(Number(e.target.value))}
                          className="w-10 text-center font-mono font-bold text-xs bg-slate-100 dark:bg-[#2c2c2e] rounded p-1"
                        />
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-white dark:bg-[#1c1c1e] text-center border border-teal-100 dark:border-teal-900 space-y-1">
                      <span className="text-[9px] font-black text-slate-400 block">Ukur 3</span>
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          value={t3Sys}
                          onChange={(e) => setT3Sys(Number(e.target.value))}
                          className="w-10 text-center font-mono font-bold text-xs bg-slate-100 dark:bg-[#2c2c2e] rounded p-1"
                        />
                        <span className="text-slate-400">/</span>
                        <input
                          type="number"
                          value={t3Dia}
                          onChange={(e) => setT3Dia(Number(e.target.value))}
                          className="w-10 text-center font-mono font-bold text-xs bg-slate-100 dark:bg-[#2c2c2e] rounded p-1"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={applyTripleAverage}
                    className="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-sm transition-all"
                  >
                    Hitung &amp; Terapkan Rata-Rata ({Math.round((t1Sys + t2Sys + t3Sys)/3)}/{Math.round((t1Dia + t2Dia + t3Dia)/3)} mmHg)
                  </button>
                </div>
              )}

              {/* Big Stepper Inputs: Systolic, Diastolic, Pulse */}
              <div className="grid grid-cols-3 gap-2.5">
                
                {/* Systolic Stepper */}
                <div className="p-3 rounded-2xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/50 text-center space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400 block">
                    Sistolik
                  </span>
                  <div className="text-2xl font-black font-mono text-sky-900 dark:text-sky-100">
                    {systolic}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setSystolic((v) => Math.max(60, v - 1));
                      }}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-[#2c2c2e] text-sky-700 dark:text-sky-300 font-black shadow-sm flex items-center justify-center active:scale-90"
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setSystolic((v) => Math.min(250, v + 1));
                      }}
                      className="w-7 h-7 rounded-lg bg-sky-600 text-white font-black shadow-sm flex items-center justify-center active:scale-90"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Diastolic Stepper */}
                <div className="p-3 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/50 text-center space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400 block">
                    Diastolik
                  </span>
                  <div className="text-2xl font-black font-mono text-teal-900 dark:text-teal-100">
                    {diastolic}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setDiastolic((v) => Math.max(40, v - 1));
                      }}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-[#2c2c2e] text-teal-700 dark:text-teal-300 font-black shadow-sm flex items-center justify-center active:scale-90"
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setDiastolic((v) => Math.min(160, v + 1));
                      }}
                      className="w-7 h-7 rounded-lg bg-teal-600 text-white font-black shadow-sm flex items-center justify-center active:scale-90"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Pulse Stepper */}
                <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50 text-center space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                    Nadi / BPM
                  </span>
                  <div className="text-2xl font-black font-mono text-rose-900 dark:text-rose-100">
                    {pulse}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setPulse((v) => Math.max(40, v - 1));
                      }}
                      className="w-7 h-7 rounded-lg bg-white dark:bg-[#2c2c2e] text-rose-700 dark:text-rose-300 font-black shadow-sm flex items-center justify-center active:scale-90"
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setPulse((v) => Math.min(200, v + 1));
                      }}
                      className="w-7 h-7 rounded-lg bg-rose-600 text-white font-black shadow-sm flex items-center justify-center active:scale-90"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

              </div>

              {/* Context Selektor (White-Coat Guard) */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-500" />
                  Konteks &amp; Lingkungan Pengukuran
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {contextOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setMeasurementContext(opt.value);
                      }}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-bold transition-all text-left truncate ${
                        measurementContext === opt.value
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position & Arm Chips */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Posisi Tubuh
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['duduk', 'baring', 'berdiri'] as BodyPosition[]).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setPosition(pos);
                        }}
                        className={`py-1.5 rounded-lg text-[11px] font-bold capitalize ${
                          position === pos
                            ? 'bg-teal-500 text-white'
                            : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Lengan Pengukuran
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {(['kiri', 'kanan'] as ArmUsed[]).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setArm(a);
                        }}
                        className={`py-1.5 rounded-lg text-[11px] font-bold capitalize ${
                          arm === a
                            ? 'bg-teal-500 text-white'
                            : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timestamp Picker */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Clock size={14} className="text-teal-500" />
                  Waktu Pengukuran
                </label>
                <input
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Context Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Tag size={14} className="text-teal-500" />
                  Label Kondisi Terkait
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {commonTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          isSelected
                            ? 'bg-teal-500 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clinical Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <MessageSquare size={14} className="text-teal-500" />
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan gejala pusing, obat yang diminum, aktivitas fisik..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 pb-8 sm:pb-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-sky-500 text-white font-black text-sm shadow-xl shadow-teal-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={18} strokeWidth={3} />
                  {isSubmitting ? 'Menyimpan...' : editingReading ? 'Simpan Perubahan' : 'Catat Tensi Sekarang'}
                </button>
              </div>

            </form>

          </motion.div>

        </div>
      )}
    </AnimatePresence>
  );
};
