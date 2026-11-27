/** Local-date helpers. Day keys are 'YYYY-MM-DD' in the phone's time zone. */

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

export function fromDayKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const AU = 'en-AU';

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(AU, { hour: 'numeric', minute: '2-digit' });

export const fmtDay = (d: Date | string) =>
  (typeof d === 'string' ? new Date(d) : d).toLocaleDateString(AU, { weekday: 'long', day: 'numeric', month: 'long' });

export const fmtShortDay = (d: Date | string) =>
  (typeof d === 'string' ? new Date(d) : d).toLocaleDateString(AU, { day: 'numeric', month: 'short' });

export const fmtMonth = (d: Date) => d.toLocaleDateString(AU, { month: 'long', year: 'numeric' });

export function relativeDays(iso: string | undefined, now = new Date()): string {
  if (!iso) return 'never';
  const n = daysBetween(new Date(iso), now);
  if (n <= 0) return 'today';
  if (n === 1) return 'yesterday';
  return `${n} days ago`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Hi there';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
