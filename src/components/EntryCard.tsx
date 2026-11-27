import { useState } from 'react';
import { deleteEntry } from '../db';
import { toast, useApp } from '../context';
import { go } from '../router';
import { fmtTime } from '../lib/dates';
import { Card, Dialog, Primary, Secondary } from './ui';
import type { Entry } from '../types';
import { moodColour } from './moodScale';

const TYPE_LABEL: Record<Entry['type'], string> = { quick: '⚡ Quick log', checkin: '📝 Check-in', skill: '🌊 Skill' };
const HELPED = ['didn’t help', 'helped a bit', 'helped a lot'];
const ACTED = { no: 'Didn’t act on it', little: 'Acted a little', yes: 'Acted on it' };

export function EntryCard({ entry }: { entry: Entry }) {
  const { settings } = useApp();
  const [confirm, setConfirm] = useState(false);
  const emoji = (n: string) => settings.lists.emotions.find((x) => x.name === n)?.emoji ?? '';
  const b = entry.body;
  const bodyBits = b
    ? [
        b.sleepHours && `Slept ${b.sleepHours}h${b.sleepQuality ? ` (${b.sleepQuality})` : ''}`,
        b.meals && `${b.meals} meal${b.meals === '1' ? '' : 's'}`,
        b.meds && `Meds: ${b.meds.toLowerCase()}`,
        b.water && '💧 Water',
        b.movement && '🚶 Movement',
        b.pain !== undefined && `Pain ${b.pain}/10`,
      ].filter(Boolean)
    : [];

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-muted">
          {fmtTime(entry.createdAt)} · {TYPE_LABEL[entry.type]}
          {entry.slot ? ` · ${entry.slot}` : ''}
        </div>
        {entry.overallMood !== undefined && (
          <span
            className="rounded-full px-3 py-1 text-sm font-extrabold"
            style={{ background: moodColour(entry.overallMood).bg, color: moodColour(entry.overallMood).fg }}
          >
            Mood {entry.overallMood}
          </span>
        )}
      </div>
      <dl className="mt-2 space-y-1.5 text-[0.95rem]">
        {entry.emotions.length > 0 && (
          <Row label="Felt">
            {entry.emotions.map((x) => `${emoji(x.name)} ${x.name}${x.intensity !== undefined ? ` ${x.intensity}` : ''}`).join(' · ')}
          </Row>
        )}
        {entry.triggers.length > 0 && <Row label="Triggers">{entry.triggers.join(' · ')}</Row>}
        {entry.urges.length > 0 && (
          <Row label="Noticed">
            {entry.urges
              .map((u) => `${u.name}${u.strength !== undefined ? ` ${u.strength}` : ''}${u.acted ? ` (${ACTED[u.acted].toLowerCase()})` : ''}`)
              .join(' · ')}
          </Row>
        )}
        {entry.skills.length > 0 && (
          <Row label="Skills">
            {entry.skills.map((s) => `${s.name}${s.helped !== undefined ? ` (${HELPED[s.helped]})` : ''}`).join(' · ')}
          </Row>
        )}
        {bodyBits.length > 0 && <Row label="Body">{bodyBits.join(' · ')}</Row>}
        {entry.note && <Row label="Note">{entry.note}</Row>}
      </dl>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Secondary onClick={() => go(`/edit/${entry.id}`)}>Edit</Secondary>
        <Secondary onClick={() => setConfirm(true)}>Delete</Secondary>
      </div>
      <Dialog
        open={confirm}
        title="Delete this entry?"
        onClose={() => setConfirm(false)}
        actions={
          <>
            <Primary onClick={() => setConfirm(false)}>Keep it</Primary>
            <Secondary
              onClick={async () => {
                setConfirm(false);
                await deleteEntry(entry.id);
                toast('Entry deleted');
              }}
            >
              Yes, delete
            </Secondary>
          </>
        }
      >
        This can&rsquo;t be undone, unless it&rsquo;s in a backup.
      </Dialog>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 font-bold text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{children}</dd>
    </div>
  );
}
