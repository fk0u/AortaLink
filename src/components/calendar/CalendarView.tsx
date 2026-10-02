import React, { useState } from 'react';
import { BPReading } from '../../types/blood-pressure';
import { classifyBP } from '../../utils/bp-classifier';
import { playClickSound, playSuccessChime } from '../../utils/audio-fx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Activity,
  Heart,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from '../icons/AppIcons';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface CalendarViewProps {
  readings: BPReading[];
  onSelectDateReadings?: (date: Date, dateReadings: BPReading[]) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ readings }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handlePrevMonth = () => {
    playClickSound();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    playClickSound();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Group readings by YYYY-MM-DD
  const readingsByDate: Record<string, BPReading[]> = {};
  readings.forEach((r) => {
    const key = format(new Date(r.timestamp), 'yyyy-MM-dd');
    if (!readingsByDate[key]) readingsByDate[key] = [];
    readingsByDate[key].push(r);
  });

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd');
  const selectedDayReadings = readingsByDate[selectedDateKey] || [];

  return (
    <div className="hallmark-card p-4 md:p-5 space-y-4 md:space-y-5">
      {/* Calendar Header & Month Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-slate-100 capitalize truncate">
              Kalender Kesehatan {format(currentMonth, 'MMMM yyyy', { locale: idLocale })}
            </h3>
            <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 leading-4">
              Navigasi bulan &amp; tanggal untuk meninjau riwayat tensi terdahulu
            </p>
          </div>
        </div>

        {/* Prev / Next Month Navigation Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setCurrentMonth(new Date());
              setSelectedDate(new Date());
            }}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all active:scale-95 min-h-11"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition-all flex items-center justify-center"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#2c2c2e] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition-all flex items-center justify-center"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Names Header */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((dayName) => (
          <div key={dayName} className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 py-1">
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1 md:gap-1.5">
        {days.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          const dayReadings = readingsByDate[dayKey] || [];
          const isCurrentMonthDay = isSameMonth(day, currentMonth);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDay = isToday(day);

          // Get worst category color dot for the day
          let dayBadgeColor = 'bg-slate-200 dark:bg-slate-700';
          let avgSys = 0;
          let avgDia = 0;

          if (dayReadings.length > 0) {
            avgSys = Math.round(dayReadings.reduce((sum, r) => sum + r.systolic, 0) / dayReadings.length);
            avgDia = Math.round(dayReadings.reduce((sum, r) => sum + r.diastolic, 0) / dayReadings.length);
            const category = classifyBP(avgSys, avgDia);
            dayBadgeColor = category.colorClass;
          }

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => {
                playClickSound();
                setSelectedDate(day);
              }}
              className={`p-2 rounded-2xl transition-all relative flex flex-col items-center justify-between min-h-[58px] border text-left active:scale-95 ${
                !isCurrentMonthDay
                  ? 'opacity-30 bg-slate-50/50 dark:bg-slate-900/30 border-transparent'
                  : isSelected
                  ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                  : isTodayDay
                  ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800'
                  : 'bg-slate-50/80 dark:bg-white/5 border-slate-200/60 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="w-full flex items-center justify-between">
                <span
                  className={`text-xs font-black ${
                    isTodayDay
                      ? 'text-sky-600 dark:text-sky-400'
                      : isSelected
                      ? 'text-teal-700 dark:text-teal-300'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayReadings.length > 0 && (
                  <span className={`w-2 h-2 rounded-full ${dayBadgeColor} animate-pulse`}></span>
                )}
              </div>

              {/* Day Readings Mini Badge */}
              {dayReadings.length > 0 ? (
                <div className="w-full mt-1">
                  <span className="text-[10px] font-black text-slate-900 dark:text-slate-100 block truncate">
                    {avgSys}/{avgDia}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-400 block">
                    {dayReadings.length} data
                  </span>
                </div>
              ) : (
                <span className="text-[9px] text-slate-300 dark:text-slate-600 font-medium">--</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Date Detail Drawer */}
      <div className="pt-4 border-t border-slate-100 dark:border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Riwayat Tanggal {format(selectedDate, 'dd MMMM yyyy', { locale: idLocale })}
          </h4>
          <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-2.5 py-0.5 rounded-full">
            {selectedDayReadings.length} Pengukuran
          </span>
        </div>

        {selectedDayReadings.length > 0 ? (
          <div className="space-y-2">
            {selectedDayReadings.map((r) => {
              const category = classifyBP(r.systolic, r.diastolic);
              return (
                <div
                  key={r.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-white/10 border border-slate-200/80 dark:border-white/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${category.colorClass}`}></div>
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {r.systolic} / {r.diastolic} <span className="text-xs font-normal text-slate-400">mmHg</span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(r.timestamp), 'HH:mm')} WIB</span>
                        {typeof r.pulse === 'number' && <span>• Nadi: {r.pulse} BPM</span>}
                      </div>
                    </div>
                  </div>

                  <span className={`hallmark-badge ${category.badgeClass} text-[10px]`}>
                    {category.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-white/5 text-center text-xs text-slate-400 font-semibold">
            Tidak ada pengukuran tensi yang dicatat pada tanggal ini.
          </div>
        )}
      </div>
    </div>
  );
};
