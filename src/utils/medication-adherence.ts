import { MedicationItem, MedicationLog } from '../types/blood-pressure';
import { parseISO, startOfDay, eachDayOfInterval, isWithinInterval, subDays, format } from 'date-fns';

export interface MedicationAdherenceResult {
  adherencePercent: number;
  totalExpectedDoses: number;
  totalTakenDoses: number;
  missedDoses: MissedDose[];
  streak: number; // consecutive days with full adherence
  riskLevel: 'patuh' | 'kurang_patuh' | 'tidak_patuh';
  riskLabel: string;
  riskDescription: string;
}

export interface MissedDose {
  date: string;       // YYYY-MM-DD
  medicationName: string;
  schedule: string;   // pagi / malam / pagi_malam
}

/**
 * Calculate Medication Adherence Score
 * 
 * Formula: (jumlah dosis diminum / total dosis seharusnya) × 100%
 * 
 * Skor kepatuhan:
 * - ≥ 80%: Patuh (hijau)
 * - 50-79%: Kurang Patuh (kuning)
 * - < 50%: Tidak Patuh (merah)
 */
export function calculateMedicationAdherence(
  medications: MedicationItem[],
  logs: MedicationLog[],
  rangeDays: number = 30
): MedicationAdherenceResult {
  if (medications.length === 0) {
    return {
      adherencePercent: 0,
      totalExpectedDoses: 0,
      totalTakenDoses: 0,
      missedDoses: [],
      streak: 0,
      riskLevel: 'patuh',
      riskLabel: 'Tidak Ada Obat',
      riskDescription: 'Belum ada obat yang terdaftar.'
    };
  }

  const now = new Date();
  const startDate = subDays(startOfDay(now), rangeDays - 1);
  const endDate = startOfDay(now);

  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  const missedDoses: MissedDose[] = [];

  // Calculate expected daily doses per medication
  let totalExpected = 0;
  let totalTaken = 0;

  // For each day in the range, check if medication was taken
  for (const day of allDays) {
    const dayStr = format(day, 'yyyy-MM-dd');

    for (const med of medications) {
      // How many doses per day based on schedule
      const dosesPerDay = med.schedule === 'pagi_malam' ? 2 : 1;
      totalExpected += dosesPerDay;

      // Count logs for this medication on this day
      const dayLogs = logs.filter((log) => {
        if (log.medicationId !== undefined && log.medicationId === med.id) {
          // Match by medicationId
          const logDate = log.takenAt ? format(parseISO(log.takenAt), 'yyyy-MM-dd') : log.date;
          return logDate === dayStr;
        }
        if (log.medicationName && log.medicationName === med.name) {
          // Match by name fallback
          const logDate = log.takenAt ? format(parseISO(log.takenAt), 'yyyy-MM-dd') : log.date;
          return logDate === dayStr;
        }
        return false;
      });

      const takenCount = dayLogs.reduce((acc, l) => acc + (l.takenCount || 1), 0);
      const actualTaken = Math.min(takenCount, dosesPerDay);
      totalTaken += actualTaken;

      if (actualTaken < dosesPerDay) {
        missedDoses.push({
          date: dayStr,
          medicationName: med.name,
          schedule: med.schedule
        });
      }
    }
  }

  // Calculate adherence percentage
  const adherencePercent = totalExpected > 0
    ? Math.round((totalTaken / totalExpected) * 1000) / 10
    : 0;

  // Calculate consecutive day streak (count backward from today)
  let streak = 0;
  for (let i = allDays.length - 1; i >= 0; i--) {
    const dayStr = format(allDays[i], 'yyyy-MM-dd');
    const dayMissed = missedDoses.some((m) => m.date === dayStr);
    if (dayMissed) break;
    streak++;
  }

  // Risk classification
  let riskLevel: MedicationAdherenceResult['riskLevel'];
  let riskLabel: string;
  let riskDescription: string;

  if (adherencePercent >= 80) {
    riskLevel = 'patuh';
    riskLabel = 'Patuh';
    riskDescription = 'Tingkat kepatuhan konsumsi obat sangat baik (≥80%). Pertahankan kedisiplinan!';
  } else if (adherencePercent >= 50) {
    riskLevel = 'kurang_patuh';
    riskLabel = 'Kurang Patuh';
    riskDescription = 'Tingkat kepatuhan obat perlu ditingkatkan (50-80%). Obat antihipertensi harus diminum secara teratur untuk efektivitas maksimal.';
  } else {
    riskLevel = 'tidak_patuh';
    riskLabel = 'Tidak Patuh';
    riskDescription = 'PERINGATAN: Tingkat kepatuhan obat sangat rendah (<50%). Risiko lonjakan tensi dan komplikasi organ target meningkat signifikan.';
  }

  return {
    adherencePercent,
    totalExpectedDoses: totalExpected,
    totalTakenDoses: totalTaken,
    missedDoses: missedDoses.slice(-20), // Last 20 missed doses
    streak,
    riskLevel,
    riskLabel,
    riskDescription
  };
}
