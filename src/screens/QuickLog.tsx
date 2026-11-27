import { useMemo, useRef, useState } from 'react';
import { addEntry, deleteEntry, emptyEntry, updateEntry } from '../db';
import { useApp } from '../context';
import { go } from '../router';
import { closestSlot } from '../lib/slots';
import { orderByUsage } from '../lib/usage';
import { milestoneHit, milestoneMessage, streakInfo } from '../lib/streaks';
import { Celebration } from '../components/Celebration';
import { ChipPicker, LinkButton, NoteField, Primary, ScalePicker, Screen, Secondary } from '../components/ui';
import type { Entry } from '../types';

const SAVED_LINES = [
  'Noticed. That’s the hard part done.',
  'Thanks for checking in with yourself.',
  'Logged. Nice tuning in.',
  'Saved. You showed up for you.',
];

export function QuickLog() {
  const { settings, entries, usage } = useApp();
  const [emotions, setEmotions] = useState<string[]>([]);
  const [saved, setSaved] = useState<Entry | null>(null);
  const [milestone, setMilestone] = useState<number>();
  const [panel, setPanel] = useState<'none' | 'trigger' | 'note'>('none');
  const line = useRef(SAVED_LINES[Math.floor(Math.random() * SAVED_LINES.length)]);

  const emotionOpts = useMemo(
    () => orderByUsage(settings.lists.emotions, usage.emotions, settings.floatFavourites),
    // Freeze the order while this screen is open so chips don't jump under a finger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.lists.emotions],
  );
  const triggerOpts = useMemo(
    () => orderByUsage(settings.lists.triggers, usage.triggers, settings.floatFavourites),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.lists.triggers],
  );

  const toggle = (n: string) => setEmotions((xs) => (xs.includes(n) ? xs.filter((x) => x !== n) : [...xs, n]));

  async function save(intensity: number) {
    if (!emotions.length) return;
    const e: Entry = {
      ...emptyEntry('quick'),
      slot: closestSlot(settings.slots)?.name,
      emotions: emotions.map((name) => ({ name, intensity })),
    };
    const before = streakInfo(entries).current;
    await addEntry(e);
    setMilestone(milestoneHit(before, streakInfo([...entries, e]).current));
    setSaved(e);
  }

  async function patch(p: Partial<Entry>) {
    if (!saved) return;
    const next = { ...saved, ...p };
    setSaved(next);
    await updateEntry(next);
  }

  async function undo() {
    if (!saved) return;
    await deleteEntry(saved.id);
    setSaved(null);
    setPanel('none');
  }

  if (saved) {
    return (
      <Screen
        title="Quick log"
        onBack={() => go('/', { replace: true })}
        footer={
          <Primary big className="w-full" onClick={() => go('/', { replace: true })}>
            Done
          </Primary>
        }
      >
        <Celebration title="Saved 💛">
          <p>{line.current}</p>
          {milestone && <p className="mt-2 font-bold text-ink">{milestoneMessage(milestone)}</p>}
        </Celebration>

        <div className="mt-8 space-y-3">
          {panel === 'trigger' ? (
            <div className="anim-fade-up">
              <h2 className="mb-2 font-extrabold">What set it off? (optional)</h2>
              <ChipPicker
                options={triggerOpts}
                selected={saved.triggers}
                onToggle={(n) =>
                  void patch({
                    triggers: saved.triggers.includes(n) ? saved.triggers.filter((x) => x !== n) : [...saved.triggers, n],
                  })
                }
              />
            </div>
          ) : (
            <Secondary className="w-full" onClick={() => setPanel('trigger')}>
              🔍 Add a trigger?
            </Secondary>
          )}
          {panel === 'note' ? (
            <NoteField startOpen value={saved.note} onChange={(note) => void patch({ note })} />
          ) : (
            <Secondary className="w-full" onClick={() => setPanel('note')}>
              ✏️ Add a note?
            </Secondary>
          )}
          <div className="text-center">
            <LinkButton className="text-sm text-muted" onClick={() => void undo()}>
              Oops, undo this log
            </LinkButton>
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      title="Quick log"
      footer={
        <div>
          <h2 className="mb-2 font-extrabold">
            How strong?{' '}
            <span className="font-semibold text-muted">
              {emotions.length ? 'Tap a number to save' : 'Pick a feeling first'}
            </span>
          </h2>
          <ScalePicker label="How strong is it, 0 to 10? Tapping saves." onChange={(n) => void save(n)} disabled={!emotions.length} />
        </div>
      }
    >
      <h2 className="mb-3 mt-1 text-xl font-extrabold">How are you feeling?</h2>
      <p className="-mt-2 mb-3 text-sm text-muted">Pick as many as fit.</p>
      <ChipPicker options={emotionOpts} selected={emotions} onToggle={toggle} />
    </Screen>
  );
}
