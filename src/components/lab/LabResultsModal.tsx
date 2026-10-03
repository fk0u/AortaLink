/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FlaskConical,
  Plus,
  Trash2,
  Calendar,
  Layers,
  HeartPulse,
  Activity,
  ShieldAlert,
  CheckCircle2,
  FileText
} from '../icons/AppIcons';
import { timeService } from '../../services/time/time-service';
import { format } from 'date-fns';
import type { ImagingModality, DiagnosticReportItem } from '../../types/blood-pressure';

interface LabResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper eGFR (CKD-EPI 2021 formula)
function calculateEGFR(creatinine: number, age: number = 45, gender: string = 'male'): number {
  if (!creatinine || creatinine <= 0) return 90;
  const isFemale = gender === 'female';
  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const minRatio = Math.min(creatinine / kappa, 1);
  const maxRatio = Math.max(creatinine / kappa, 1);
  const genderMultiplier = isFemale ? 1.012 : 1;
  const egfr = 142 * Math.pow(minRatio, alpha) * Math.pow(maxRatio, -1.2) * Math.pow(0.9938, age) * genderMultiplier;
  return Math.round(egfr * 10) / 10;
}

// Helper Aortic Diameter Risk Classification
export function getAortaDiameterClassification(maxMm?: number): {
  category: 'normal' | 'ectasia' | 'aneurysm' | 'severe';
  label: string;
  badgeClass: string;
  description: string;
} {
  if (!maxMm || maxMm <= 0) {
    return {
      category: 'normal',
      label: 'Belum Ada Pengukuran',
      badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      description: 'Masukkan diameter segmen aorta dalam milimeter (mm).'
    };
  }
  if (maxMm < 35) {
    return {
      category: 'normal',
      label: `Normal (${maxMm} mm)`,
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
      description: 'Kaliber lumen aorta dalam batas fisiologis normal (<35 mm).'
    };
  }
  if (maxMm < 40) {
    return {
      category: 'ectasia',
      label: `Ektasia Ringan (${maxMm} mm)`,
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
      description: 'Pelebaran kaliber aorta ringan (35–39 mm). Pemantauan berkala disarankan.'
    };
  }
  if (maxMm < 50) {
    return {
      category: 'aneurysm',
      label: `Aneurisma Aorta (${maxMm} mm)`,
      badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-800',
      description: 'Aneurisma terdeteksi (40–49 mm). Evaluasi dokter spesialis jantung/bedah vaskular & kontrol tensi ketat.'
    };
  }
  return {
    category: 'severe',
    label: `Aneurisma Signifikan (${maxMm} mm)`,
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/90 dark:text-rose-200 border border-rose-300 dark:border-rose-800 animate-pulse',
    description: 'Pelebaran kaliber aorta signifikan (≥50 mm). Pertimbangan indikasi intervensi/bedah aorta.'
  };
}

