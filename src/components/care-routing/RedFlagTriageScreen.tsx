import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, AlertTriangle, Activity, MapPin } from '../icons/AppIcons.tsx';
import { AORTIC_RED_FLAGS } from '../../services/care-routing/red-flag-rules';
import { evaluateRedFlags, evaluateBPRouting } from '../../services/care-routing/care-routing-engine';
import { CareRouteDecision } from '../../types/care-routing';

interface RedFlagTriageScreenProps {
  onClose?: () => void;
  latestSystolic?: number;
  latestDiastolic?: number;
}

export function RedFlagTriageScreen({ onClose, latestSystolic, latestDiastolic }: RedFlagTriageScreenProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());

  const toggleSymptom = (id: string) => {
    const newSelected = new Set(selectedSymptoms);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSymptoms(newSelected);
  };

  const hasSymptoms = selectedSymptoms.size > 0;
  
  let decision: CareRouteDecision | null = null;
  
  if (hasSymptoms) {
    decision = evaluateRedFlags(Array.from(selectedSymptoms));
  } else if (latestSystolic && latestDiastolic) {
    decision = evaluateBPRouting(latestSystolic, latestDiastolic, false);
  }

  const isEmergency = decision?.level === 'EMERGENCY';
  const isUrgent = decision?.level === 'URGENT';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      <div className="bg-red-600 dark:bg-red-700 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" />
          <h1 className="text-xl font-bold">Skrining Gejala Darurat</h1>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white hover:bg-red-800 p-2 rounded-full transition-colors">
            Tutup
          </button>
        )}
      </div>

      <div className="p-4 flex-1 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Apakah Anda mengalami gejala berikut saat ini?
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Pilih semua yang sesuai. Gejala-gejala ini membutuhkan evaluasi medis segera.
          </p>

          <div className="space-y-3">
            {AORTIC_RED_FLAGS.map((flag) => (
              <label 
                key={flag.id} 
                className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedSymptoms.has(flag.id) 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                    checked={selectedSymptoms.has(flag.id)}
                    onChange={() => toggleSymptom(flag.id)}
                  />
                </div>
                <div className="ml-3">
                  <span className="block text-base font-medium text-gray-900 dark:text-gray-100">
                    {flag.label}
                  </span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {flag.description}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {decision && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-xl border ${
              isEmergency 
                ? 'bg-red-100 border-red-500 dark:bg-red-900/40 dark:border-red-700' 
                : isUrgent 
                  ? 'bg-orange-100 border-orange-500 dark:bg-orange-900/40 dark:border-orange-700'
                  : 'bg-blue-100 border-blue-500 dark:bg-blue-900/40 dark:border-blue-700'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <Activity className={`w-6 h-6 ${isEmergency ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-blue-600'}`} />
              <h3 className={`text-lg font-bold ${isEmergency ? 'text-red-800 dark:text-red-200' : isUrgent ? 'text-orange-800 dark:text-orange-200' : 'text-blue-800 dark:text-blue-200'}`}>
                Rekomendasi Tindakan: {decision.level}
              </h3>
            </div>
            
            <p className="text-gray-800 dark:text-gray-200 text-lg mb-2 font-medium">
              {decision.action}
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
              {decision.description} <br />
              <span className="italic opacity-80 text-xs mt-1 block">Sumber: {decision.guidelineRef}</span>
            </p>

            {isEmergency && (
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <a 
                  href="tel:119" 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  Hubungi 119 (Ambulans)
                </a>
                <a 
                  href="https://maps.google.com/?q=IGD+rumah+sakit+terdekat" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex-1 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-gray-700 py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                  Cari IGD Terdekat
                </a>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
