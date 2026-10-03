import React, { useState } from 'react';
import { evaluateBPRouting } from '../../services/care-routing/care-routing-engine';
import { generateReferralRecommendations } from '../../services/care-routing/referral-rules';
import { AlertCircle, ArrowRight, HeartPulse, Stethoscope, AlertTriangle } from '../icons/AppIcons.tsx';
import { RedFlagTriageScreen } from './RedFlagTriageScreen';

interface CareRoutingPanelProps {
  latestSystolic: number | null;
  latestDiastolic: number | null;
  hasComorbidities?: boolean;
}

export function CareRoutingPanel({ 
  latestSystolic, 
  latestDiastolic, 
  hasComorbidities = false 
}: CareRoutingPanelProps) {
  const [showTriage, setShowTriage] = useState(false);

  if (!latestSystolic || !latestDiastolic) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Arahan Perawatan</h3>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Belum ada data tekanan darah.</p>
      </div>
    );
  }

  const routeDecision = evaluateBPRouting(latestSystolic, latestDiastolic, false);
  const recommendations = generateReferralRecommendations(latestSystolic, latestDiastolic, [], hasComorbidities);

  const isUrgent = routeDecision.level === 'URGENT' || routeDecision.level === 'EMERGENCY';
  
  return (
    <>
      <div className={`rounded-xl p-5 shadow-sm border ${
        isUrgent 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            {isUrgent ? (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            ) : (
              <HeartPulse className="w-5 h-5 text-blue-500" />
            )}
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Rekomendasi Perawatan</h3>
          </div>
          <button 
            onClick={() => setShowTriage(true)}
            className="text-xs bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 py-1.5 px-3 rounded-full font-medium transition-colors flex items-center gap-1"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Cek Gejala
          </button>
        </div>

        <div className="space-y-3">
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {routeDecision.action}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {routeDecision.description}
            </p>
          </div>

          {recommendations.map(rec => (
            <div key={rec.id} className="flex items-start gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
              <div className="mt-0.5 bg-blue-100 dark:bg-blue-900/50 p-1.5 rounded-full text-blue-600 dark:text-blue-400">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {rec.description}
                </p>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 dark:text-gray-500">
                  <span>Target: {rec.facilityType.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            </div>
          ))}
        </div>
      </div>

      {showTriage && (
        <RedFlagTriageScreen 
          onClose={() => setShowTriage(false)} 
          latestSystolic={latestSystolic}
          latestDiastolic={latestDiastolic}
        />
      )}
    </>
  );
}
