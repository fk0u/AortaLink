/**
 * HeartSync Push Notification Service
 * Manages Web Push API local notifications for measurement & medication reminders.
 * Uses Notification API + Service Worker for offline-first local notifications.
 */
import { db } from '../../db';

// ---- Types ----
export interface NotificationSchedule {
  reminderId: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

interface ReminderRecord {
  id?: number;
  profileId: string;
  title: string;
  type: 'measurement' | 'medication';
  time: string;
  days: number[];
  enabled: boolean;
  dosage?: string;
}

// ---- State ----
let scheduledNotifications: Map<number, ReturnType<typeof setTimeout>> = new Map();
let permissionGranted = false;
let notificationEnabled = false;

// ---- Helpers ----

/** Check if the browser supports notifications */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/** Request notification permission and return status */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    permissionGranted = true;
    // Load persisted preference
    const stored = localStorage.getItem('heartsync-notifications-enabled');
    notificationEnabled = stored !== 'false'; // default true on first grant
    saveNotificationPreference();
  }
  return permission;
}

/** Get current notification permission status */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

/** Check if notifications are both permitted and enabled by user */
export function areNotificationsActive(): boolean {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  const stored = localStorage.getItem('heartsync-notifications-enabled');
  return stored !== 'false';
}

/** Set notification preference (toggle) */
export function setNotificationEnabled(enabled: boolean): void {
  notificationEnabled = enabled;
  saveNotificationPreference();

  if (enabled) {
    syncAllReminders();
  } else {
    cancelAllScheduledNotifications();
  }
}

function saveNotificationPreference(): void {
  localStorage.setItem('heartsync-notifications-enabled', String(notificationEnabled));
}

/** Load notification preference from storage */
export function loadNotificationPreference(): boolean {
  const stored = localStorage.getItem('heartsync-notifications-enabled');
  if (stored === null) {
    // First time: default to enabled if permission is granted
    notificationEnabled = Notification.permission === 'granted';
    saveNotificationPreference();
    return notificationEnabled;
  }
  notificationEnabled = stored !== 'false';
  return notificationEnabled;
}

// ---- Local Notification ----

/** Send a local notification immediately via the Notification API */
export async function sendLocalNotification(
  title: string,
  body: string,
  icon: string = '/favicon.svg',
  tag: string = 'heartsync-reminder'
): Promise<boolean> {
  if (!areNotificationsActive()) return false;

  try {
    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon,
        badge: '/favicon.svg',
        tag,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: {
          url: '/reminders',
          timestamp: Date.now(),
        },
      } as NotificationOptions & { vibrate?: number[] });
      return true;
    }
  } catch (err) {
    console.error('[HeartSync] Failed to send local notification:', err);
  }

  return false;
}

// ---- Reminder Scheduling ----

/**
 * Calculate milliseconds until the next occurrence of a given time (HH:mm).
 * Returns ms from now until the next matching time.
 */
function msUntilNextTime(timeStr: string, days: number[]): number {
  const now = new Date();
  const [hours, minutes] = timeStr.split(':').map(Number);
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);

  // If target time already passed today, move to tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  // Find the next valid day
  let daysChecked = 0;
  while (daysChecked < 8 && !days.includes(target.getDay())) {
    target.setDate(target.getDate() + 1);
    daysChecked++;
  }

  // If no valid day found within a week, fallback to tomorrow
  if (daysChecked >= 8) {
    target.setTime(now.getTime());
    target.setDate(target.getDate() + 1);
    target.setHours(hours, minutes, 0, 0);
  }

  return target.getTime() - now.getTime();
}

/** Schedule a single reminder for notification */
export function scheduleReminder(reminder: ReminderRecord): void {
  if (!notificationEnabled) return;
  if (!reminder.enabled) return;

  // Cancel existing schedule for this reminder
  cancelScheduledNotification(reminder.id!);

  const delay = msUntilNextTime(reminder.time, reminder.days);
  if (delay <= 0) return;

  const timeoutId = setTimeout(() => {
    const notifTitle =
      reminder.type === 'medication'
        ? `💊 ${reminder.title}`
        : `🩺 ${reminder.title}`;

    const dosageInfo = reminder.dosage ? ` — Dosis: ${reminder.dosage}` : '';
    const notifBody =
      reminder.type === 'medication'
        ? `Waktunya minum obat${dosageInfo}. Jaga kesehatan Anda tetap prima!`
        : `Waktunya mengukur tekanan darah. Istirahat 5 menit sebelum pengukuran.`;

    sendLocalNotification(notifTitle, notifBody);

    // Re-schedule for next occurrence
    scheduleReminder(reminder);
  }, delay);

  scheduledNotifications.set(reminder.id!, timeoutId);
}

/** Cancel a single scheduled notification */
export function cancelScheduledNotification(reminderId: number): void {
  const existing = scheduledNotifications.get(reminderId);
  if (existing) {
    clearTimeout(existing);
    scheduledNotifications.delete(reminderId);
  }
}

/** Cancel all scheduled notifications */
export function cancelAllScheduledNotifications(): void {
  scheduledNotifications.forEach((timeoutId) => clearTimeout(timeoutId));
  scheduledNotifications.clear();
}

/** Sync all enabled reminders from the database and schedule them */
export async function syncAllReminders(): Promise<void> {
  if (!notificationEnabled) return;

  try {
    const allReminders = await db.reminders.toArray();
    const enabledReminders = allReminders.filter((r) => r.enabled);

    // Cancel all existing schedules
    cancelAllScheduledNotifications();

    // Schedule each enabled reminder
    for (const reminder of enabledReminders) {
      if (reminder.id) {
        scheduleReminder(reminder as ReminderRecord);
      }
    }
  } catch (err) {
    console.error('[HeartSync] Failed to sync reminders for notifications:', err);
  }
}

/** Schedule a test notification (fires after 3 seconds) */
export async function sendTestNotification(): Promise<boolean> {
  return sendLocalNotification(
    '🔔 HeartSync Pengingat Aktif',
    'Notifikasi pengingat tensi & obat berhasil diaktifkan di perangkat Anda!',
    '/favicon.svg'
  );
}

/** Initialize the notification service on app startup */
export async function initializeNotificationService(): Promise<void> {
  if (!isNotificationSupported()) return;

  // Load saved preference
  loadNotificationPreference();

  // If permission is already granted and notifications enabled, sync reminders
  if (Notification.permission === 'granted' && notificationEnabled) {
    await syncAllReminders();
  }
}
