import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppStore } from '../store/useAppStore';
import { useProfiles } from './useProfiles';
import { BPReading, BPSummaryStats, BPCategoryKey } from '../types/blood-pressure';
import { classifyBP, calculateMAP, calculatePulsePressure } from '../utils/bp-classifier';
import { parseISO, subDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export function useReadings() {
  const activeProfileId = useAppStore((state) => state.activeProfileId);
  const dateFilter = useAppStore((state) => state.dateFilter);
  const customStartDate = useAppStore((state) => state.customStartDate);
  const customEndDate = useAppStore((state) => state.customEndDate);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const categoryFilter = useAppStore((state) => state.categoryFilter);

  const { activeProfile } = useProfiles();

  // Fetch all readings for active profile using Dexie's live reactive query
  const liveReadings = useLiveQuery(
    async () => {
      if (!activeProfileId) return [];
      return await db.readings
        .where('profileId')
        .equals(activeProfileId)
        .reverse()
        .sortBy('timestamp');
    },
    [activeProfileId]
  );

  const rawReadings = liveReadings || [];
  const isLoading = liveReadings === undefined;
  const refetch = async () => {};

  // Filtered readings based on store filters
  const filteredReadings = useMemo(() => {
    let result = [...rawReadings];

    // 1. Date filter
    const now = new Date();
    if (dateFilter === '7days') {
      const cutoff = startOfDay(subDays(now, 7));
      result = result.filter((r) => isAfter(parseISO(r.timestamp), cutoff));
    } else if (dateFilter === '30days') {
      const cutoff = startOfDay(subDays(now, 30));
      result = result.filter((r) => isAfter(parseISO(r.timestamp), cutoff));
    } else if (dateFilter === '90days') {
      const cutoff = startOfDay(subDays(now, 90));
      result = result.filter((r) => isAfter(parseISO(r.timestamp), cutoff));
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = startOfDay(parseISO(customStartDate));
      const end = endOfDay(parseISO(customEndDate));
      result = result.filter((r) => {
        const date = parseISO(r.timestamp);
        return isAfter(date, start) && isBefore(date, end);
      });
    }

    // 2. Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((r) => classifyBP(r.systolic, r.diastolic, activeProfile?.guidelinePreference).key === categoryFilter);
    }

    // 3. Search query (tags or notes)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const notesMatch = r.notes?.toLowerCase().includes(q);
        const tagsMatch = r.tags?.some((t) => t.toLowerCase().includes(q));
        const numMatch = `${r.systolic}/${r.diastolic}`.includes(q);
        return notesMatch || tagsMatch || numMatch;
      });
    }

    return result;
  }, [rawReadings, dateFilter, customStartDate, customEndDate, categoryFilter, searchQuery]);

  // Compute summary statistics including MAP, Pulse Pressure, and Target Compliance
  const stats: BPSummaryStats = useMemo(() => {
    if (filteredReadings.length === 0) {
      return {
        totalReadings: 0,
        avgSystolic: 0,
        avgDiastolic: 0,
        avgPulse: 0,
        avgMAP: 0,
        avgPulsePressure: 0,
        targetComplianceRate: 0,
        maxSystolic: 0,
        minSystolic: 0,
        maxDiastolic: 0,
        minDiastolic: 0,
        categoryCounts: { optimal: 0, normal: 0, elevated: 0, stage1: 0, stage2: 0, stage3: 0, crisis: 0 },
        mostFrequentCategory: 'normal'
      };
    }

    const statReadings = filteredReadings.filter((r) => !r.isExcludedFromAverages);
    const avgTotal = statReadings.length;

    let sumSys = 0;
    let sumDia = 0;
    let sumPulse = 0;
    let pulseCount = 0;
    let sumMAP = 0;
    let sumPP = 0;
    let compliantCount = 0;

    let maxSys = -Infinity;
    let minSys = Infinity;
    let maxDia = -Infinity;
    let minDia = Infinity;

    const targetSys = activeProfile?.targetSystolic || 120;
    const targetDia = activeProfile?.targetDiastolic || 80;

    const counts: Record<BPCategoryKey, number> = {
      optimal: 0,
      normal: 0,
      elevated: 0,
      stage1: 0,
      stage2: 0,
      stage3: 0,
      crisis: 0
    };

    filteredReadings.forEach((r) => {
      if (r.systolic <= targetSys && r.diastolic <= targetDia) {
        compliantCount++;
      }

      if (r.systolic > maxSys) maxSys = r.systolic;
      if (r.systolic < minSys) minSys = r.systolic;
      if (r.diastolic > maxDia) maxDia = r.diastolic;
      if (r.diastolic < minDia) minDia = r.diastolic;

      const category = classifyBP(r.systolic, r.diastolic, activeProfile?.guidelinePreference).key;
      counts[category]++;
    });

    statReadings.forEach((r) => {
      sumSys += r.systolic;
      sumDia += r.diastolic;
      if (typeof r.pulse === 'number' && !isNaN(r.pulse)) {
        sumPulse += r.pulse;
        pulseCount++;
      }
      sumMAP += calculateMAP(r.systolic, r.diastolic);
      sumPP += calculatePulsePressure(r.systolic, r.diastolic);
    });

    const total = filteredReadings.length;
    let maxCount = -1;
    let mostFreq: BPCategoryKey = 'normal';
    (Object.keys(counts) as BPCategoryKey[]).forEach((cat) => {
      if (counts[cat] > maxCount) {
        maxCount = counts[cat];
        mostFreq = cat;
      }
    });

    return {
      totalReadings: total,
      avgSystolic: avgTotal > 0 ? Math.round(sumSys / avgTotal) : 0,
      avgDiastolic: avgTotal > 0 ? Math.round(sumDia / avgTotal) : 0,
      avgPulse: pulseCount > 0 ? Math.round(sumPulse / pulseCount) : 0,
      avgMAP: avgTotal > 0 ? Math.round(sumMAP / avgTotal) : 0,
      avgPulsePressure: avgTotal > 0 ? Math.round(sumPP / avgTotal) : 0,
      targetComplianceRate: Math.round((compliantCount / total) * 100),
      maxSystolic: maxSys,
      minSystolic: minSys,
      maxDiastolic: maxDia,
      minDiastolic: minDia,
      latestReading: filteredReadings[0],
      categoryCounts: counts,
      mostFrequentCategory: mostFreq
    };
  }, [filteredReadings, activeProfile]);

  return {
    rawReadings,
    readings: filteredReadings,
    stats,
    hasData: filteredReadings.length > 0,
    isLoading,
    refetch
  };
}