export const LabResultsModal: React.FC<LabResultsModalProps> = ({ isOpen, onClose }) => {
  const { activeProfileId, activeProfile } = useProfiles();
  const addToast = useAppStore((state) => state.addToast);

  // Tab State: 'labs' (Tes Darah & Biomarker) or 'imaging' (Imaging Aorta)
  const [activeTab, setActiveTab] = useState<'labs' | 'imaging'>('labs');

  // --- Form states: Renal & Gout ---
  const [uricAcid, setUricAcid] = useState<number>(6.2);
  const [bloodUrea, setBloodUrea] = useState<number>(28);
  const [serumCreatinine, setSerumCreatinine] = useState<number>(0.9);

  // --- Extended Hospital Parameters ---
  const [showExtended, setShowExtended] = useState<boolean>(false);
  const [totalCholesterol, setTotalCholesterol] = useState<number>(190);
  const [ldlCholesterol, setLdlCholesterol] = useState<number>(115);
  const [hdlCholesterol, setHdlCholesterol] = useState<number>(52);
  const [triglycerides, setTriglycerides] = useState<number>(140);
  const [fastingBloodSugar, setFastingBloodSugar] = useState<number>(95);
  const [hba1c, setHba1c] = useState<number>(5.6);
  const [potassium, setPotassium] = useState<number>(4.2);
  const [sodium, setSodium] = useState<number>(140);
  const [proteinuria, setProteinuria] = useState<'negatif' | 'trace' | '+1' | '+2' | '+3'>('negatif');

  // --- Biomarkers: D-Dimer, Troponin, hs-CRP ---
  const [showBiomarkers, setShowBiomarkers] = useState<boolean>(false);
  const [dDimerVal, setDDimerVal] = useState<string>('');
  const [dDimerUnit, setDDimerUnit] = useState<'ug/mL' | 'ng/mL' | 'mg/L'>('ug/mL');
  const [dDimerType, setDDimerType] = useState<'FEU' | 'DDU'>('FEU');
  const [dDimerLoinc, setDDimerLoinc] = useState<string>('48065-7');

  const [troponinType, setTroponinType] = useState<'hs-cTnI' | 'hs-cTnT' | 'cTnI'>('hs-cTnI');
  const [troponinVal, setTroponinVal] = useState<string>('');
  const [troponinUnit, setTroponinUnit] = useState<'ng/L' | 'pg/mL' | 'ng/mL'>('ng/L');

  const [hsCrpVal, setHsCrpVal] = useState<string>('');

  const [dateStr, setDateStr] = useState<string>(() => timeService.getLocalDateString());
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // --- Form states: Aorta Imaging DiagnosticReport ---
  const [imagingModality, setImagingModality] = useState<ImagingModality>('CTA');
  const [imagingDateStr, setImagingDateStr] = useState<string>(() => timeService.getLocalDateString());
  const [rootDiameter, setRootDiameter] = useState<string>('');
  const [ascendingDiameter, setAscendingDiameter] = useState<string>('');
  const [archDiameter, setArchDiameter] = useState<string>('');
  const [descendingDiameter, setDescendingDiameter] = useState<string>('');
  const [abdominalDiameter, setAbdominalDiameter] = useState<string>('');
  const [manualMaxDiameter, setManualMaxDiameter] = useState<string>('');
  const [imagingConclusion, setImagingConclusion] = useState<string>('');
  const [imagingFindings, setImagingFindings] = useState<string>('');

  // Auto eGFR calculation
  const calculatedEGFR = calculateEGFR(serumCreatinine, activeProfile?.age || 45, activeProfile?.gender || 'male');

  // Query lab results for active profile
  const labResults = useLiveQuery(
    async () => {
      if (!activeProfileId) return [];
      return await db.labResults.where('profileId').equals(activeProfileId).sortBy('timestamp');
    },
    [activeProfileId]
  );

  // Query diagnostic reports for active profile
  const diagnosticReports = useLiveQuery(
    async () => {
      if (!activeProfileId) return [];
      return await db.diagnosticReports.where('profileId').equals(activeProfileId).reverse().sortBy('effectiveDateTime');
    },
    [activeProfileId]
  );

  // Auto-calculated max diameter
  const parsedDiameters = [
    parseFloat(rootDiameter),
    parseFloat(ascendingDiameter),
    parseFloat(archDiameter),
    parseFloat(descendingDiameter),
    parseFloat(abdominalDiameter)
  ].filter((v) => !isNaN(v) && v > 0);

  const autoMax = parsedDiameters.length > 0 ? Math.max(...parsedDiameters) : 0;
  const effectiveMaxDiameter = manualMaxDiameter ? parseFloat(manualMaxDiameter) : autoMax;
  const classification = getAortaDiameterClassification(effectiveMaxDiameter);

  // Submit Lab Results
  const handleLabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfileId) {
      addToast({ type: 'error', title: 'Gagal', message: 'Profil tidak aktif.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const isoTimestamp = new Date(`${dateStr}T10:00:00`).toISOString();

      const numDDimer = dDimerVal ? parseFloat(dDimerVal) : undefined;
      const numTroponin = troponinVal ? parseFloat(troponinVal) : undefined;
      const numHsCrp = hsCrpVal ? parseFloat(hsCrpVal) : undefined;

      const troponinLoinc = troponinType === 'hs-cTnI' ? '89579-7' : troponinType === 'hs-cTnT' ? '6598-7' : '10839-9';

      const sourceLabCodes: Record<string, string> = {};
      if (numDDimer !== undefined) sourceLabCodes['dDimer'] = dDimerLoinc;
      if (numTroponin !== undefined) sourceLabCodes['troponin'] = troponinLoinc;
      if (numHsCrp !== undefined) sourceLabCodes['hsCrp'] = '30522-7';

      await db.labResults.add({
        profileId: activeProfileId,
        timestamp: isoTimestamp,
        uricAcid: Number(uricAcid),
        bloodUrea: Number(bloodUrea),
        serumCreatinine: Number(serumCreatinine),
        eGfr: calculatedEGFR,
        totalCholesterol: showExtended ? Number(totalCholesterol) : undefined,
        ldlCholesterol: showExtended ? Number(ldlCholesterol) : undefined,
        hdlCholesterol: showExtended ? Number(hdlCholesterol) : undefined,
        triglycerides: showExtended ? Number(triglycerides) : undefined,
        fastingBloodSugar: showExtended ? Number(fastingBloodSugar) : undefined,
        hba1c: showExtended ? Number(hba1c) : undefined,
        potassium: showExtended ? Number(potassium) : undefined,
        sodium: showExtended ? Number(sodium) : undefined,
        proteinuria: showExtended ? proteinuria : undefined,
        dDimer: numDDimer,
        dDimerUnit: numDDimer !== undefined ? dDimerUnit : undefined,
        dDimerType: numDDimer !== undefined ? dDimerType : undefined,
        dDimerLoinc: numDDimer !== undefined ? dDimerLoinc : undefined,
        troponinI: troponinType === 'hs-cTnI' || troponinType === 'cTnI' ? numTroponin : undefined,
        troponinT: troponinType === 'hs-cTnT' ? numTroponin : undefined,
        troponinUnit: numTroponin !== undefined ? troponinUnit : undefined,
        troponinLoinc: numTroponin !== undefined ? troponinLoinc : undefined,
        hsCrp: numHsCrp,
        sourceLabCodes: Object.keys(sourceLabCodes).length > 0 ? sourceLabCodes : undefined,
        notes
      });

      playSuccessChime();
      addToast({
        type: 'success',
        title: 'Hasil Lab & Biomarker Tersimpan',
        message: `Asam Urat: ${uricAcid} mg/dL, Kreatinin: ${serumCreatinine} mg/dL (eGFR ${calculatedEGFR}).`
      });

      setNotes('');
      setDDimerVal('');
      setTroponinVal('');
      setHsCrpVal('');
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Gagal menyimpan hasil laboratorium.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Imaging Report
  const handleImagingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfileId) {
      addToast({ type: 'error', title: 'Gagal', message: 'Profil tidak aktif.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const isoEffectiveTime = new Date(`${imagingDateStr}T11:00:00`).toISOString();

      const numRoot = rootDiameter ? parseFloat(rootDiameter) : undefined;
      const numAsc = ascendingDiameter ? parseFloat(ascendingDiameter) : undefined;
      const numArch = archDiameter ? parseFloat(archDiameter) : undefined;
      const numDesc = descendingDiameter ? parseFloat(descendingDiameter) : undefined;
      const numAbd = abdominalDiameter ? parseFloat(abdominalDiameter) : undefined;
      const numMax = effectiveMaxDiameter > 0 ? effectiveMaxDiameter : undefined;

      const reportData: DiagnosticReportItem = {
        profileId: activeProfileId,
        effectiveDateTime: isoEffectiveTime,
        modality: imagingModality,
        category: 'cardiovascular',
        conclusion: imagingConclusion.trim() || undefined,
        findings: imagingFindings.trim() || undefined,
        measurements: {
          rootDiameterMm: numRoot,
          ascendingAortaMm: numAsc,
          aorticArchMm: numArch,
          descendingAortaMm: numDesc,
          abdominalAortaMm: numAbd,
          maxDiameterMm: numMax
        },
        clientUpdatedAt: new Date().toISOString()
      };

      await db.diagnosticReports.add(reportData);

      playSuccessChime();
      addToast({
        type: 'success',
        title: 'Laporan Imaging Aorta Tersimpan',
        message: `${imagingModality} - Diameter Maks: ${numMax ? `${numMax} mm` : 'N/A'} (${classification.label})`
      });

      // Reset imaging form
      setRootDiameter('');
      setAscendingDiameter('');
      setArchDiameter('');
      setDescendingDiameter('');
      setAbdominalDiameter('');
      setManualMaxDiameter('');
      setImagingConclusion('');
      setImagingFindings('');
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Gagal menyimpan laporan imaging aorta.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLab = async (id?: number) => {
    if (!id) return;
    try {
      playClickSound();
      await db.labResults.delete(id);
      addToast({ type: 'info', title: 'Dihapus', message: 'Catatan lab telah dihapus.' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Gagal menghapus data lab.' });
    }
  };

  const handleDeleteReport = async (id?: number) => {
    if (!id) return;
    try {
      playClickSound();
      await db.diagnosticReports.delete(id);
      addToast({ type: 'info', title: 'Dihapus', message: 'Laporan imaging telah dihapus.' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Gagal menghapus laporan imaging.' });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-[#1c1c1e] rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {activeTab === 'labs' ? <FlaskConical className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  {activeTab === 'labs' ? 'Laboratorium & Biomarker' : 'Imaging Aorta (DiagnosticReport)'}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                    HL7 FHIR R4
                  </span>
                </h3>
                <p className="text-[11px] font-medium text-slate-400">
                  {activeTab === 'labs'
                    ? 'Biomarker Kardiovaskular (D-Dimer, Troponin, hs-CRP) & Renal/Metabolik'
                    : 'CTA, Ekokardiografi, X-Ray & MRI tanpa file gambar (LOINC & UCUM mm)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tab Bar */}
          <div className="px-5 pt-3 pb-2 border-b border-slate-100 dark:border-white/10 bg-slate-50/30 dark:bg-white/5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('labs')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'labs'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Tes Darah &amp; Biomarker ({(labResults?.length || 0)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('imaging')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'imaging'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Imaging Aorta ({(diagnosticReports?.length || 0)})
            </button>
          </div>

          <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* TAB 1: LABS & BIOMARKERS */}
            {activeTab === 'labs' && (
              <>
                <form
                  onSubmit={handleLabSubmit}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                      <Plus className="w-4 h-4" /> Input Hasil Lab &amp; Biomarker
                    </span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="date"
                        value={dateStr}
                        onChange={(e) => setDateStr(e.target.value)}
                        className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Primary Renal & Gout */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-slate-700/60 p-3 rounded-xl border border-slate-200/80 dark:border-white/10 space-y-1">
                      <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                        Asam Urat
                      </label>
                      <div className="flex items-baseline gap-1">
                        <input
                          type="number"
                          step="0.1"
                          value={uricAcid}
                          onChange={(e) => setUricAcid(Number(e.target.value))}
                          className="w-full text-lg font-black text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                          required
                        />
                        <span className="text-[10px] text-slate-400 font-bold">mg/dL</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block">Normal &lt; 7.0</span>
                    </div>

                    <div className="bg-white dark:bg-slate-700/60 p-3 rounded-xl border border-slate-200/80 dark:border-white/10 space-y-1">
                      <label className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase">
                        Ureum Darah
                      </label>
                      <div className="flex items-baseline gap-1">
                        <input
                          type="number"
                          step="1"
                          value={bloodUrea}
                          onChange={(e) => setBloodUrea(Number(e.target.value))}
                          className="w-full text-lg font-black text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                          required
                        />
                        <span className="text-[10px] text-slate-400 font-bold">mg/dL</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block">Normal 15–45</span>
                    </div>

                    <div className="bg-white dark:bg-slate-700/60 p-3 rounded-xl border border-slate-200/80 dark:border-white/10 space-y-1">
                      <label className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase">
                        Kreatinin
                      </label>
                      <div className="flex items-baseline gap-1">
                        <input
                          type="number"
                          step="0.1"
                          value={serumCreatinine}
                          onChange={(e) => setSerumCreatinine(Number(e.target.value))}
                          className="w-full text-lg font-black text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                          required
                        />
                        <span className="text-[10px] text-slate-400 font-bold">mg/dL</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block">Normal 0.6–1.2</span>
                    </div>
                  </div>

                  {/* Real-time eGFR CKD-EPI Badge */}
                  <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-teal-900 dark:text-teal-300 block">
                        Kalkulasi Otomatis Laju Filtrasi Glomerulus (eGFR CKD-EPI 2021)
                      </span>
                      <span className="text-xs font-black text-teal-700 dark:text-teal-400">
                        {calculatedEGFR} mL/min/1.73m² •{' '}
                        {calculatedEGFR >= 90
                          ? 'Stadium 1 (Optimal)'
                          : calculatedEGFR >= 60
                          ? 'Stadium 2 (Penurunan Ringan)'
                          : calculatedEGFR >= 45
                          ? 'Stadium 3a (Penurunan Sedang)'
                          : 'Evaluasi Nefrologi'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-200 dark:bg-teal-900 text-teal-900 dark:text-teal-200">
                      {activeProfile?.age || 45} Th • {activeProfile?.gender === 'female' ? 'Wanita' : 'Pria'}
                    </span>
                  </div>

                  {/* Section Toggle: Biomarker Kardiovaskular (D-Dimer, Troponin, hs-CRP) */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowBiomarkers(!showBiomarkers)}
                      className="text-[11px] font-extrabold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1.5"
                    >
                      <HeartPulse className="w-3.5 h-3.5" />
                      <span>
                        {showBiomarkers
                          ? '− Sembunyikan Biomarker Kardiovaskular'
                          : '+ Biomarker Kardiovaskular & Aorta (D-Dimer, Troponin, hs-CRP)'}
                      </span>
                    </button>
                  </div>

                  {showBiomarkers && (
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                        Biomarker Serum Vaskular (AAS Rule-Out &amp; Myocardial Injury)
                      </span>

                      {/* D-Dimer */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            D-Dimer (Fibrin Degradation)
                          </label>
                          <span className="text-[9px] text-slate-400 font-mono">LOINC {dDimerLoinc}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Nilai D-Dimer..."
                            value={dDimerVal}
                            onChange={(e) => setDDimerVal(e.target.value)}
                            className="col-span-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-bold"
                          />
                          <select
                            value={dDimerUnit}
                            onChange={(e) => setDDimerUnit(e.target.value as any)}
                            className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold"
                          >
                            <option value="ug/mL">µg/mL</option>
                            <option value="mg/L">mg/L</option>
                            <option value="ng/mL">ng/mL</option>
                          </select>
                          <select
                            value={dDimerType}
                            onChange={(e) => {
                              const type = e.target.value as 'FEU' | 'DDU';
                              setDDimerType(type);
                              setDDimerLoinc(type === 'FEU' ? '48065-7' : '48067-3');
                            }}
                            className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold"
                          >
                            <option value="FEU">FEU (Fibrinogen Equivalent)</option>
                            <option value="DDU">DDU (D-dimer Unit)</option>
                          </select>
                        </div>
                        <div className="text-[9px] text-slate-400 flex items-center justify-between">
                          <span>Cutoff umum eksklusi diseksi aorta: &lt;0.50 µg/mL FEU</span>
                          {dDimerVal && parseFloat(dDimerVal) > 0.5 && (
                            <span className="text-rose-500 font-bold">D-Dimer Meningkat</span>
                          )}
                        </div>
                      </div>

                      {/* Troponin */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            Troponin Jantung (Cardiac Troponin)
                          </label>
                          <select
                            value={troponinType}
                            onChange={(e) => setTroponinType(e.target.value as any)}
                            className="text-[10px] font-bold bg-transparent text-purple-600 dark:text-purple-400 focus:outline-none"
                          >
                            <option value="hs-cTnI">hs-cTnI (LOINC 89579-7)</option>
                            <option value="hs-cTnT">hs-cTnT (LOINC 6598-7)</option>
                            <option value="cTnI">cTnI Standar (LOINC 10839-9)</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Nilai Troponin..."
                            value={troponinVal}
                            onChange={(e) => setTroponinVal(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-bold"
                          />
                          <select
                            value={troponinUnit}
                            onChange={(e) => setTroponinUnit(e.target.value as any)}
                            className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-semibold"
                          >
                            <option value="ng/L">ng/L</option>
                            <option value="pg/mL">pg/mL</option>
                            <option value="ng/mL">ng/mL</option>
                          </select>
                        </div>
                        <div className="text-[9px] text-slate-400">
                          99th percentile URL: hs-cTnT ~14 ng/L, hs-cTnI ~26 ng/L.
                        </div>
                      </div>

                      {/* hs-CRP */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            hs-CRP (High-Sensitivity C-Reactive Protein)
                          </label>
                          <span className="text-[9px] text-slate-400 font-mono">LOINC 30522-7</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Nilai hs-CRP..."
                            value={hsCrpVal}
                            onChange={(e) => setHsCrpVal(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-bold"
                          />
                          <span className="text-xs font-bold text-slate-400">mg/L</span>
                        </div>
                        <span className="text-[9px] text-slate-400 block">
                          Risiko Vaskular: &lt;1.0 Rendah • 1.0–3.0 Sedang • &gt;3.0 Tinggi
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Section Toggle: Extended Hospital Parameters */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowExtended(!showExtended)}
                      className="text-[11px] font-extrabold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <span>
                        {showExtended
                          ? '− Sembunyikan Profil Lipid & Metabolik'
                          : '+ Parameter Lab Lanjutan (Lipid, Gula Darah, Elektrolit & Urin)'}
                      </span>
                    </button>
                  </div>

                  {showExtended && (
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-[#2c2c2e] border border-slate-200 dark:border-white/10 space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Profil Lipid &amp; Kardiovaskular (AHA/ACC)
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10">
                          <label className="text-[9px] font-bold text-slate-500 block">Total Kolesterol</label>
                          <input
                            type="number"
                            value={totalCholesterol}
                            onChange={(e) => setTotalCholesterol(Number(e.target.value))}
                            className="w-full text-xs font-black bg-transparent focus:outline-none"
                          />
                          <span className="text-[8px] text-slate-400">&lt;200 mg/dL</span>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10">
                          <label className="text-[9px] font-bold text-slate-500 block">LDL-C (Jahat)</label>
                          <input
                            type="number"
                            value={ldlCholesterol}
                            onChange={(e) => setLdlCholesterol(Number(e.target.value))}
                            className="w-full text-xs font-black bg-transparent focus:outline-none"
                          />
                          <span className="text-[8px] text-slate-400">&lt;100 mg/dL</span>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10">
                          <label className="text-[9px] font-bold text-slate-500 block">HDL-C (Baik)</label>
                          <input
                            type="number"
                            value={hdlCholesterol}
                            onChange={(e) => setHdlCholesterol(Number(e.target.value))}
                            className="w-full text-xs font-black bg-transparent focus:outline-none"
                          />
                          <span className="text-[8px] text-slate-400">&gt;40 mg/dL</span>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10">
                          <label className="text-[9px] font-bold text-slate-500 block">Trigliserida</label>
                          <input
                            type="number"
                            value={triglycerides}
                            onChange={(e) => setTriglycerides(Number(e.target.value))}
                            className="w-full text-xs font-black bg-transparent focus:outline-none"
                          />
                          <span className="text-[8px] text-slate-400">&lt;150 mg/dL</span>
                        </div>
                      </div>

                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block pt-1">
                        Metabolik, Elektrolit &amp; Urin
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10">
                          <label className="text-[9px] font-bold text-slate-500 block">GDP (Puasa)</label>
                          <input
                            type="number"
                            value={fastingBloodSugar}
                            onChange={(e) => setFastingBloodSugar(Number(e.target.value))}
                            className="w-full text-xs font-black bg-transparent focus:outline-none"
                          />
                          <span className="text-[8px] text-slate-400">&lt;100 mg/dL</span>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10">
                          <label className="text-[9px] font-bold text-slate-500 block">HbA1c (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={hba1c}
                            onChange={(e) => setHba1c(Number(e.target.value))}
                            className="w-full text-xs font-black bg-transparent focus:outline-none"
                          />
                          <span className="text-[8px] text-slate-400">&lt;5.7%</span>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10">
                          <label className="text-[9px] font-bold text-slate-500 block">Kalium (K+)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={potassium}
                            onChange={(e) => setPotassium(Number(e.target.value))}
                            className="w-full text-xs font-black bg-transparent focus:outline-none"
                          />
                          <span className="text-[8px] text-slate-400">3.5–5.0</span>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10">
                          <label className="text-[9px] font-bold text-slate-500 block">Natrium (Na+)</label>
                          <input
                            type="number"
                            value={sodium}
                            onChange={(e) => setSodium(Number(e.target.value))}
                            className="w-full text-xs font-black bg-transparent focus:outline-none"
                          />
                          <span className="text-[8px] text-slate-400">135–145</span>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/10">
                          <label className="text-[9px] font-bold text-slate-500 block">Proteinuria</label>
                          <select
                            value={proteinuria}
                            onChange={(e) => setProteinuria(e.target.value as any)}
                            className="w-full text-xs font-black bg-transparent focus:outline-none"
                          >
                            <option value="negatif">Negatif</option>
                            <option value="trace">Trace</option>
                            <option value="+1">+1 (30mg)</option>
                            <option value="+2">+2 (100mg)</option>
                            <option value="+3">+3 (300mg)</option>
                          </select>
                          <span className="text-[8px] text-slate-400">Urin</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <input
                      type="text"
                      placeholder="Catatan laboratorium tambahan..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="hallmark-button-primary w-full py-2.5 text-xs"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Rekam Lab & Biomarker'}
                  </button>
                </form>

                {/* Lab History Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Riwayat Parameter Laboratorium
                  </h4>

                  {!labResults || labResults.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400">
                      Belum ada catatan hasil laboratorium. Masukkan hasil tes darah di atas.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {labResults.map((item) => {
                        const isHighUric = item.uricAcid > 7.0;
                        const isHighRenal = item.serumCreatinine > 1.2 || item.bloodUrea > 45;
                        const hasDdimer = item.dDimer !== undefined;
                        const hasTroponin = item.troponinI !== undefined || item.troponinT !== undefined;

                        return (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold text-slate-500">
                                  {format(new Date(item.timestamp), 'dd MMM yyyy')}
                                </span>
                                {isHighUric && (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                    Asam Urat Tinggi ({item.uricAcid} mg/dL)
                                  </span>
                                )}
                                {isHighRenal && (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                    Ginjal Evaluasi
                                  </span>
                                )}
                                {hasDdimer && (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                    D-Dimer: {item.dDimer} {item.dDimerUnit || 'µg/mL'} ({item.dDimerType || 'FEU'})
                                  </span>
                                )}
                                {hasTroponin && (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                                    Troponin: {item.troponinI ?? item.troponinT} {item.troponinUnit || 'ng/L'}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs font-extrabold text-slate-800 dark:text-slate-200 flex-wrap">
                                <span>
                                  Asam Urat:{' '}
                                  <strong className={isHighUric ? 'text-rose-500' : 'text-emerald-500'}>
                                    {item.uricAcid}
                                  </strong>{' '}
                                  mg/dL
                                </span>
                                <span>
                                  Ureum: <strong>{item.bloodUrea}</strong> mg/dL
                                </span>
                                <span>
                                  Kreatinin: <strong>{item.serumCreatinine}</strong> mg/dL
                                </span>
                                {item.eGfr && (
                                  <span className="text-teal-600 dark:text-teal-400">
                                    eGFR: <strong>{item.eGfr}</strong>
                                  </span>
                                )}
                              </div>
                              {item.notes && <p className="text-[10px] text-slate-400 italic">{item.notes}</p>}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteLab(item.id)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TAB 2: IMAGING AORTA (DIAGNOSTIC REPORT) */}
            {activeTab === 'imaging' && (
              <>
                <form
                  onSubmit={handleImagingSubmit}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                      <Plus className="w-4 h-4" /> Rekam Hasil Imaging Aorta Baru
                    </span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="date"
                        value={imagingDateStr}
                        onChange={(e) => setImagingDateStr(e.target.value)}
                        className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Modality Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Modalitas Pemeriksaan Imaging
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['CTA', 'ECHO', 'XRAY', 'MRI'] as ImagingModality[]).map((mod) => {
                        const isSelected = imagingModality === mod;
                        const labelMap: Record<ImagingModality, string> = {
                          CTA: 'CTA Aorta (CT Angio)',
                          ECHO: 'Ekokardiografi (Echo)',
                          XRAY: 'Rontgen Dada (X-Ray)',
                          MRI: 'MRA / MRI Aorta'
                        };
                        return (
                          <button
                            key={mod}
                            type="button"
                            onClick={() => setImagingModality(mod)}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                                : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-purple-300'
                            }`}
                          >
                            <span className="text-xs font-black block">{mod}</span>
                            <span className="text-[9px] opacity-80 block truncate">{labelMap[mod]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Segmental Diameters Grid (mm) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Pengukuran Diameter Segmen Aorta (Satuan Milimeter / mm)
                      </label>
                      <span className="text-[9px] text-slate-400 font-mono">LOINC &amp; UCUM mm</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {/* Root */}
                      <div className="bg-white dark:bg-slate-700/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-600 dark:text-slate-300">
                          <span>Pangkal Aorta (Root)</span>
                          <span className="font-mono text-slate-400">18015-8</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Contoh: 32"
                            value={rootDiameter}
                            onChange={(e) => setRootDiameter(e.target.value)}
                            className="w-full text-base font-black text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">mm</span>
                        </div>
                      </div>

                      {/* Ascending */}
                      <div className="bg-white dark:bg-slate-700/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-600 dark:text-slate-300">
                          <span>Aorta Asendens</span>
                          <span className="font-mono text-slate-400">79549-2</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Contoh: 36"
                            value={ascendingDiameter}
                            onChange={(e) => setAscendingDiameter(e.target.value)}
                            className="w-full text-base font-black text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">mm</span>
                        </div>
                      </div>

                      {/* Arch */}
                      <div className="bg-white dark:bg-slate-700/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-600 dark:text-slate-300">
                          <span>Arcus Aorta</span>
                          <span className="font-mono text-slate-400">79547-6</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Contoh: 28"
                            value={archDiameter}
                            onChange={(e) => setArchDiameter(e.target.value)}
                            className="w-full text-base font-black text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">mm</span>
                        </div>
                      </div>

                      {/* Descending */}
                      <div className="bg-white dark:bg-slate-700/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-600 dark:text-slate-300">
                          <span>Aorta Desendens</span>
                          <span className="font-mono text-slate-400">79546-8</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Contoh: 26"
                            value={descendingDiameter}
                            onChange={(e) => setDescendingDiameter(e.target.value)}
                            className="w-full text-base font-black text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">mm</span>
                        </div>
                      </div>

                      {/* Abdominal */}
                      <div className="bg-white dark:bg-slate-700/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-600 dark:text-slate-300">
                          <span>Aorta Abdominalis</span>
                          <span className="font-mono text-slate-400">79548-4</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <input
                            type="number"
                            step="0.1"
                            placeholder="Contoh: 20"
                            value={abdominalDiameter}
                            onChange={(e) => setAbdominalDiameter(e.target.value)}
                            className="w-full text-base font-black text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 font-bold">mm</span>
                        </div>
                      </div>

                      {/* Max Diameter */}
                      <div className="bg-purple-50 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-200 dark:border-purple-900 space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-bold text-purple-700 dark:text-purple-300">
                          <span>Diameter Maksimum</span>
                          <span className="font-mono text-purple-400">93656-7</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <input
                            type="number"
                            step="0.1"
                            placeholder={autoMax > 0 ? String(autoMax) : 'Otomatis'}
                            value={manualMaxDiameter}
                            onChange={(e) => setManualMaxDiameter(e.target.value)}
                            className="w-full text-base font-black text-purple-900 dark:text-purple-100 bg-transparent focus:outline-none placeholder:text-purple-400"
                          />
                          <span className="text-[10px] text-purple-500 font-bold">mm</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Diameter Risk Assessment Card */}
                  <div className={`p-3 rounded-2xl ${classification.badgeClass} flex items-start gap-3`}>
                    <div className="mt-0.5">
                      {classification.category === 'severe' || classification.category === 'aneurysm' ? (
                        <ShieldAlert className="w-5 h-5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-black block">{classification.label}</span>
                      <p className="text-[11px] leading-relaxed opacity-90">{classification.description}</p>
                    </div>
                  </div>

                  {/* Radiology Conclusion & Findings */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Kesimpulan Radiologi (Impression / Conclusion)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Ektasia aorta asendens kaliber 38 mm tanpa diseksi aktif..."
                        value={imagingConclusion}
                        onChange={(e) => setImagingConclusion(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Temuan Radiologi Lengkap (Findings Details)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Catatan temuan radiologis tambahan..."
                        value={imagingFindings}
                        onChange={(e) => setImagingFindings(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="hallmark-button-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-4 h-4" />
                    {isSubmitting ? 'Menyimpan...' : 'Simpan Laporan Imaging Aorta'}
                  </button>
                </form>

                {/* Imaging Reports History List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Riwayat Laporan Radiologi &amp; Imaging Aorta
                  </h4>

                  {!diagnosticReports || diagnosticReports.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400">
                      Belum ada laporan imaging aorta. Masukkan hasil CTA, Echo, atau X-Ray di atas.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {diagnosticReports.map((report) => {
                        const maxMm = report.measurements?.maxDiameterMm;
                        const reportClassification = getAortaDiameterClassification(maxMm);

                        return (
                          <div
                            key={report.id}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-600 text-white">
                                  {report.modality}
                                </span>
                                <span className="text-[11px] font-bold text-slate-500">
                                  {format(new Date(report.effectiveDateTime), 'dd MMM yyyy, HH:mm')}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {maxMm && (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[9px] font-black ${reportClassification.badgeClass}`}
                                  >
                                    Maks: {maxMm} mm
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReport(report.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Segment Breakdown */}
                            {report.measurements && (
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1 text-[10px]">
                                {report.measurements.rootDiameterMm !== undefined && (
                                  <div className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5">
                                    <span className="text-slate-400 block text-[8px]">Root:</span>
                                    <strong className="text-slate-700 dark:text-slate-200">
                                      {report.measurements.rootDiameterMm} mm
                                    </strong>
                                  </div>
                                )}
                                {report.measurements.ascendingAortaMm !== undefined && (
                                  <div className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5">
                                    <span className="text-slate-400 block text-[8px]">Asendens:</span>
                                    <strong className="text-slate-700 dark:text-slate-200">
                                      {report.measurements.ascendingAortaMm} mm
                                    </strong>
                                  </div>
                                )}
                                {report.measurements.aorticArchMm !== undefined && (
                                  <div className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5">
                                    <span className="text-slate-400 block text-[8px]">Arcus:</span>
                                    <strong className="text-slate-700 dark:text-slate-200">
                                      {report.measurements.aorticArchMm} mm
                                    </strong>
                                  </div>
                                )}
                                {report.measurements.descendingAortaMm !== undefined && (
                                  <div className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5">
                                    <span className="text-slate-400 block text-[8px]">Desendens:</span>
                                    <strong className="text-slate-700 dark:text-slate-200">
                                      {report.measurements.descendingAortaMm} mm
                                    </strong>
                                  </div>
                                )}
                                {report.measurements.abdominalAortaMm !== undefined && (
                                  <div className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5">
                                    <span className="text-slate-400 block text-[8px]">Abdominal:</span>
                                    <strong className="text-slate-700 dark:text-slate-200">
                                      {report.measurements.abdominalAortaMm} mm
                                    </strong>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Conclusion */}
                            {report.conclusion && (
                              <div className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 text-[11px] text-slate-800 dark:text-slate-200">
                                <span className="font-bold text-purple-600 dark:text-purple-400 block text-[9px] uppercase">
                                  Kesimpulan:
                                </span>
                                {report.conclusion}
                              </div>
                            )}

                            {report.findings && (
                              <p className="text-[10px] text-slate-400 italic px-1">{report.findings}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
