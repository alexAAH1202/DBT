import type { Entry, ListItem, ListKind } from '../types';

export type UsageCounts = Record<ListKind, Map<string, number>>;

export function usageCounts(entries: Entry[]): UsageCounts {
  const c: UsageCounts = { emotions: new Map(), triggers: new Map(), urges: new Map(), skills: new Map() };
  const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const e of entries) {
    e.emotions.forEach((x) => inc(c.emotions, x.name));
    e.triggers.forEach((x) => inc(c.triggers, x));
    e.urges.forEach((x) => inc(c.urges, x.name));
    e.skills.forEach((x) => inc(c.skills, x.name));
  }
  return c;
}

/**
 * Visible items, with frequently-picked ones floated to the top. Items need at
 * least 2 uses to float, so one-off picks don't shuffle the grid around.
 * Otherwise the user's own order is kept (stable sort).
 */
export function orderByUsage(list: ListItem[], counts: Map<string, number> | undefined, float = true): ListItem[] {
  const visible = list.filter((i) => !i.hidden);
  if (!float || !counts) return visible;
  const score = (i: ListItem) => {
    const n = counts.get(i.name) ?? 0;
    return n >= 2 ? n : 0;
  };
  return visible
    .map((item, idx) => ({ item, idx, s: score(item) }))
    .sort((a, b) => b.s - a.s || a.idx - b.idx)
    .map((x) => x.item);
}
