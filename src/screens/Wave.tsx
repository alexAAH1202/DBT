import { useState } from 'react';
import { addEntry, emptyEntry } from '../db';
import { toast, useApp } from '../context';
import { go } from '../router';
import { closestSlot } from '../lib/slots';
import { milestoneHit, milestoneMessage, streakInfo } from '../lib/streaks';
import { Breathing } from '../components/Breathing';
import { Card, Dialog, LinkButton, Primary, Screen, Secondary } from '../components/ui';
import type { DistressCard, Entry, Helped } from '../types';

function SafetyLine() {
  return (
    <p className="mt-8 text-center text-sm text-muted">
      If you&rsquo;re not safe right now, tell a nurse, or call{' '}
      <a href="tel:000" className="font-semibold underline">
        000
      </a>{' '}
      /{' '}
      <a href="tel:131114" className="font-semibold underline">
        Lifeline 13 11 14
      </a>
      .
    </p>
  );
}

export function Wave() {
  const { settings } = useApp();
  const [breathing, setBreathing] = useState(false);
  const cards = settings.cards.filter((c) => !c.hidden);
  return (
    <Screen title="Riding a wave 🌊">
      <p className="text-muted">Waves rise and fall. Pick something to help you ride this one out.</p>

      <Card className="mt-4 bg-sage-soft">
        {breathing ? (
          <Breathing />
        ) : (
          <button className="flex min-h-16 w-full items-center gap-3 text-left" onClick={() => setBreathing(true)}>
            <span aria-hidden className="text-4xl">
              🫧
            </span>
            <span>
              <span className="block text-lg font-extrabold">Breathe with me</span>
              <span className="block text-sm text-muted">
                In {settings.breathing.inhale}, out {settings.breathing.exhale}. Slow exhales calm the body.
              </span>
            </span>
          </button>
        )}
      </Card>

      <div className="mt-4 space-y-3">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => go(`/wave/${c.id}`)}
            className="flex min-h-24 w-full items-center gap-4 rounded-3xl border border-line bg-surface p-4 text-left shadow-sm transition active:scale-[0.99]"
          >
            <span aria-hidden className="text-4xl">
              {c.emoji}
            </span>
            <span className="flex-1">
              <span className="block text-lg font-extrabold">{c.title}</span>
              <span className="block text-[0.95rem] text-muted">{c.summary}</span>
            </span>
            <span aria-hidden className="text-muted">
              ›
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 text-center">
        <LinkButton onClick={() => go('/settings/cards')}>✏️ Add or edit skill cards</LinkButton>
      </div>
      <SafetyLine />
    </Screen>
  );
}

const HELP_OPTS: { v: Helped | undefined; label: string }[] = [
  { v: 2, label: 'Helped a lot' },
  { v: 1, label: 'Helped a bit' },
  { v: 0, label: 'Didn’t help this time' },
  { v: undefined, label: 'Not sure yet' },
];

export function WaveCard({ id }: { id: string }) {
  const { settings, entries } = useApp();
  const card = settings.cards.find((c) => c.id === id);
  const [logging, setLogging] = useState(false);
  const [breathing, setBreathing] = useState(false);
  if (!card)
    return (
      <Screen title="Skill">
        <p className="mt-8 text-center text-muted">That card isn&rsquo;t here any more.</p>
      </Screen>
    );

  async function log(helped: Helped | undefined) {
    const e: Entry = {
      ...emptyEntry('skill'),
      slot: closestSlot(settings.slots)?.name,
      skills: [{ name: (card as DistressCard).skillName, ...(helped !== undefined ? { helped } : {}) }],
    };
    const before = streakInfo(entries).current;
    await addEntry(e);
    setLogging(false);
    const m = milestoneHit(before, streakInfo([...entries, e]).current);
    toast(m ? milestoneMessage(m) : 'Logged 💛 Well done for using a skill.');
  }

  const mentionsBreathing = card.id === 'tipp' || /breath/i.test(card.steps.join(' '));

  return (
    <Screen
      title={card.title}
      footer={
        <Primary big className="w-full" onClick={() => setLogging(true)}>
          ✓ Log this
        </Primary>
      }
    >
      <div className="text-center">
        <div aria-hidden className="text-6xl">
          {card.emoji}
        </div>
        <p className="mt-2 text-lg font-semibold">{card.summary}</p>
      </div>
      <ol className="mt-6 space-y-3">
        {card.steps.map((s, i) => (
          <li key={i} className="flex gap-3 rounded-3xl bg-surface p-4 text-[1.05rem] leading-snug shadow-sm">
            <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-peach font-extrabold text-on-fill">
              {i + 1}
            </span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
      {mentionsBreathing && (
        <Card className="mt-4 bg-sage-soft">
          {breathing ? (
            <Breathing />
          ) : (
            <Secondary className="w-full" onClick={() => setBreathing(true)}>
              🫧 Open the breathing circle
            </Secondary>
          )}
        </Card>
      )}
      <SafetyLine />

      <Dialog
        open={logging}
        title={`How much did ${card.skillName} help?`}
        onClose={() => setLogging(false)}
        actions={
          <>
            {HELP_OPTS.map((o) => (
              <Secondary key={o.label} onClick={() => void log(o.v)}>
                {o.label}
              </Secondary>
            ))}
            <LinkButton onClick={() => setLogging(false)}>Cancel</LinkButton>
          </>
        }
      >
        Every time you try a skill counts.
      </Dialog>
    </Screen>
  );
}
