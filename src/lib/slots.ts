import type { Entry, Slot } from '../types';
import { dayKey, minutesOfDay, parseHM } from './dates';

const circ = (a: number, b: number) => {
  const d = Math.abs(a - b) % 1440;
  return Math.min(d, 1440 - d);
};

/** The slot whose time is closest to `now` (ties go to the earlier slot). */
export function closestSlot(slots: Slot[], now = new Date()): Slot | undefined {
  if (!slots.length) return undefined;
  const m = minutesOfDay(now);
  return [...slots]
    .sort((a, b) => parseHM(a.time) - parseHM(b.time))
    .reduce((best, s) => (circ(parseHM(s.time), m) < circ(parseHM(best.time), m) ? s : best));
}

/** Slots in time order. */
export const sortedSlots = (slots: Slot[]) => [...slots].sort((a, b) => parseHM(a.time) - parseHM(b.time));

/** Slot names that have a full check-in today. */
export function doneSlotsToday(entries: Entry[], now = new Date()): Set<string> {
  const today = dayKey(now);
  return new Set(
    entries.filter((e) => e.type === 'checkin' && e.slot && dayKey(e.createdAt) === today).map((e) => e.slot!),
  );
}

/**
 * A slot is "due" when its time has passed, the next slot's time hasn't, and
 * there's no check-in for it yet today (either tagged with it, or done during
 * its window). Never looks backwards at earlier slots, so nothing ever reads
 * as "missed".
 */
export function dueSlot(slots: Slot[], entries: Entry[], now = new Date()): Slot | undefined {
  const s = sortedSlots(slots);
  const m = minutesOfDay(now);
  const today = dayKey(now);
  const todays = entries.filter((e) => e.type === 'checkin' && dayKey(e.createdAt) === today);
  for (let i = 0; i < s.length; i++) {
    const start = parseHM(s[i].time);
    const end = i + 1 < s.length ? parseHM(s[i + 1].time) : 24 * 60;
    if (m < start || m >= end) continue;
    const done = todays.some((e) => {
      if (e.slot === s[i].name) return true;
      const t = minutesOfDay(new Date(e.createdAt));
      return t >= start && t < end;
    });
    return done ? undefined : s[i];
  }
  return undefined;
}

/** Slot names that count as done today: tagged with the slot, or done in its window. */
export function completedSlotsToday(slots: Slot[], entries: Entry[], now = new Date()): string[] {
  const s = sortedSlots(slots);
  const today = dayKey(now);
  const todays = entries.filter((e) => e.type === 'checkin' && dayKey(e.createdAt) === today);
  return s
    .filter((slot, i) => {
      const start = parseHM(slot.time);
      const end = i + 1 < s.length ? parseHM(s[i + 1].time) : 24 * 60;
      return todays.some((e) => {
        if (e.slot === slot.name) return true;
        const t = minutesOfDay(new Date(e.createdAt));
        return t >= start && t < end;
      });
    })
    .map((x) => x.name);
}
