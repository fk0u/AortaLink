/* High-Precision Realtime Time & Timezone Service (WITA / Singapore / Kuala Lumpur GMT+8) */

export interface NetworkTimeStatus {
  source: 'internet' | 'device';
  timezone: string;
  timezoneOffsetHours: number;
  offsetMs: number;
  lastSyncedAt: Date | null;
}

class TimeService {
  private timezone: string = 'Asia/Singapore'; // Default WITA / Singapore / Kuala Lumpur (GMT+8)
  private offsetMs: number = 0;
  private isSynchronized: boolean = false;
  private lastSyncedAt: Date | null = null;
  private syncPromise: Promise<void> | null = null;

  constructor() {
    this.initSync();
  }

  /**
   * Initializes background internet time sync with fast fallback to device clock
   */
  public async initSync(): Promise<void> {
    if (this.syncPromise) return this.syncPromise;

    this.syncPromise = (async () => {
      // Try reliable multi-endpoints with silent failover
      const endpoints = [
        'https://timeapi.io/api/time/current/zone?timeZone=Asia/Singapore',
        'https://worldtimeapi.org/api/timezone/Asia/Singapore'
      ];

      for (const url of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);

          const res = await fetch(url, { signal: controller.signal }).catch(() => null);
          clearTimeout(timeoutId);

          if (res && res.ok) {
            const data = await res.json().catch(() => null);
            if (data) {
              const dtString = data.dateTime || data.datetime;
              if (dtString) {
                const serverDate = new Date(dtString);
                if (!isNaN(serverDate.getTime())) {
                  this.offsetMs = serverDate.getTime() - Date.now();
                  this.isSynchronized = true;
                  this.lastSyncedAt = new Date();
                  return;
                }
              }
            }
          }
        } catch {
          // Continue to next endpoint or device clock fallback
        }
      }

      this.isSynchronized = false;
    })();

    return this.syncPromise;
  }

  /**
   * Returns current Date object adjusted by any internet time offset
   */
  public getNow(): Date {
    return new Date(Date.now() + this.offsetMs);
  }

  /**
   * Get formatted datetime string (YYYY-MM-DDTHH:mm) in GMT+8 (WITA/Singapore) for <input type="datetime-local">
   */
  public getLocalDateTimeString(dateInput: Date | string = this.getNow()): string {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const target = isNaN(d.getTime()) ? this.getNow() : d;

    // Use Intl.DateTimeFormat with target timezone
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: this.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const parts = formatter.formatToParts(target);
      const map: Record<string, string> = {};
      parts.forEach((p) => {
        map[p.type] = p.value;
      });

      // Format: YYYY-MM-DDTHH:mm
      return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
    } catch {
      // Fallback manual GMT+8 calculation (UTC + 8 hours)
      const gmt8Time = new Date(target.getTime() + 8 * 3600 * 1000);
      const iso = gmt8Time.toISOString();
      return iso.slice(0, 16);
    }
  }

  /**
   * Get formatted date string (YYYY-MM-DD) in GMT+8 for <input type="date">
   */
  public getLocalDateString(dateInput: Date | string = this.getNow()): string {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const target = isNaN(d.getTime()) ? this.getNow() : d;

    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: this.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(target);
    } catch {
      const gmt8Time = new Date(target.getTime() + 8 * 3600 * 1000);
      return gmt8Time.toISOString().slice(0, 10);
    }
  }

  /**
   * Format time with WITA suffix (e.g. "23:22 WITA")
   */
  public formatTimeWithWITA(dateInput: Date | string = this.getNow()): string {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const target = isNaN(d.getTime()) ? this.getNow() : d;

    try {
      const formatter = new Intl.DateTimeFormat('id-ID', {
        timeZone: this.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      return `${formatter.format(target)} WITA`;
    } catch {
      const hours = String(target.getHours()).padStart(2, '0');
      const mins = String(target.getMinutes()).padStart(2, '0');
      return `${hours}:${mins} WITA`;
    }
  }

  /**
   * Parse local datetime input string (YYYY-MM-DDTHH:mm) into standard ISO string
   */
  public parseLocalInputToIso(val: string): string {
    try {
      if (!val) return this.getNow().toISOString();
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
      return this.getNow().toISOString();
    } catch {
      return this.getNow().toISOString();
    }
  }

  /**
   * Returns current sync status
   */
  public getStatus(): NetworkTimeStatus {
    return {
      source: this.isSynchronized ? 'internet' : 'device',
      timezone: this.timezone,
      timezoneOffsetHours: 8,
      offsetMs: this.offsetMs,
      lastSyncedAt: this.lastSyncedAt
    };
  }
}

export const timeService = new TimeService();
