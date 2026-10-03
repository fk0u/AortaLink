/* Step 03: Onboarding Health Screening Modal — Non-blocking, FHIR R4 aligned */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Shield,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Scale,
  Cigarette,
  Syringe,
  Users,
  Sparkles
} from '../icons/AppIcons.tsx';
import { useAppStore } from '../../store/useAppStore.ts';
import { useProfiles } from '../../hooks/useProfiles.ts';
import { db } from '../../db/index.ts';
import {
  calculateBMI,
  AORTA_RISK_FACTORS_CATALOG,
  CARDIO_IMMUNIZATIONS_CATALOG,
  fetchProfileScreeningData,
  saveScreeningCondition,
  deleteScreeningCondition,
  saveScreeningFamilyHistory,
  deleteScreeningFamilyHistory,
  saveScreeningImmunization,
  deleteScreeningImmunization
} from '../../services/screening/screening-service.ts';
import type { AortaMeasurementDetails } from '../../types/blood-pressure.ts';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx.ts';

export const HealthScreeningModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.isScreeningModalOpen);
  const closeModal = useAppStore((state) => state.closeScreeningModal);
  const addToast = useAppStore((state) => state.addToast);
  const { activeProfile } = useProfiles();

  const [step, setStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Step 1: Anthropometry
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [weightKg, setWeightKg] = useState<number | ''>('');

  // Step 2: Lifestyle
  const [smokingStatus, setSmokingStatus] = useState<'never' | 'former' | 'current' | 'unknown'>('never');
  const [alcoholConsumption, setAlcoholConsumption] = useState<'none' | 'occasional' | 'moderate' | 'heavy' | 'unknown'>('none');
  const [substanceUseHistory, setSubstanceUseHistory] = useState<boolean>(false);

  // Step 3: Aorta Risk Factors (Map of key -> boolean) & Per-Condition Aorta Details
  const [selectedConditions, setSelectedConditions] = useState<Record<string, boolean>>({});
  const [aortaDetailsMap, setAortaDetailsMap] = useState<Record<string, AortaMeasurementDetails>>({});

  // Step 4: Family History
  const [familyAneurysm, setFamilyAneurysm] = useState<boolean>(false);
  const [familyAneurysmRel, setFamilyAneurysmRel] = useState<'FTH' | 'MTH' | 'SIB' | 'CHILD'>('FTH');
  const [familyDissection, setFamilyDissection] = useState<boolean>(false);
  const [familyDissectionRel, setFamilyDissectionRel] = useState<'FTH' | 'MTH' | 'SIB' | 'CHILD'>('FTH');

  // Step 5: Immunizations (Map of vaccineCode -> boolean)
  const [selectedVaccines, setSelectedVaccines] = useState<Record<string, boolean>>({
    FLU: false,
    PCV13: false,
    PPSV23: false,
    COVID19: false,
    TDAP: false
  });

  // Load existing profile screening data on open with clean initialization (no leakage from prior profile)
  useEffect(() => {
    if (!isOpen || !activeProfile) return;

    setStep(1);
    setHeightCm(activeProfile.heightCm ?? '');
    setWeightKg(activeProfile.weightKg ?? '');
    setSmokingStatus(activeProfile.smokingStatus ?? 'never');
    setAlcoholConsumption(activeProfile.alcoholConsumption ?? 'none');
    setSubstanceUseHistory(activeProfile.substanceUseHistory ?? false);

    async function loadData() {
      if (!activeProfile) return;
      const { conditions: existingConds, familyHistory: existingFmhs, immunizations: existingImms } =
        await fetchProfileScreeningData(activeProfile.id);

      const condMap: Record<string, boolean> = {};
      const detailsMap: Record<string, AortaMeasurementDetails> = {};

      for (const c of existingConds) {
        // Match exclusively on Condition targetResource to avoid shadowing between personal aorta history and family aneurysm
        const found = AORTA_RISK_FACTORS_CATALOG.find(
          (m) => m.targetResource === 'Condition' && m.icd10Code === c.code
        );
        if (found) {
          condMap[found.key] = true;
          if (c.aortaDetails) {
            detailsMap[found.key] = c.aortaDetails;
          }
        }
      }
      setSelectedConditions(condMap);
      setAortaDetailsMap(detailsMap);

      let hasAneurysm = false;
      let aneurysmRel: any = 'FTH';
      let hasDissection = false;
      let dissectionRel: any = 'FTH';

      for (const f of existingFmhs) {
        if (f.conditionCode === 'I71.9') {
          hasAneurysm = true;
          if (['FTH', 'MTH', 'SIB', 'CHILD'].includes(f.relationship)) {
            aneurysmRel = f.relationship as any;
          }
        }
        if (f.conditionCode === 'I71.0') {
          hasDissection = true;
          if (['FTH', 'MTH', 'SIB', 'CHILD'].includes(f.relationship)) {
            dissectionRel = f.relationship as any;
          }
        }
      }
      setFamilyAneurysm(hasAneurysm);
      setFamilyAneurysmRel(aneurysmRel);
      setFamilyDissection(hasDissection);
      setFamilyDissectionRel(dissectionRel);

      const immMap: Record<string, boolean> = {
        FLU: false,
        PCV13: false,
        PPSV23: false,
        COVID19: false,
        TDAP: false
      };
      for (const im of existingImms) {
        immMap[im.vaccineCode] = im.status === 'completed';
      }
      setSelectedVaccines(immMap);
    }

    loadData().catch(console.error);
  }, [isOpen, activeProfile]);

  const bmiEval = calculateBMI(
    typeof heightCm === 'number' ? heightCm : undefined,
    typeof weightKg === 'number' ? weightKg : undefined
  );

  const toggleCondition = (key: string) => {
    playClickSound();
    setSelectedConditions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleVaccine = (code: string) => {
    playClickSound();
    setSelectedVaccines((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const saveScreeningProgress = async (finalSave = false): Promise<boolean> => {
    if (!activeProfile) return false;
    setIsSaving(true);

    try {
      const now = new Date().toISOString();

      // 1. Update Profile Anthropometry & Lifestyle
      await db.profiles.update(activeProfile.id, {
        heightCm: typeof heightCm === 'number' && Number.isFinite(heightCm) && heightCm > 0 ? heightCm : undefined,
        weightKg: typeof weightKg === 'number' && Number.isFinite(weightKg) && weightKg > 0 ? weightKg : undefined,
        bmi: bmiEval ? bmiEval.bmi : undefined,
        smokingStatus,
        alcoholConsumption,
        substanceUseHistory,
        ...(finalSave ? { screeningCompletedAt: now } : {})
      });

      // 2. Persist Conditions through scoped repository layer
      const existingConds = await db.conditions.where('profileId').equals(activeProfile.id).toArray();
      const existingCondMap = new Map(existingConds.map((c) => [c.code, c]));

      for (const factor of AORTA_RISK_FACTORS_CATALOG) {
        if (factor.targetResource !== 'Condition') continue;
        const isChecked = !!selectedConditions[factor.key];
        const existing = existingCondMap.get(factor.icd10Code);
        const factorDetails = aortaDetailsMap[factor.key];
        const hasValidDetails =
          factor.supportsAortaDetails &&
          factorDetails &&
          typeof factorDetails.diameterMm === 'number' &&
          Number.isFinite(factorDetails.diameterMm) &&
          factorDetails.diameterMm > 0;

        if (isChecked) {
          await saveScreeningCondition(activeProfile.id, {
            ...(existing ? { id: existing.id } : {}),
            code: factor.icd10Code,
            snomedCode: factor.snomedCode,
            category: 'aorta_risk',
            name: factor.name,
            clinicalStatus: 'active',
            verificationStatus: 'confirmed',
            aortaDetails: hasValidDetails ? factorDetails : undefined
          });
        } else if (!isChecked && existing) {
          await deleteScreeningCondition(activeProfile.id, existing.id);
        }
      }

      // 3. Persist Family History
      const existingFmh = await db.familyHistory.where('profileId').equals(activeProfile.id).toArray();
      const fmhAneurysm = existingFmh.find((f) => f.conditionCode === 'I71.9');
      const fmhDissection = existingFmh.find((f) => f.conditionCode === 'I71.0');

      const relLabels: Record<string, string> = {
        FTH: 'Ayah Kandung',
        MTH: 'Ibu Kandung',
        SIB: 'Saudara Kandung',
        CHILD: 'Anak Kandung'
      };

      if (familyAneurysm) {
        await saveScreeningFamilyHistory(activeProfile.id, {
          ...(fmhAneurysm ? { id: fmhAneurysm.id } : {}),
          relationship: familyAneurysmRel,
          relationshipDisplay: relLabels[familyAneurysmRel] || 'Keluarga Inti',
          conditionCode: 'I71.9',
          conditionName: 'Aneurisma Aorta',
          snomedCode: '233985008'
        });
      } else if (!familyAneurysm && fmhAneurysm) {
        await deleteScreeningFamilyHistory(activeProfile.id, fmhAneurysm.id);
      }

      if (familyDissection) {
        await saveScreeningFamilyHistory(activeProfile.id, {
          ...(fmhDissection ? { id: fmhDissection.id } : {}),
          relationship: familyDissectionRel,
          relationshipDisplay: relLabels[familyDissectionRel] || 'Keluarga Inti',
          conditionCode: 'I71.0',
          conditionName: 'Diseksi Aorta / Sudden Death',
          snomedCode: '308540004',
          contributedToDeath: true
        });
      } else if (!familyDissection && fmhDissection) {
        await deleteScreeningFamilyHistory(activeProfile.id, fmhDissection.id);
      }

      // 4. Persist Immunizations
      const existingImms = await db.immunizations.where('profileId').equals(activeProfile.id).toArray();
      const existingImmMap = new Map(existingImms.map((i) => [i.vaccineCode, i]));

      for (const vac of CARDIO_IMMUNIZATIONS_CATALOG) {
        const isChecked = !!selectedVaccines[vac.code];
        const existing = existingImmMap.get(vac.code);

        if (isChecked) {
          await saveScreeningImmunization(activeProfile.id, {
            ...(existing ? { id: existing.id } : {}),
            vaccineCode: vac.code,
            vaccineName: vac.name,
            cvxCode: vac.cvxCode,
            occurrenceDateTime: now,
            status: 'completed'
          });
        } else if (!isChecked && existing) {
          await deleteScreeningImmunization(activeProfile.id, existing.id);
        }
      }

      if (finalSave) {
        playSuccessChime();
        addToast({
          type: 'success',
          title: 'Skrining Selesai',
          message: 'Data skrining kesehatan HL7 FHIR R4 berhasil diperbarui.'
        });
        closeModal();
      }
      return true;
    } catch (err: any) {
      console.error('Failed to save health screening:', err);
      addToast({
        type: 'error',
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan saat menyimpan skrining.'
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    playClickSound();
    const isFinal = step === 5;
    const ok = await saveScreeningProgress(isFinal);
    if (!ok) return; // Do not advance if save failed

    if (step < 5) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    playClickSound();
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  const handleSkip = async () => {
    playClickSound();
    // Persist current entered progress before advancing/closing without setting screeningCompletedAt
    await saveScreeningProgress(false);
    if (step < 5) {
      setStep((s) => s + 1);
    } else {
      closeModal();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10 rounded-t-[32px] sm:rounded-[32px] max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Skrining Kesehatan FHIR R4"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
                <Shield size={20} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Skrining Kesehatan &amp; Risiko Aorta
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold uppercase border border-indigo-200 dark:border-indigo-800">
                    FHIR R4
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Langkah {step} dari 5:{' '}
                  {step === 1
                    ? 'Antropometri & BMI'
                    : step === 2
                    ? 'Gaya Hidup'
                    : step === 3
                    ? 'Faktor Risiko Aorta'
                    : step === 4
                    ? 'Riwayat Keluarga'
                    : 'Imunisasi'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeModal}
              aria-label="Tutup skrining"
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Stepper Dots */}
          <div className="px-6 pt-3 flex items-center gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  i < step ? 'bg-emerald-500' : i === step ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>

          {/* Modal Body / Scrollable */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* STEP 1: Anthropometry */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/50 flex items-start gap-3">
                  <Scale className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
                    Pengukuran tinggi dan berat badan digunakan untuk mengklasifikasikan <strong>Indeks Massa Tubuh (BMI)</strong> sesuai batas potong Asia-Pasifik (WHO/Kemenkes).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Tinggi Badan (cm)
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 170"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.04] text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Berat Badan (kg)
                    </label>
                    <input
                      type="number"
                      placeholder="Contoh: 68"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.04] text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {bmiEval && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Estimasi BMI Anda</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-black border ${bmiEval.badgeColor}`}>
                        {bmiEval.bmi} kg/m² • {bmiEval.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {bmiEval.clinicalAdvice}
                    </p>
                  </motion.div>
                )}
              </div>
            )}

            {/* STEP 2: Lifestyle */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-start gap-3">
                  <Cigarette className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    Merokok tembakau merupakan <strong>faktor risiko eksternal terkuat</strong> untuk pembesaran dan robekan aneurisma aorta. Data ini dicatat dalam standar FHIR Social History.
                  </p>
                </div>

                {/* Smoking Status */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Status Merokok Tembakau
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: 'never', label: 'Bukan Perokok', desc: 'Tidak pernah merokok rutin' },
                      { val: 'former', label: 'Mantan Perokok', desc: 'Sudah berhenti merokok' },
                      { val: 'current', label: 'Perokok Aktif', desc: 'Merokok setiap hari / rutin' },
                      { val: 'unknown', label: 'Tidak Tahu / Ragu', desc: 'Tidak ingin menjawab' }
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setSmokingStatus(opt.val as any)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          smokingStatus === opt.val
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600 ring-2 ring-amber-500/20'
                            : 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100">{opt.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alcohol Consumption */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Riwayat Konsumsi Alkohol
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: 'none', label: 'Tidak Ada', desc: 'Tidak mengonsumsi alkohol' },
                      { val: 'occasional', label: 'Jarang / Sosial', desc: 'Hanya acara tertentu (<1x/bulan)' },
                      { val: 'moderate', label: 'Sedang', desc: '1–2 kali per minggu' },
                      { val: 'heavy', label: 'Sering / Berat', desc: 'Hampir setiap hari' }
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setAlcoholConsumption(opt.val as any)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          alcoholConsumption === opt.val
                            ? 'bg-teal-50 dark:bg-teal-950/30 border-teal-400 dark:border-teal-600 ring-2 ring-teal-500/20'
                            : 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100">{opt.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stimulants Exposure */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                      Riwayat Paparan Stimulan / Zat Tertentu
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-relaxed mt-0.5">
                      Pernah terpapar amfetamin/kokain/obat stimulan kuat yang memicu lonjakan tekanan darah mendadak?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSubstanceUseHistory(!substanceUseHistory);
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                      substanceUseHistory ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        substanceUseHistory ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Aorta Risk Factors */}
            {step === 3 && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/50 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                    Pilih kondisi klinis terverifikasi yang Anda miliki. Data disimpan ke resource <code>Condition</code> (ICD-10 WHO &amp; SNOMED CT) dan digunakan untuk memicu peringatan proteksi vaskular secara personal.
                  </p>
                </div>

                <div className="space-y-2">
                  {AORTA_RISK_FACTORS_CATALOG.filter((f) => f.targetResource === 'Condition').map((factor) => {
                    const isChecked = !!selectedConditions[factor.key];
                    const factorDetails = aortaDetailsMap[factor.key] || {
                      diameterMm: undefined,
                      segment: 'ascending',
                      modality: 'cta',
                      measurementMethod: 'inner_to_inner'
                    };

                    return (
                      <div
                        key={factor.key}
                        className={`p-3 rounded-2xl border transition-all ${
                          isChecked
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                            : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                                {factor.name}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                ICD-10 {factor.icd10Code}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                              {factor.question}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleCondition(factor.key)}
                            className={`w-10 h-5 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                              isChecked ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                isChecked ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Structured Aorta Dimension Form (Scoped per condition) */}
                        {isChecked && factor.supportsAortaDetails && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 pt-3 border-t border-rose-200/60 dark:border-rose-800/40 space-y-3"
                          >
                            <div className="flex items-center gap-1.5 text-[11px] font-black text-rose-800 dark:text-rose-300">
                              <Sparkles size={12} />
                              Metadata Dimensi Aorta Terstruktur ({factor.name}):
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                  Diameter Maksimal (mm)
                                </label>
                                <input
                                  type="number"
                                  placeholder="Contoh: 42"
                                  value={factorDetails.diameterMm ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? undefined : Number(e.target.value);
                                    setAortaDetailsMap((prev) => ({
                                      ...prev,
                                      [factor.key]: {
                                        ...factorDetails,
                                        diameterMm: val
                                      }
                                    }));
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-slate-100 font-semibold"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">
                                  Segmen Aorta
                                </label>
                                <select
                                  value={factorDetails.segment || 'ascending'}
                                  onChange={(e) => {
                                    const seg = e.target.value as any;
                                    setAortaDetailsMap((prev) => ({
                                      ...prev,
                                      [factor.key]: {
                                        ...factorDetails,
                                        segment: seg
                                      }
                                    }));
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs bg-white dark:bg-[#1c1c1e] text-slate-800 dark:text-slate-100 font-semibold"
                                >
                                  <option value="ascending">Asendens / Akar Aorta</option>
                                  <option value="arch">Arkus Aorta</option>
                                  <option value="descending_thoracic">Desendens Torakalis</option>
                                  <option value="abdominal_infrarenal">Abdominalis (AAA)</option>
                                </select>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 4: Family History */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 flex items-start gap-3">
                  <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                    Riwayat penyakit aorta pada keluarga inti (orang tua, saudara kandung, anak) merupakan salah satu kriteria utama skrining genogram vaskular (HL7 <code>FamilyMemberHistory</code>).
                  </p>
                </div>

                {/* Family Aneurysm */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                        Aneurisma Aorta pada Keluarga Inti
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Pernahkah orang tua, saudara kandung, atau anak menderita aneurisma?
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setFamilyAneurysm(!familyAneurysm);
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                        familyAneurysm ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          familyAneurysm ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {familyAneurysm && (
                    <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Hubungan:</span>
                      {[
                        { code: 'FTH', label: 'Ayah' },
                        { code: 'MTH', label: 'Ibu' },
                        { code: 'SIB', label: 'Saudara' },
                        { code: 'CHILD', label: 'Anak' }
                      ].map((rel) => (
                        <button
                          key={rel.code}
                          type="button"
                          onClick={() => setFamilyAneurysmRel(rel.code as any)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                            familyAneurysmRel === rel.code
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {rel.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Family Dissection */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                        Diseksi Aorta / Meninggal Mendadak (&lt;50 th)
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Riwayat robekan aorta atau kematian vaskular muda tanpa sebab jelas
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setFamilyDissection(!familyDissection);
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                        familyDissection ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          familyDissection ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {familyDissection && (
                    <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Hubungan:</span>
                      {[
                        { code: 'FTH', label: 'Ayah' },
                        { code: 'MTH', label: 'Ibu' },
                        { code: 'SIB', label: 'Saudara' },
                        { code: 'CHILD', label: 'Anak' }
                      ].map((rel) => (
                        <button
                          key={rel.code}
                          type="button"
                          onClick={() => setFamilyDissectionRel(rel.code as any)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                            familyDissectionRel === rel.code
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {rel.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: Immunizations */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 flex items-start gap-3">
                  <Syringe className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                    Vaksinasi berkala (terutama Influenza &amp; Pneumokokus) terbukti menurunkan risiko dekompensasi dan kejadian vaskular akut pada pasien hipertensi dan aortopati (HL7 <code>Immunization</code>).
                  </p>
                </div>

                <div className="space-y-2.5">
                  {CARDIO_IMMUNIZATIONS_CATALOG.map((vac) => {
                    const isChecked = !!selectedVaccines[vac.code];
                    return (
                      <div
                        key={vac.code}
                        onClick={() => toggleVaccine(vac.code)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          isChecked
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/5'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                              {vac.name}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold">
                              {vac.frequency}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            {vac.description}
                          </p>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                            isChecked
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white dark:bg-[#2c2c2e] text-transparent border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <Check size={14} className={isChecked ? 'opacity-100' : 'opacity-0'} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls (Non-blocking) */}
          <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
            <div>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5"
                >
                  <ChevronLeft size={14} /> Kembali
                </button>
              ) : (
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  Selesaikan Nanti
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSkip}
                className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {step === 5 ? 'Lewati & Simpan' : 'Lewati'}
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-xs font-black shadow-md shadow-rose-600/20 active:scale-95 transition-all flex items-center gap-1.5"
              >
                {step === 5 ? 'Selesai & Simpan' : 'Simpan & Lanjut'}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
