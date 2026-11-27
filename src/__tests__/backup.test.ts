import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { addEntry, clearAllData, db, getSettings, saveDraft, updateSettings } from '../db';
import { buildBackup, parseBackup, restoreMerge, restoreReplace } from '../lib/backup';
import { makeDemoEntries } from '../lib/demo';

describe('backup round trip', () => {
  it('export → clear → import restores everything exactly', async () => {
    for (const x of makeDemoEntries(40)) await addEntry(x);
    await updateSettings((s) => {
      s.theme = 'dark';
      s.lists.emotions.push({ id: 'c-x', name: 'Wobbly', emoji: '🫠' });
      s.lists.triggers[0].hidden = true;
      s.slots[0].time = '08:15';
    });
    await saveDraft({ entry: makeDemoEntries(1)[0], step: 2, phase: 'rate', updatedAt: new Date().toISOString() });

    const before = await buildBackup();
    const json = JSON.stringify(before);
    await clearAllData();
    expect(await db.entries.count()).toBe(0);

    await restoreReplace(parseBackup(json));
    const after = await buildBackup();
    expect(after.entries).toEqual(before.entries);
    expect(after.settings).toEqual(before.settings);
    expect(after.draft).toEqual(before.draft);
  });

  it('merge adds new entries without duplicating', async () => {
    const snap = await buildBackup();
    const n = snap.entries.length;
    await db.entries.bulkPut(makeDemoEntries(5, new Date(), 7));
    await restoreMerge(snap);
    expect(await db.entries.count()).toBe(n + 5);
    await restoreMerge(snap);
    expect(await db.entries.count()).toBe(n + 5);
    expect((await getSettings()).lists.emotions.some((x) => x.name === 'Wobbly')).toBe(true);
  });

  it('rejects files that are not Steady backups', () => {
    expect(() => parseBackup('nope')).toThrow();
    expect(() => parseBackup('{"app":"other"}')).toThrow();
    expect(() => parseBackup('{"app":"steady","entries":[{"x":1}],"settings":{}}')).toThrow();
  });
});
