import { describe, expect, it } from 'vitest';
import { streakInfo, milestoneHit } from '../lib/streaks';
import { closestSlot, dueSlot } from '../lib/slots';
import { insights, skillStats, moodSeries, inRange, MIN_ENTRIES_FOR_INSIGHTS } from '../lib/insights';
import { orderByUsage, usageCounts } from '../lib/usage';
import { entriesToCSV } from '../lib/backup';
import { makeDemoEntries } from '../lib/demo';
import { DEFAULT_SLOTS, DEFAULT_EMOTIONS } from '../defaults';
import type { Entry } from '../types';

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);
const e = (date: Date, p: Partial<Entry> = {}): Entry => ({
  id: Math.random().toString(36),
  createdAt: date.toISOString(),
  type: 'checkin',
  emotions: [],
  triggers: [],
  urges: [],
  skills: [],
  ...p,
});

describe('streaks', () => {
  const now = at(2026, 11, 27, 10);
  it('is empty with no entries', () => {
    expect(streakInfo([], now)).toEqual({ current: 0, totalDays: 0, loggedToday: false, returning: false });
  });
  it('counts consecutive days including today', () => {
    const s = streakInfo([e(at(2026, 11, 25)), e(at(2026, 11, 26)), e(at(2026, 11, 27, 8))], now);
    expect(s.current).toBe(3);
    expect(s.returning).toBe(false);
  });
  it("doesn't reset before today is over", () => {
    const s = streakInfo([e(at(2026, 11, 25)), e(at(2026, 11, 26))], now);
    expect(s.current).toBe(2);
    expect(s.returning).toBe(false);
  });
  it('quietly resets after a gap and says welcome back; total never resets', () => {
    const s = streakInfo([e(at(2026, 11, 20)), e(at(2026, 11, 21)), e(at(2026, 11, 22))], now);
    expect(s.current).toBe(0);
    expect(s.returning).toBe(true);
    expect(s.totalDays).toBe(3);
    const s2 = streakInfo([e(at(2026, 11, 20)), e(at(2026, 11, 27, 9))], now);
    expect(s2.current).toBe(1);
    expect(s2.returning).toBe(true);
    expect(s2.totalDays).toBe(2);
  });
  it('detects milestones once', () => {
    expect(milestoneHit(2, 3)).toBe(3);
    expect(milestoneHit(3, 3)).toBeUndefined();
    expect(milestoneHit(6, 7)).toBe(7);
    expect(milestoneHit(29, 30)).toBe(30);
    expect(milestoneHit(4, 5)).toBeUndefined();
  });
});

describe('slots', () => {
  it('tags the closest slot', () => {
    expect(closestSlot(DEFAULT_SLOTS, at(2026, 1, 1, 8))?.name).toBe('Morning');
    expect(closestSlot(DEFAULT_SLOTS, at(2026, 1, 1, 13))?.name).toBe('Afternoon');
    expect(closestSlot(DEFAULT_SLOTS, at(2026, 1, 1, 23))?.name).toBe('Evening');
    expect(closestSlot(DEFAULT_SLOTS, at(2026, 1, 1, 3))?.name).toBe('Morning');
  });
  it('marks a slot due only inside its window and until done', () => {
    const now = at(2026, 1, 1, 15);
    expect(dueSlot(DEFAULT_SLOTS, [], now)?.name).toBe('Afternoon');
    expect(dueSlot(DEFAULT_SLOTS, [e(at(2026, 1, 1, 14, 30), { slot: 'Afternoon' })], now)).toBeUndefined();
    expect(dueSlot(DEFAULT_SLOTS, [], at(2026, 1, 1, 7))).toBeUndefined();
    // A check-in during the Morning window tagged "Afternoon" still counts for Morning.
    expect(dueSlot(DEFAULT_SLOTS, [e(at(2026, 1, 1, 11, 45), { slot: 'Afternoon' })], at(2026, 1, 1, 12))).toBeUndefined();
  });
});

