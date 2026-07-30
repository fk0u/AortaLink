import React, { useEffect, useState } from 'react';
import { Trophy, Flame, Heart } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useProfiles } from '../../hooks/useProfiles';
import {
  getGamificationState,
  refreshGamification,
  BADGES,
  type GamificationState,
  type Badge,
} from '../../services/gamification/gamification-service';

export const StreakBadges: React.FC = () => {
  const { activeProfileId } = useProfiles();
  const cacheDirty = useAppStore((state) => state.isCacheDirty);
  const [gamification, setGamification] = useState<GamificationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!activeProfileId) return;
      try {
        const state = await refreshGamification(activeProfileId);
        if (mounted) setGamification(state);
      } catch (err) {
        console.error('[HeartSync] Failed to load gamification:', err);
        // Fallback to cached state
        try {
          const cached = await getGamificationState();
          if (mounted) setGamification(cached);
        } catch {
          // ignore
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [activeProfileId, cacheDirty]);

  if (isLoading || !gamification) {
    return (
      <div className="hallmark-card p-5 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-3" />
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  const { streak, longestStreak, score, earnedBadges } = gamification;

  // Map badge keys to badge objects
  const earnedBadgeObjects = BADGES.filter((b) => earnedBadges.includes(b.key));
  const lockedBadges = BADGES.filter((b) => !earnedBadges.includes(b.key));

  // Determine score color
  const scoreColor =
    score >= 80
      ? 'from-emerald-500 to-teal-500'
      : score >= 50
        ? 'from-amber-500 to-orange-500'
        : 'from-rose-500 to-red-500';

  return (
    <div className="hallmark-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20">
            <Trophy className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            Kesehatan Jantung
          </h3>
        </div>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
          Gamifikasi
        </span>
      </div>

      {/* Streak & Score Row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Streak Card */}
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800/50 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
              {streak}
            </span>
          </div>
          <p className="text-[10px] font-bold text-orange-600/70 dark:text-orange-400/70">
            Hari Berturut-turut
          </p>
          {longestStreak > streak && (
            <p className="text-[9px] text-orange-400 mt-0.5">
              Rekor: {longestStreak} hari
            </p>
          )}
        </div>

        {/* Heart Health Score */}
        <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-sky-50 dark:from-teal-950/30 dark:to-sky-950/20 border border-teal-200 dark:border-teal-800/50 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Heart className="w-5 h-5 text-teal-500" />
            <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
              {score}
            </span>
          </div>
          <p className="text-[10px] font-bold text-teal-600/70 dark:text-teal-400/70">
            Skor Kesehatan
          </p>
        </div>
      </div>

      {/* Score Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
            Progress Skor
          </span>
          <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300">
            {score}/100
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${scoreColor} transition-all duration-700 ease-out`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[9px] font-semibold text-slate-400 dark:text-slate-500">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      {/* Earned Badges */}
      {earnedBadgeObjects.length > 0 && (
        <div>
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Lencana Diperoleh ({earnedBadgeObjects.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {earnedBadgeObjects.map((badge) => (
              <div
                key={badge.key}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-950/50 dark:to-yellow-950/50 border border-amber-300 dark:border-amber-700/50 shadow-sm"
                title={badge.description}
              >
                <span className="text-lg">{badge.emoji}</span>
                <div className="text-left leading-tight">
                  <p className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300">
                    {badge.name}
                  </p>
                  <p className="text-[8px] text-amber-600/70 dark:text-amber-400/60">
                    {badge.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges (preview) */}
      {lockedBadges.length > 0 && (
        <div>
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Lencana Terkunci ({lockedBadges.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {lockedBadges.map((badge) => (
              <div
                key={badge.key}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 opacity-50"
                title={badge.description}
              >
                <span className="text-lg grayscale">🔒</span>
                <div className="text-left leading-tight">
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {badge.name}
                  </p>
                  <p className="text-[8px] text-slate-400 dark:text-slate-500">
                    {badge.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
