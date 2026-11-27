import { useState } from 'react';
import { uid, updateSettings } from '../db';
import { toast, useApp } from '../context';
import { back, go } from '../router';
import { DEFAULT_CARDS } from '../defaults';
import { Dialog, IconButton, LinkButton, Primary, Screen, Secondary, cx } from '../components/ui';
import type { DistressCard } from '../types';

export function CardsEditor() {
  const { settings } = useApp();
  const cards = settings.cards;

  const move = (i: number, d: -1 | 1) =>
    void updateSettings((s) => {
      const j = i + d;
      if (j < 0 || j >= s.cards.length) return;
      [s.cards[i], s.cards[j]] = [s.cards[j], s.cards[i]];
    });

  async function addCard() {
    const id = 'c-' + uid();
    await updateSettings((s) => {
      s.cards.push({ id, title: 'My skill', emoji: '💛', summary: '', steps: [], skillName: 'My skill', custom: true });
    });
    go(`/settings/card/${id}`);
  }

  return (
    <Screen title="Skill cards">
      <p className="text-sm text-muted">These are the cards on the Riding a wave screen. Hide any you don&rsquo;t use, edit the words, or add your own.</p>
      <ul className="mt-4 space-y-2">
        {cards.map((c, i) => (
          <li key={c.id} className={cx('flex items-center gap-1 rounded-3xl border border-line bg-surface p-1', c.hidden && 'opacity-60')}>
            <button className="min-h-12 flex-1 rounded-2xl px-3 text-left font-semibold" onClick={() => go(`/settings/card/${c.id}`)}>
              <span aria-hidden>{c.emoji} </span>
              {c.title}
              {c.hidden && <span className="ml-1 text-sm font-normal text-muted">(hidden)</span>}
            </button>
            <IconButton label={`Move ${c.title} up`} onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-25">
              ↑
            </IconButton>
            <IconButton label={`Move ${c.title} down`} onClick={() => move(i, 1)} disabled={i === cards.length - 1} className="disabled:opacity-25">
              ↓
            </IconButton>
            <IconButton
              label={c.hidden ? `Show ${c.title}` : `Hide ${c.title}`}
              className="text-base"
              onClick={() => void updateSettings((s) => void (s.cards[i].hidden = !s.cards[i].hidden))}
            >
              {c.hidden ? '🙈' : '👁️'}
            </IconButton>
          </li>
        ))}
      </ul>
      <Primary className="mt-4 w-full" onClick={() => void addCard()}>
        + Add your own card
      </Primary>
      <div className="mt-4 text-center">
        <LinkButton
          onClick={() =>
            void updateSettings((s) => {
              const ids = new Set(s.cards.map((c) => c.id));
              s.cards.push(...structuredClone(DEFAULT_CARDS).filter((c) => !ids.has(c.id)));
              s.cards.forEach((c) => (c.hidden = false));
            }).then(() => toast('All default cards are showing'))
          }
        >
          Bring back the default cards
        </LinkButton>
      </div>
    </Screen>
  );
}

const field = 'w-full rounded-2xl border-2 border-line bg-surface px-3 py-2 text-base font-semibold text-ink';

export function CardEdit({ id }: { id: string }) {
  const { settings } = useApp();
  const card = settings.cards.find((c) => c.id === id);
  const [draft, setDraft] = useState<DistressCard | undefined>(card && structuredClone(card));
  const [steps, setSteps] = useState(card?.steps.join('\n') ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!card || !draft)
    return (
      <Screen title="Card">
        <p className="mt-8 text-center text-muted">That card isn&rsquo;t here any more.</p>
      </Screen>
    );
  const original = DEFAULT_CARDS.find((c) => c.id === id);

  async function save() {
    const next: DistressCard = {
      ...draft!,
      title: draft!.title.trim() || 'My skill',
      skillName: draft!.skillName.trim() || draft!.title.trim() || 'My skill',
      steps: steps
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    await updateSettings((s) => {
      s.cards = s.cards.map((c) => (c.id === id ? next : c));
      // Make sure the logged skill exists in the skills list so it can be picked in check-ins too.
      if (!s.lists.skills.some((x) => x.name === next.skillName))
        s.lists.skills.push({ id: 'c-' + uid(), name: next.skillName, group: 'My own' });
    });
    toast('Card saved');
    back('/settings/cards');
  }

  const set = (p: Partial<DistressCard>) => setDraft({ ...draft!, ...p });

  return (
    <Screen
      title="Edit card"
      footer={
        <Primary big className="w-full" onClick={() => void save()}>
          Save card
        </Primary>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <label className="w-20">
            <span className="mb-1 block text-sm font-bold text-muted">Emoji</span>
            <input value={draft.emoji} onChange={(e) => set({ emoji: e.target.value })} className={cx(field, 'min-h-12 text-center')} />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-sm font-bold text-muted">Title</span>
            <input value={draft.title} onChange={(e) => set({ title: e.target.value })} className={cx(field, 'min-h-12')} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-muted">Short description</span>
          <input value={draft.summary} onChange={(e) => set({ summary: e.target.value })} className={cx(field, 'min-h-12')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-muted">Steps (one per line)</span>
          <textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={8} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-muted">Logged as skill</span>
          <input
            value={draft.skillName}
            onChange={(e) => set({ skillName: e.target.value })}
            list="skill-names"
            className={cx(field, 'min-h-12')}
          />
          <datalist id="skill-names">
            {settings.lists.skills.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </label>
        <div className="grid gap-2">
          {original && (
            <Secondary
              onClick={() => {
                setDraft({ ...structuredClone(original), hidden: draft.hidden });
                setSteps(original.steps.join('\n'));
              }}
            >
              Reset to the original wording
            </Secondary>
          )}
          {draft.custom && <Secondary onClick={() => setConfirmDelete(true)}>Delete this card</Secondary>}
        </div>
      </div>
      <Dialog
        open={confirmDelete}
        title="Delete this card?"
        onClose={() => setConfirmDelete(false)}
        actions={
          <>
            <Primary onClick={() => setConfirmDelete(false)}>Keep it</Primary>
            <Secondary
              onClick={async () => {
                await updateSettings((s) => void (s.cards = s.cards.filter((c) => c.id !== id)));
                setConfirmDelete(false);
                back('/settings/cards');
              }}
            >
              Yes, delete
            </Secondary>
          </>
        }
      >
        Past logs of this skill stay in your history.
      </Dialog>
    </Screen>
  );
}
