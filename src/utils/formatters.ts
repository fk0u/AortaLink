import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export function formatDateIndonesian(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (isToday(date)) {
      return `Hari ini, ${format(date, 'HH:mm', { locale: idLocale })}`;
    }
    if (isYesterday(date)) {
      return `Kemarin, ${format(date, 'HH:mm', { locale: idLocale })}`;
    }
    return format(date, 'd MMMM yyyy, HH:mm', { locale: idLocale });
  } catch (error) {
    return dateString;
  }
}

export function formatDateShort(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'd MMM yyyy', { locale: idLocale });
  } catch (error) {
    return dateString;
  }
}

export function formatTimeOnly(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'HH:mm', { locale: idLocale });
  } catch (error) {
    return dateString;
  }
}

import { timeService } from '../services/time/time-service';

export function getRelationshipLabel(rel: string): string {
  switch (rel) {
    case 'self': return 'Saya';
    case 'parent': return 'Orang Tua';
    case 'spouse': return 'Pasangan';
    case 'child': return 'Anak';
    default: return 'Keluarga / Lainnya';
  }
}

/**
 * Format a Date object or ISO string into a local 'YYYY-MM-DDTHH:mm' string
 * for <input type="datetime-local" /> in WITA / GMT+8.
 */
export function getLocalDateTimeForInput(d?: Date | string): string {
  return timeService.getLocalDateTimeString(d);
}

/**
 * Format a Date object or ISO string into a local 'YYYY-MM-DD' string
 * for <input type="date" /> in WITA / GMT+8.
 */
export function getLocalDateForInput(d?: Date | string): string {
  return timeService.getLocalDateString(d);
}

/**
 * Parses a 'YYYY-MM-DDTHH:mm' input value into a valid ISO string with timezone.
 */
export function parseLocalDateTimeInput(val: string): string {
  return timeService.parseLocalInputToIso(val);
}