describe('usage ordering', () => {
  it('floats items used 2+ times, keeps user order otherwise, drops hidden', () => {
    const list = DEFAULT_EMOTIONS.map((x) => ({ ...x }));
    list[1].hidden = true; // Calm
    const counts = usageCounts([
      e(new Date(), { emotions: [{ name: 'Numb', intensity: 3 }] }),
      e(new Date(), { emotions: [{ name: 'Numb', intensity: 3 }, { name: 'Sad', intensity: 2 }] }),
    ]).emotions;
    const out = orderByUsage(list, counts).map((x) => x.name);
    expect(out[0]).toBe('Numb');
    expect(out[1]).toBe('Happy');
    expect(out).not.toContain('Calm');
  });
});

describe('insights at 0, 1, 7, 100+ entries', () => {
  const now = at(2026, 11, 27, 21);
  for (const n of [0, 1, 7, 120]) {
    it(`computes without throwing for ${n}`, () => {
      const es = makeDemoEntries(n, now);
      expect(es).toHaveLength(n);
      const ins = insights(es, 'all', now);
      expect(Array.isArray(ins)).toBe(true);
      expect(moodSeries(es).points.length).toBeLessThanOrEqual(n);
      expect(skillStats(es).every((s) => s.avg >= 0 && s.avg <= 2)).toBe(true);
      for (const r of ['7d', '30d', '3m', 'all'] as const) insights(es, r, now);
      if (n >= 100) expect(ins.length).toBeGreaterThan(2);
    });
  }
  it('finds the sleep pattern and the toughest slot', () => {
    const ins = insights(makeDemoEntries(150, now), 'all', now).map((i) => i.id);
    expect(ins).toContain('sleep');
    expect(ins).toContain('slot');
  });
  it('MIN is 7', () => expect(MIN_ENTRIES_FOR_INSIGHTS).toBe(7));
  it('range filter', () => {
    const es = [e(at(2026, 11, 27)), e(at(2026, 11, 1)), e(at(2026, 6, 1))];
    expect(inRange(es, '7d', now)).toHaveLength(1);
    expect(inRange(es, '30d', now)).toHaveLength(2);
    expect(inRange(es, 'all', now)).toHaveLength(3);
  });
  it('uses curious, non-judgemental wording', () => {
    const text = insights(makeDemoEntries(150, now), 'all', now)
      .map((i) => i.text)
      .join(' ')
      .toLowerCase();
    for (const bad of ['fail', 'relapse', 'bad', 'should', 'missed', 'broke']) expect(text).not.toContain(bad);
  });
});

describe('skills ranking', () => {
  it('ranks a well-tested skill above a one-off', () => {
    const es = [
      e(new Date(), { skills: [{ name: 'Once', helped: 2 }] }),
      ...Array.from({ length: 8 }, (_, i) => e(new Date(), { skills: [{ name: 'TIPP', helped: i < 7 ? 2 : 1 }] })),
    ];
    expect(skillStats(es)[0].name).toBe('TIPP');
  });
});

describe('csv', () => {
  it('escapes and flattens', () => {
    const csv = entriesToCSV([
      e(at(2026, 1, 2, 9, 5), {
        note: 'Hi, "there"\nnext',
        emotions: [{ name: 'Sad', intensity: 4 }, { name: 'Numb' }],
        urges: [{ name: 'Cry', strength: 5, acted: 'little' }],
        skills: [{ name: 'TIPP', helped: 2 }],
      }),
    ]);
    const [head, row] = [csv.split('\n')[0], csv.split('\n').slice(1).join('\n')];
    expect(head.startsWith('date,time,type')).toBe(true);
    expect(row).toContain('2026-01-02,09:05,checkin');
    expect(row).toContain('Sad (4); Numb');
    expect(row).toContain('Cry (5, acted: a little)');
    expect(row).toContain('TIPP (helped a lot)');
    expect(row).toContain('"Hi, ""there""\nnext"');
  });
});
