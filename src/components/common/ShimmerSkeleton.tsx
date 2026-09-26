import React from 'react';

export const ShimmerSkeletonCard: React.FC<{ type?: 'stats' | 'chart' | 'list' }> = ({ type = 'stats' }) => {
  return (
    <div className="hallmark-card p-5 space-y-4 animate-pulse bg-white dark:bg-[#1c1c1e] border border-slate-200/80 dark:border-white/10">
      {type === 'stats' && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-[#2c2c2e]" />
              <div className="h-3 w-28 bg-slate-200 dark:bg-[#2c2c2e] rounded-full" />
            </div>
            <div className="h-6 w-16 bg-slate-200 dark:bg-[#2c2c2e] rounded-full" />
          </div>
          <div className="h-10 w-44 bg-slate-200 dark:bg-[#2c2c2e] rounded-full" />
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-xl" />
            <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-xl" />
          </div>
        </>
      )}

      {type === 'chart' && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-[#2c2c2e]" />
              <div className="h-3.5 w-36 bg-slate-200 dark:bg-[#2c2c2e] rounded-full" />
            </div>
            <div className="h-7 w-28 bg-slate-200 dark:bg-[#2c2c2e] rounded-full" />
          </div>
          <div className="h-56 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-end justify-between p-4 gap-2">
            <div className="h-2/5 w-8 bg-slate-200 dark:bg-[#2c2c2e] rounded-lg" />
            <div className="h-3/5 w-8 bg-slate-200 dark:bg-[#2c2c2e] rounded-lg" />
            <div className="h-4/5 w-8 bg-slate-200 dark:bg-[#2c2c2e] rounded-lg" />
            <div className="h-1/2 w-8 bg-slate-200 dark:bg-[#2c2c2e] rounded-lg" />
            <div className="h-3/4 w-8 bg-slate-200 dark:bg-[#2c2c2e] rounded-lg" />
          </div>
        </>
      )}

      {type === 'list' && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-[#2c2c2e]" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-24 bg-slate-200 dark:bg-[#2c2c2e] rounded-full" />
                  <div className="h-3 w-36 bg-slate-200 dark:bg-[#2c2c2e] rounded-full" />
                </div>
              </div>
              <div className="h-8 w-16 bg-slate-200 dark:bg-[#2c2c2e] rounded-xl" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
