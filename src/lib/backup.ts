import { db, getDraft, getSettings, normaliseSettings, saveSettings, setKV } from '../db';
import type { Draft, Entry, ListKind, Settings } from '../types';
import { dayKey } from './dates';

export interface Backup {
  app: 'steady';
  version: 1;
  exportedAt: string;
  entries: Entry[];
  settings: Settings;
  draft?: Draft | null;
}

export async function buildBackup(): Promise<Backup> {
  return {
    app: 'steady',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: await db.entries.orderBy('createdAt').toArray(),
    settings: await getSettings(),
    draft: (await getDraft()) ?? null,
  };
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportBackup() {
  const b = await buildBackup();
  const now = new Date();
  // Record the backup time inside the exported settings too, so a restore keeps it.
  b.settings.lastBackupAt = now.toISOString();
  download(`steady-backup-${dayKey(now)}.json`, JSON.stringify(b, null, 2), 'application/json');
  await saveSettings({ ...(await getSettings()), lastBackupAt: now.toISOString() });
}

export class BackupError extends Error {}

export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('That file doesn’t look like a Steady backup (it isn’t valid JSON).');
  }
  const b = data as Partial<Backup>;
  if (!b || b.app !== 'steady' || !Array.isArray(b.entries) || typeof b.settings !== 'object')
    throw new BackupError('That file doesn’t look like a Steady backup.');
  for (const e of b.entries) {
    if (!e || typeof e.id !== 'string' || typeof e.createdAt !== 'string')
      throw new BackupError('Some entries in that backup look damaged, so nothing was changed.');
  }
  return b as Backup;
}

export function summariseBackup(b: Backup) {
  const dates = b.entries.map((e) => e.createdAt).sort();
  return { count: b.entries.length, first: dates[0], last: dates[dates.length - 1], exportedAt: b.exportedAt };
}

/** Replace everything on this device with the backup, exactly. */
export async function restoreReplace(b: Backup) {
  await db.transaction('rw', db.entries, db.kv, async () => {
    await db.entries.clear();
    await db.kv.clear();
    await db.entries.bulkPut(b.entries);
    await saveSettings(normaliseSettings(b.settings));
    if (b.draft) await setKV('draft', b.draft);
  });
}

/**
 * Merge: keep everything here, add entries from the backup that aren't here
 * (or are newer there), and add any list items or skill cards that are missing.
 */
export async function restoreMerge(b: Backup) {
  await db.transaction('rw', db.entries, db.kv, async () => {
    const existing = new Map((await db.entries.toArray()).map((e) => [e.id, e]));
    const toPut = b.entries.filter((e) => {
      const cur = existing.get(e.id);
      if (!cur) return true;
      return (e.updatedAt ?? e.createdAt) > (cur.updatedAt ?? cur.createdAt);
    });
    await db.entries.bulkPut(toPut);

    const cur = await getSettings();
    const inc = normaliseSettings(b.settings);
    for (const kind of Object.keys(cur.lists) as ListKind[]) {
      const names = new Set(cur.lists[kind].map((i) => i.name));
      cur.lists[kind].push(...inc.lists[kind].filter((i) => !names.has(i.name)));
    }
    const groups = new Set(cur.skillGroups);
    cur.skillGroups.push(...inc.skillGroups.filter((g) => !groups.has(g)));
    const cardIds = new Set(cur.cards.map((c) => c.id));
    cur.cards.push(...inc.cards.filter((c) => !cardIds.has(c.id)));
    const slotNames = new Set(cur.slots.map((s) => s.name));
    cur.slots.push(...inc.slots.filter((s) => !slotNames.has(s.name)));
    if (inc.lastBackupAt && (!cur.lastBackupAt || inc.lastBackupAt > cur.lastBackupAt)) cur.lastBackupAt = inc.lastBackupAt;
    await saveSettings(cur);
  });
  return { added: b.entries.length };
}

/* ---------------- CSV ---------------- */

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const HELPED = ['didn’t help', 'helped a bit', 'helped a lot'];
const ACTED: Record<string, string> = { no: 'no', little: 'a little', yes: 'yes' };

export function entriesToCSV(entries: Entry[]): string {
  const header = [
    'date',
    'time',
    'type',
    'slot',
    'overall_mood',
    'emotions',
    'triggers',
    'urges',
    'skills',
    'sleep_hours',
    'sleep_quality',
    'meals',
    'meds',
    'water',
    'movement',
    'pain',
    'note',
  ];
  const rows = entries.map((e) => {
    const d = new Date(e.createdAt);
    return [
      dayKey(d),
      d.toTimeString().slice(0, 5),
      e.type,
      e.slot,
      e.overallMood,
      e.emotions.map((x) => (x.intensity !== undefined ? `${x.name} (${x.intensity})` : x.name)).join('; '),
      e.triggers.join('; '),
      e.urges.map((u) => {
        const bits = [u.strength !== undefined && String(u.strength), u.acted && 'acted: ' + ACTED[u.acted]].filter(Boolean);
        return bits.length ? `${u.name} (${bits.join(', ')})` : u.name;
      }).join('; '),
      e.skills.map((s) => `${s.name}${s.helped !== undefined ? ' (' + HELPED[s.helped] + ')' : ''}`).join('; '),
      e.body?.sleepHours,
      e.body?.sleepQuality,
      e.body?.meals,
      e.body?.meds,
      e.body?.water === undefined ? '' : e.body.water ? 'yes' : 'no',
      e.body?.movement === undefined ? '' : e.body.movement ? 'yes' : 'no',
      e.body?.pain,
      e.note,
    ]
      .map(csvCell)
      .join(',');
  });
  return [header.join(','), ...rows].join('\n');
}

export async function exportCSV() {
  const entries = await db.entries.orderBy('createdAt').toArray();
  download(`steady-entries-${dayKey(new Date())}.csv`, '﻿' + entriesToCSV(entries), 'text/csv');
}
