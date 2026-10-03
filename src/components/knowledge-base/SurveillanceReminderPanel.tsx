import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, Activity, Calendar as CalendarIcon, ChevronRight } from '../icons/AppIcons.tsx';
import { db } from '../../db';
import { KnowledgeBaseService } from '../../services/knowledge-base/knowledge-base-service';
import { SurveillanceSchedule } from '../../types/knowledge-base';

interface SurveillanceReminderPanelProps {
  condition: 'taa' | 'aaa' | 'post_dissection';
  onViewDetails?: () => void;
}

export const SurveillanceReminderPanel: React.FC<SurveillanceReminderPanelProps> = ({ 
  condition,
  onViewDetails 
}) => {
  const [schedule, setSchedule] = useState<SurveillanceSchedule | null>(null);
  const [latestReportDate, setLatestReportDate] = useState<Date | null>(null);
  const [latestDiameter, setLatestDiameter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSurveillanceData = async () => {
      try {
        setLoading(true);
        // Get schedule from KB service
        const sched = KnowledgeBaseService.getSurveillanceSchedule(condition);
        if (sched) setSchedule(sched);

        // Fetch latest imaging report from Dexie DB
        const reports = await db.diagnosticReports
          .where('category')
          .equals('Imaging')
          .reverse()
          .sortBy('effectiveDateTime');
        
        if (reports.length > 0) {
          const latest = reports[0];
          setLatestReportDate(new Date(latest.effectiveDateTime));
          
          // Try to extract diameter if it exists in conclusion or observations
          // This is a simplified extraction for demonstration
          if (latest.conclusion) {
            const match = latest.conclusion.match(/(\d+\.?\d*)\s*(cm|mm)/i);
            if (match) {
              let val = parseFloat(match[1]);
              if (match[2].toLowerCase() === 'mm') val = val / 10; // convert to cm
              setLatestDiameter(val);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching surveillance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSurveillanceData();
  }, [condition]);

  if (loading) {
    return <div className="animate-pulse bg-gray-100 dark:bg-gray-800 h-24 rounded-xl"></div>;
  }

  if (!schedule) return null;

  // Calculate next due date
  let nextDueDate = null;
  let isOverdue = false;
  let daysRemaining = 0;

  if (latestReportDate) {
    nextDueDate = new Date(latestReportDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + schedule.intervalMonths);
    
    const today = new Date();
    const diffTime = nextDueDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isOverdue = daysRemaining < 0;
  } else {
    // If no past reports, they need one now
    isOverdue = true;
  }

  const conditionNames = {
    taa: 'Aneurisma Aorta Torakalis (TAA)',
    aaa: 'Aneurisma Aorta Abdominalis (AAA)',
    post_dissection: 'Pasca-Diseksi Aorta'
  };

  return (
    <div className={`rounded-xl p-4 border ${isOverdue ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/30' : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/30'} mb-6`}>
      <div className="flex items-start justify-between">
        <div className="flex gap-3">
          <div className={`mt-1 p-2 rounded-full ${isOverdue ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'}`}>
            {isOverdue ? <AlertTriangle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          <div>
            <h3 className={`font-semibold ${isOverdue ? 'text-red-800 dark:text-red-300' : 'text-blue-800 dark:text-blue-300'}`}>
              Pengingat Surveilans {conditionNames[condition]}
            </h3>
            
            <div className="mt-2 space-y-2 text-sm">
              {latestReportDate ? (
                <>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <CalendarIcon className="w-4 h-4 text-gray-500" />
                    Jadwal berikutnya: <span className="font-medium">{nextDueDate?.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  {isOverdue ? (
                    <p className="text-red-600 dark:text-red-400 font-medium text-xs">
                      Terlambat {Math.abs(daysRemaining)} hari. Segera jadwalkan {schedule.modality}.
                    </p>
                  ) : (
                    <p className="text-blue-600 dark:text-blue-400 font-medium text-xs">
                      Dalam {daysRemaining} hari ({schedule.modality})
                    </p>
                  )}
                  
                  {latestDiameter && (
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mt-1">
                      <Activity className="w-4 h-4 text-gray-500" />
                      Diameter terakhir: <span className="font-bold">{latestDiameter} cm</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-red-600 dark:text-red-400 font-medium">
                  Belum ada data pencitraan ({schedule.modality}). Segera konsultasikan dengan dokter Anda.
                </p>
              )}
              
              <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-gray-800/60 p-2 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                <strong>Pedoman Klinis:</strong> Interval rutin {schedule.intervalMonths} bulan. {schedule.notes}
              </div>
            </div>
          </div>
        </div>
        
        {onViewDetails && (
          <button 
            onClick={onViewDetails}
            className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${isOverdue ? 'text-red-700 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'}`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
