import type { Entry } from '../types';
import { SLEEP_HOURS_VALUE } from '../defaults';
import { addDays, dayKey, fromDayKey, startOfDay } from './dates';

export type Range = '7d' | '30d' | '3m' | 'all';

export const RANGE_LABEL: Record<Range, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '3m': '3 months',
  all: 'All',
};

const PERIOD_PHRASE: Record<Range, string> = {
  '7d': 'this week',
  '30d': 'this month',
  '3m': 'over the last 3 months',
  all: 'overall',
};

export function rangeStart(range: Range, now = new Date()): Date | undefined {
  const today = startOfDay(now);
  if (range === '7d') return addDays(today, -6);
  if (range === '30d') return addDays(today, -29);
  if (range === '3m') return addDays(today, -89);
  return undefined;
}

export function inRange(entries: Entry[], range: Range, now = new Date()): Entry[] {
  const start = rangeStart(range, now);
  return start ? entries.filter((e) => new Date(e.createdAt) >= start) : entries;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const r1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export function byDay(entries: Entry[]): Map<string, Entry[]> {
  const m = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = dayKey(e.createdAt);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(e);
  }
  return m;
}

export function dayMood(entries: Entry[]): number | undefined {
  const xs = entries.map((e) => e.overallMood).filter((x): x is number => typeof x === 'number');
  return xs.length ? avg(xs) : undefined;
}

export const topIntensity = (e: Entry) => {
  const xs = e.emotions.map((x) => x.intensity).filter((x): x is number => typeof x === 'number');
  return xs.length ? Math.max(...xs) : undefined;
};

export function sleepValue(entries: Entry[]): number | undefined {
  const xs = entries.map((e) => e.body?.sleepHours && SLEEP_HOURS_VALUE[e.body.sleepHours]).filter((x): x is number => !!x);
  return xs.length ? avg(xs) : undefined;
}

/* ---------------- Graph series ---------------- */

export interface MoodPoint {
  t: number;
  mood?: number;
  dayAvg?: number;
  sleep?: number;
  intensity?: number;
}

/** Individual mood points plus one point per day (at midday) for the daily lines. */
export function moodSeries(entries: Entry[]): { points: MoodPoint[]; daily: MoodPoint[] } {
  const points = entries
    .filter((e) => typeof e.overallMood === 'number')
    .map((e) => ({ t: new Date(e.createdAt).getTime(), mood: e.overallMood }));
  const daily: MoodPoint[] = [];
  for (const [k, es] of [...byDay(entries)].sort(([a], [b]) => a.localeCompare(b))) {
    const t = fromDayKey(k).getTime() + 12 * 3_600_000;
    const ints = es.map(topIntensity).filter((x): x is number => x !== undefined);
    daily.push({
      t,
      dayAvg: dayMood(es),
      sleep: sleepValue(es),
      intensity: ints.length ? avg(ints) : undefined,
    });
  }
  return { points, daily };
}

/* ---------------- Frequencies & skills ---------------- */

export function frequency(names: string[], top = 8): { name: string; count: number }[] {
  const m = new Map<string, number>();
  names.forEach((n) => m.set(n, (m.get(n) ?? 0) + 1));
  return [...m]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, top);
}

export const emotionFreq = (es: Entry[], top?: number) => frequency(es.flatMap((e) => e.emotions.map((x) => x.name)), top);
export const triggerFreq = (es: Entry[], top?: number) => frequency(es.flatMap((e) => e.triggers), top);

export interface SkillStat {
  name: string;
  uses: number;
  rated: number;
  avg: number; // 0–2 over rated uses
  score: number; // avg pulled gently toward 1 for small samples, used for ranking
  lot: number;
  bit: number;
  none: number;
}

export function skillStats(entries: Entry[]): SkillStat[] {
  const m = new Map<string, SkillStat>();
  for (const e of entries)
    for (const s of e.skills) {
      const st = m.get(s.name) ?? { name: s.name, uses: 0, rated: 0, avg: 0, score: 0, lot: 0, bit: 0, none: 0 };
      st.uses++;
      if (s.helped !== undefined) {
        st.rated++;
        if (s.helped === 2) st.lot++;
        else if (s.helped === 1) st.bit++;
        else st.none++;
      }
      m.set(s.name, st);
    }
  return [...m.values()]
    .map((s) => ({
      ...s,
      avg: s.rated ? (s.lot * 2 + s.bit) / s.rated : 0,
      // Two imaginary "helped a bit" ratings, so 1-for-1 doesn't outrank 7-out-of-8.
      score: (s.lot * 2 + s.bit + 2) / (s.rated + 2),
    }))
    .sort((a, b) => b.score - a.score || b.uses - a.uses || a.name.localeCompare(b.name));
}

export function skillSentence(s: SkillStat): string {
  if (!s.rated) return `Used ${s.uses} time${s.uses === 1 ? '' : 's'}`;
  if (s.lot) return `Helped a lot ${s.lot} out of ${s.rated} time${s.rated === 1 ? '' : 's'}`;
  if (s.bit) return `Helped a bit ${s.bit} out of ${s.rated} time${s.rated === 1 ? '' : 's'}`;
  return `Tried ${s.uses} time${s.uses === 1 ? '' : 's'}. Still exploring this one`;
}

/* ---------------- Plain-language insights ---------------- */

export interface Insight {
  id: string;
  emoji: string;
  text: string;
}

