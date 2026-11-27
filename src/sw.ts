/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

// Everything the app needs is precached, so it works fully offline.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

self.skipWaiting();
clientsClaim();

/* ---------------- Best-effort reminders ---------------- */

const REMINDER_CACHE = 'steady-reminders';
const SCHEDULE_URL = new URL('./__steady/schedule.json', self.registration.scope).href;

interface Schedule {
  enabled: boolean;
  slots: { name: string; time: string }[];
  done: { day: string; slots: string[] };
  notified?: { day: string; slots: string[] };
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

async function checkReminders() {
  const cache = await caches.open(REMINDER_CACHE);
  const res = await cache.match(SCHEDULE_URL);
  if (!res) return;
  const s = (await res.json()) as Schedule;
  if (!s.enabled) return;
  const now = new Date();
  const today = dayKey(now);
  const m = now.getHours() * 60 + now.getMinutes();
  const done = s.done.day === today ? s.done.slots : [];
  const notified = s.notified?.day === today ? s.notified.slots : [];
  const slots = [...s.slots].sort((a, b) => hm(a.time) - hm(b.time));
  for (let i = 0; i < slots.length; i++) {
    const start = hm(slots[i].time);
    const end = i + 1 < slots.length ? hm(slots[i + 1].time) : 24 * 60;
    const name = slots[i].name;
    if (m >= start && m < end && !done.includes(name) && !notified.includes(name)) {
      await self.registration.showNotification(`${name} check-in is ready`, {
        body: 'A minute for you, whenever suits 🌿',
        tag: `steady-${name}`,
        icon: './icons/icon-192.png',
        badge: './icons/badge-96.png',
        data: { url: './#/checkin' },
      });
      s.notified = { day: today, slots: [...notified, name] };
      await cache.put(SCHEDULE_URL, new Response(JSON.stringify(s), { headers: { 'content-type': 'application/json' } }));
    }
  }
}

self.addEventListener('periodicsync', (event: Event) => {
  const e = event as ExtendableEvent & { tag: string };
  if (e.tag === 'steady-reminders') e.waitUntil(checkReminders());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data?.url as string) ?? './', self.registration.scope).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of all) {
        if ('focus' in c) {
          await (c as WindowClient).navigate(url).catch(() => {});
          return (c as WindowClient).focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
