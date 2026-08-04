/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileCode, Copy, Check, ShieldCheck, Database, Layers } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useProfiles } from '../../hooks/useProfiles';
import { convertReadingToFHIR, convertLabResultToFHIR, convertMedicationToFHIR, exportReadingsToFHIRBundle } from '../../services/fhir/fhir-exporter';
import { useAppStore } from '../../store/useAppStore';

interface FhirResourceInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FhirResourceInspectorModal: React.FC<FhirResourceInspectorModalProps> = ({
  isOpen,
  onClose
}) => {
  const { activeProfileId, activeProfile } = useProfiles();
  const addToast = useAppStore((state) => state.addToast);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'bundle' | 'patient' | 'observations' | 'medications'>('bundle');

  const readings = useLiveQuery(
    () => (activeProfileId ? db.readings.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const labs = useLiveQuery(
    () => (activeProfileId ? db.labResults.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const medications = useLiveQuery(
    () => (activeProfileId ? db.medications.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const fhirBundle = exportReadingsToFHIRBundle(readings, activeProfile || undefined);
  const fhirPatient = {
    resourceType: 'Patient',
    id: activeProfileId || 'patient-default',
    meta: { profile: ['http://hl7.org/fhir/StructureDefinition/Patient'] },
    active: true,
    name: [{ use: 'official', text: activeProfile?.name || 'Pasien', family: 'User', given: ['AortaLink'] }]
  };
  const fhirObservations = [
    ...readings.map((r) => convertReadingToFHIR(r, activeProfile || undefined)),
    ...labs.flatMap((l) => convertLabResultToFHIR(l, activeProfile || undefined))
  ];
  const fhirMedRequests = medications.map((m) => convertMedicationToFHIR(m, activeProfile || undefined));

  const getCurrentJson = () => {
    switch (activeTab) {
      case 'bundle':
        return JSON.stringify(fhirBundle, null, 2);
      case 'patient':
        return JSON.stringify(fhirPatient, null, 2);
      case 'observations':
        return JSON.stringify(fhirObservations, null, 2);
      case 'medications':
        return JSON.stringify(fhirMedRequests, null, 2);
      default:
        return '';
    }
  };

  const handleCopyJson = () => {
    const jsonStr = getCurrentJson();
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    addToast({ type: 'success', title: 'FHIR JSON Disalin', message: 'Payload HL7 FHIR R4 disalin ke clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] sm:pb-4 bg-slate-950/80 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col text-slate-100"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-teal-500 text-white shadow-lg shadow-teal-500/20">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  Penjelajah Payload HL7 FHIR R4
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    Version R4
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Interoperabilitas Data Kesehatan Internasional (LOINC &amp; SMART on FHIR)
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Selection Navigation */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2 overflow-x-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('bundle')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'bundle' ? 'bg-teal-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              FHIR Bundle ({fhirBundle.entry.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('patient')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'patient' ? 'bg-teal-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Patient Resource
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('observations')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'observations' ? 'bg-teal-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Observations ({fhirObservations.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('medications')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'medications' ? 'bg-teal-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              MedicationRequests ({fhirMedRequests.length})
            </button>
          </div>

          {/* JSON Inspector Output Area */}
          <div className="p-4 flex-1 overflow-y-auto font-mono text-xs bg-slate-950/90 text-teal-300">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800 text-[11px] font-sans text-slate-400">
              <span>Standard: HL7 FHIR Release 4 (JSON-LD compatible)</span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin' : 'Salin JSON'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap break-all">{getCurrentJson()}</pre>
          </div>

          {/* Footer Note */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500 font-medium">
            AortaLink Open-Source EHR Platform • Compliance LOINC &amp; HL7 FHIR v4.0.1
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