export const MIN_ENTRIES_FOR_INSIGHTS = 7;

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function insights(all: Entry[], range: Range, now = new Date()): Insight[] {
  const es = inRange(all, range, now);
  const out: Insight[] = [];
  const period = PERIOD_PHRASE[range];

  // 1. Most common trigger
  const trig = triggerFreq(es, 1)[0];
  if (trig && trig.count >= 2)
    out.push({
      id: 'trigger',
      emoji: '🔍',
      text: `Your most common trigger ${period}: ${lower(trig.name)} (${trig.count} times).`,
    });

  // 2. Most common emotion
  const emo = emotionFreq(es, 1)[0];
  if (emo && emo.count >= 3)
    out.push({ id: 'emotion', emoji: '💭', text: `You noticed feeling ${lower(emo.name)} most often ${period} (${emo.count} times).` });

  // 3. Sleep vs mood (per day)
  const days = [...byDay(es).values()];
  const shortSleep: number[] = [];
  const otherSleep: number[] = [];
  for (const d of days) {
    const mood = dayMood(d);
    const sl = sleepValue(d);
    if (mood === undefined || sl === undefined) continue;
    (sl < 6 ? shortSleep : otherSleep).push(mood);
  }
  if (shortSleep.length >= 2 && otherSleep.length >= 2) {
    const a = avg(shortSleep);
    const b = avg(otherSleep);
    if (Math.abs(a - b) >= 0.5)
      out.push({
        id: 'sleep',
        emoji: '😴',
        text: `On days you slept under 6 hours, your mood averaged ${r1(a)} vs ${r1(b)} otherwise.`,
      });
  }

  // 4. Time of day
  const bySlot = new Map<string, number[]>();
  for (const e of es)
    if (e.slot && typeof e.overallMood === 'number') {
      if (!bySlot.has(e.slot)) bySlot.set(e.slot, []);
      bySlot.get(e.slot)!.push(e.overallMood);
    }
  const slotAvgs = [...bySlot].filter(([, xs]) => xs.length >= 2).map(([name, xs]) => ({ name, a: avg(xs) }));
  if (slotAvgs.length >= 2) {
    slotAvgs.sort((x, y) => x.a - y.a);
    const low = slotAvgs[0];
    const high = slotAvgs[slotAvgs.length - 1];
    if (high.a - low.a >= 1) {
      out.push({
        id: 'slot',
        emoji: '🕰️',
        text: `${pluralSlot(low.name)} tend to be your toughest time. Might be worth having a skill ready.`,
      });
    }
  }

  // 5. Urge strength trend (last 7 days vs the 7 before)
  const t0 = addDays(startOfDay(now), -6);
  const t1 = addDays(t0, -7);
  const urgeAvg = (from: Date, to: Date) =>
    avg(
      all
        .filter((e) => {
          const d = new Date(e.createdAt);
          return d >= from && d < to;
        })
        .flatMap((e) => e.urges.map((u) => u.strength))
        .filter((x): x is number => typeof x === 'number'),
    );
  const uNow = urgeAvg(t0, addDays(startOfDay(now), 1));
  const uPrev = urgeAvg(t1, t0);
  if (!isNaN(uNow) && !isNaN(uPrev)) {
    if (uPrev - uNow >= 1)
      out.push({ id: 'urges', emoji: '🌱', text: 'Urge strength has been trending down over the last 2 weeks.' });
    else if (uNow - uPrev >= 1)
      out.push({
        id: 'urges',
        emoji: '💛',
        text: 'Urges have felt a bit stronger this week. Noticing that is a skill in itself. Be gentle with yourself.',
      });
  }

  // 6. Mood trend
  const moodAvg = (from: Date, to: Date) =>
    avg(
      all
        .filter((e) => {
          const d = new Date(e.createdAt);
          return d >= from && d < to && typeof e.overallMood === 'number';
        })
        .map((e) => e.overallMood!),
    );
  const mNow = moodAvg(t0, addDays(startOfDay(now), 1));
  const mPrev = moodAvg(t1, t0);
  if (!isNaN(mNow) && !isNaN(mPrev) && mNow - mPrev >= 1)
    out.push({ id: 'mood', emoji: '🌤️', text: `Your mood has been lifting this week (${r1(mNow)} vs ${r1(mPrev)} the week before).` });

  // 7. A skill that's been helping
  const best = skillStats(es).find((s) => s.rated >= 2 && s.lot >= 2);
  if (best)
    out.push({
      id: 'skill',
      emoji: '🧰',
      text: `${best.name} helped a lot ${best.lot} out of ${best.rated} times ${period}. A good one to keep handy.`,
    });

  // 8. Meals and mood
  const fed: number[] = [];
  const unfed: number[] = [];
  for (const d of days) {
    const mood = dayMood(d);
    const meals = d.map((e) => e.body?.meals).filter(Boolean).pop();
    if (mood === undefined || !meals) continue;
    (meals === '0' || meals === '1' ? unfed : fed).push(mood);
  }
  if (fed.length >= 2 && unfed.length >= 2 && avg(fed) - avg(unfed) >= 1)
    out.push({
      id: 'meals',
      emoji: '🍲',
      text: `Days with 2 or more meals had an average mood of ${r1(avg(fed))}, compared with ${r1(avg(unfed))}.`,
    });

  return out;
}

function pluralSlot(name: string): string {
  if (/s$/i.test(name)) return name;
  return name + 's';
}
