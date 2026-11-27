import Dexie, { type Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { defaultSettings } from './defaults';
import type { Draft, Entry, ListKind, Settings } from './types';

interface KV {
  key: string;
  value: unknown;
}

class SteadyDB extends Dexie {
  entries!: Table<Entry, string>;
  kv!: Table<KV, string>;
  constructor() {
    super('steady');
    this.version(1).stores({
      entries: 'id, createdAt, type',
      kv: 'key',
    });
  }
}

export const db = new SteadyDB();

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);

/* ---------------- Settings ---------------- */

/** Fill any keys missing from stored settings (e.g. after an app update). */
export function normaliseSettings(raw: Partial<Settings> | undefined): Settings {
  const d = defaultSettings();
  if (!raw) return d;
  return {
    ...d,
    ...raw,
    lists: { ...d.lists, ...(raw.lists ?? {}) },
    reminderPrefs: { ...d.reminderPrefs, ...(raw.reminderPrefs ?? {}) },
    breathing: { ...d.breathing, ...(raw.breathing ?? {}) },
    skillGroups: raw.skillGroups?.length ? raw.skillGroups : d.skillGroups,
    slots: raw.slots ?? d.slots,
    cards: raw.cards ?? d.cards,
  };
}

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get('settings');
  return normaliseSettings(row?.value as Partial<Settings> | undefined);
}

export async function saveSettings(s: Settings) {
  await db.kv.put({ key: 'settings', value: s });
  try {
    localStorage.setItem('steady-theme', s.theme);
  } catch {
    /* storage may be unavailable */
  }
}

export async function updateSettings(fn: (s: Settings) => Settings | void) {
  return db.transaction('rw', db.kv, async () => {
    const cur = await getSettings();
    const draft = structuredClone(cur);
    const next = fn(draft) ?? draft;
    await saveSettings(next);
    return next;
  });
}

export function useSettings(): Settings | undefined {
  return useLiveQuery(async () => getSettings(), []);
}

/* ---------------- Entries ---------------- */

export function useEntries(): Entry[] | undefined {
  return useLiveQuery(() => db.entries.orderBy('createdAt').toArray(), []);
}

export async function addEntry(e: Entry) {
  await db.entries.put(e);
}

export async function updateEntry(e: Entry) {
  await db.entries.put({ ...e, updatedAt: new Date().toISOString() });
}

export async function deleteEntry(id: string) {
  await db.entries.delete(id);
}

/** Rename an item everywhere it appears in history so stats stay joined up. */
export async function renameInEntries(kind: ListKind, from: string, to: string) {
  if (from === to) return;
  await db.entries.toCollection().modify((e) => {
    if (kind === 'emotions') e.emotions = e.emotions.map((x) => (x.name === from ? { ...x, name: to } : x));
    if (kind === 'triggers') e.triggers = e.triggers.map((x) => (x === from ? to : x));
    if (kind === 'urges') e.urges = e.urges.map((x) => (x.name === from ? { ...x, name: to } : x));
    if (kind === 'skills') e.skills = e.skills.map((x) => (x.name === from ? { ...x, name: to } : x));
  });
}

/* ---------------- Draft ---------------- */

export async function getDraft(): Promise<Draft | undefined> {
  const row = await db.kv.get('draft');
  return row?.value as Draft | undefined;
}

export async function saveDraft(d: Draft) {
  await db.kv.put({ key: 'draft', value: d });
}

export async function clearDraft() {
  await db.kv.delete('draft');
}

export function useDraft() {
  return useLiveQuery(async () => (await getDraft()) ?? null, []);
}

/* ---------------- Misc key/values ---------------- */

export async function getKV<T>(key: string): Promise<T | undefined> {
  return (await db.kv.get(key))?.value as T | undefined;
}

export async function setKV(key: string, value: unknown) {
  await db.kv.put({ key, value });
}

export function useKV<T>(key: string): T | undefined | null {
  return useLiveQuery(async () => ((await db.kv.get(key))?.value as T | undefined) ?? null, [key]);
}

export async function clearAllData() {
  await db.transaction('rw', db.entries, db.kv, async () => {
    await db.entries.clear();
    await db.kv.clear();
  });
}

export const emptyEntry = (type: Entry['type']): Entry => ({
  id: uid(),
  createdAt: new Date().toISOString(),
  type,
  emotions: [],
  triggers: [],
  urges: [],
  skills: [],
});
