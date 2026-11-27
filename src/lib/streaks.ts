import type { Entry } from '../types';
import { MILESTONES } from '../defaults';
import { addDays, dayKey, daysBetween, fromDayKey } from './dates';

export interface StreakInfo {
  current: number; // consecutive days up to today (or yesterday, if today isn't logged yet)
  totalDays: number; // never resets
  loggedToday: boolean;
  /** True when there's history but the run has quietly reset (shows "Welcome back"). */
  returning: boolean;
}

export function streakInfo(entries: Entry[], now = new Date()): StreakInfo {
  const days = new Set(entries.map((e) => dayKey(e.createdAt)));
  const today = dayKey(now);
  const loggedToday = days.has(today);
  let cursor = loggedToday ? now : addDays(now, -1);
  let current = 0;
  while (days.has(dayKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }
  let returning = false;
  if (days.size > 0 && !loggedToday && current === 0) {
    returning = true;
  } else if (loggedToday && current === 1 && days.size > 1) {
    // Logged today after a gap: still a gentle "welcome back".
    const prev = [...days].filter((d) => d !== today).sort().pop()!;
    returning = daysBetween(fromDayKey(prev), now) > 1;
  }
  return { current, totalDays: days.size, loggedToday, returning };
}

/** Milestone reached by going from `before` to `after` streak days, if any. */
export function milestoneHit(before: number, after: number): number | undefined {
  return MILESTONES.find((m) => before < m && after >= m);
}

export function milestoneMessage(m: number): string {
  switch (m) {
    case 3:
      return '3 days in a row 🌼 You’re building something.';
    case 7:
      return 'A whole week of checking in 🌿 That’s real care.';
    case 14:
      return 'Two weeks 🌻 Look at you showing up for yourself.';
    case 30:
      return '30 days 🌈 What a thing to be proud of.';
    default:
      return `${m} days 💛`;
  }
}
