/**
 * Best-effort local reminders. A server-less web app can't guarantee exact-time
 * notifications while closed, so this layers:
 *  1. In-app banner (handled on the Home screen).
 *  2. While the app is open or backgrounded: timers that show a notification.
 *  3. Periodic Background Sync (installed PWA on Chrome/Android, when allowed):
 *     the service worker wakes occasionally and checks the schedule below.
 */
import type { Entry, Settings } from '../types';
import { dayKey, minutesOfDay, parseHM } from './dates';
import { completedSlotsToday, sortedSlots } from './slots';

export const REMINDER_CACHE = 'steady-reminders';
export const SCHEDULE_URL = './__steady/schedule.json';

export interface Schedule {
  enabled: boolean;
  slots: { name: string; time: string }[];
  done: { day: string; slots: string[] };
  notified?: { day: string; slots: string[] };
}

export const notificationsSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  return Notification.requestPermission();
}

async function writeSchedule(s: Schedule) {
  if (!('caches' in window)) return;
  const cache = await caches.open(REMINDER_CACHE);
  const prev = await cache.match(SCHEDULE_URL);
  if (prev) {
    try {
      const old = (await prev.json()) as Schedule;
      if (old.notified?.day === s.done.day) s.notified = old.notified;
    } catch {
      /* ignore */
    }
  }
  await cache.put(SCHEDULE_URL, new Response(JSON.stringify(s), { headers: { 'content-type': 'application/json' } }));
}

let timers: number[] = [];

export async function syncReminders(settings: Settings, entries: Entry[]) {
  timers.forEach((t) => clearTimeout(t));
  timers = [];
  const enabled =
    settings.reminderPrefs.notifications && notificationsSupported() && Notification.permission === 'granted';
  const now = new Date();
  const done = completedSlotsToday(settings.slots, entries, now);
  await writeSchedule({
    enabled,
    slots: settings.slots.map((s) => ({ name: s.name, time: s.time })),
    done: { day: dayKey(now), slots: done },
  }).catch(() => {});
  if (!enabled) return;

  const reg = await navigator.serviceWorker.ready;

  // Periodic background sync, where available.
  try {
    const anyReg = reg as ServiceWorkerRegistration & {
      periodicSync?: { register: (tag: string, o: { minInterval: number }) => Promise<void> };
    };
    if (anyReg.periodicSync) {
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
      if (status.state === 'granted') await anyReg.periodicSync.register('steady-reminders', { minInterval: 60 * 60 * 1000 });
    }
  } catch {
    /* not supported – fine */
  }

  // Timers for later today while the page is alive.
  const m = minutesOfDay(now);
  for (const s of sortedSlots(settings.slots)) {
    const at = parseHM(s.time);
    if (at <= m || done.includes(s.name)) continue;
    const ms = (at - m) * 60_000 - now.getSeconds() * 1000;
    timers.push(
      window.setTimeout(() => {
        if (document.visibilityState === 'visible') return; // in-app banner covers this
        void reg.showNotification(`${s.name} check-in is ready`, {
          body: 'A minute for you, whenever suits 🌿',
          tag: `steady-${s.name}`,
          icon: './icons/icon-192.png',
          badge: './icons/badge-96.png',
          data: { url: './#/checkin' },
        });
      }, ms),
    );
  }
}

export async function testNotification() {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification('Steady is set up 🌿', {
    body: 'This is what a gentle check-in reminder looks like.',
    icon: './icons/icon-192.png',
    badge: './icons/badge-96.png',
    tag: 'steady-test',
  });
}
