import { useState } from 'react';
import { renameInEntries, uid, updateSettings } from '../db';
import { toast, useApp } from '../context';
import { DEFAULT_EMOTIONS, DEFAULT_SKILLS, DEFAULT_TRIGGERS, DEFAULT_URGES } from '../defaults';
import { IconButton, LinkButton, Primary, Screen, SectionTitle, cx } from '../components/ui';
import type { ListItem, ListKind } from '../types';
import { LIST_TITLES } from './Settings';

const DEFAULTS: Record<ListKind, ListItem[]> = {
  emotions: DEFAULT_EMOTIONS,
  triggers: DEFAULT_TRIGGERS,
  urges: DEFAULT_URGES,
  skills: DEFAULT_SKILLS,
};

const inputCls = 'min-h-12 w-full rounded-2xl border-2 border-line bg-surface px-3 font-semibold text-ink';

export function ListEditor({ kind }: { kind: ListKind }) {
  const { settings } = useApp();
  const list = settings.lists[kind];
  const groups = kind === 'skills' ? settings.skillGroups : [undefined];

  async function move(id: string, dir: -1 | 1) {
    await updateSettings((s) => {
      const xs = s.lists[kind];
      const i = xs.findIndex((x) => x.id === id);
      const sameGroup = (j: number) => kind !== 'skills' || xs[j].group === xs[i].group;
      let j = i + dir;
      while (j >= 0 && j < xs.length && !sameGroup(j)) j += dir;
      if (j < 0 || j >= xs.length) return;
      [xs[i], xs[j]] = [xs[j], xs[i]];
    });
  }

  async function restoreDefaults() {
    await updateSettings((s) => {
      const names = new Set(s.lists[kind].map((x) => x.name));
      s.lists[kind].forEach((x) => (x.hidden = false));
      s.lists[kind].push(...structuredClone(DEFAULTS[kind]).filter((x) => !names.has(x.name)));
    });
    toast('Defaults are back, and everything is showing');
  }

  return (
    <Screen title={`Edit ${LIST_TITLES[kind].toLowerCase()}`}>
      <p className="text-sm text-muted">
        Tap a name to rename it (past entries update too). Hidden options stay in your history but won&rsquo;t show when logging.
      </p>
      {groups.map((g) => {
        const items = list.filter((x) => kind !== 'skills' || (x.group ?? 'My own') === g);
        return (
          <section key={g ?? 'all'}>
            {g && <SectionTitle>{g}</SectionTitle>}
            <ul className={cx('space-y-2', !g && 'mt-4')}>
              {items.map((item, idx) => (
                <Row
                  key={item.id}
                  kind={kind}
                  item={item}
                  first={idx === 0}
                  last={idx === items.length - 1}
                  onMove={(d) => void move(item.id, d)}
                  taken={list.map((x) => x.name)}
                />
              ))}
            </ul>
            <AddItem kind={kind} group={g} taken={list.map((x) => x.name)} />
          </section>
        );
      })}
      <div className="mt-6 text-center">
        <LinkButton onClick={() => void restoreDefaults()}>Bring back the default options</LinkButton>
      </div>
    </Screen>
  );
}

function Row({
  kind,
  item,
  first,
  last,
  onMove,
  taken,
}: {
  kind: ListKind;
  item: ListItem;
  first: boolean;
  last: boolean;
  onMove: (d: -1 | 1) => void;
  taken: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [emoji, setEmoji] = useState(item.emoji ?? '');

  async function save() {
    const n = name.trim();
    if (!n) return;
    if (n !== item.name && taken.includes(n)) {
      toast('That name is already in the list');
      return;
    }
    await updateSettings((s) => {
      const x = s.lists[kind].find((y) => y.id === item.id);
      if (x) {
        x.name = n;
        if (kind === 'emotions') x.emoji = emoji.trim() || undefined;
      }
      if (kind === 'skills') s.cards.forEach((c) => c.skillName === item.name && (c.skillName = n));
    });
    await renameInEntries(kind, item.name, n);
    setEditing(false);
  }

  if (editing)
    return (
      <li className="rounded-3xl border border-line bg-surface p-3">
        <div className="flex gap-2">
          {kind === 'emotions' && (
            <label className="w-16">
              <span className="sr-only">Emoji</span>
              <input value={emoji} onChange={(e) => setEmoji(e.target.value)} className={cx(inputCls, 'text-center')} />
            </label>
          )}
          <label className="flex-1">
            <span className="sr-only">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoFocus />
          </label>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Primary onClick={() => void save()}>Save</Primary>
          <LinkButton
            onClick={() => {
              setName(item.name);
              setEmoji(item.emoji ?? '');
              setEditing(false);
            }}
          >
            Cancel
          </LinkButton>
        </div>
      </li>
    );

  return (
    <li className={cx('flex items-center gap-1 rounded-3xl border border-line bg-surface py-1 pl-1 pr-1', item.hidden && 'opacity-60')}>
      <button onClick={() => setEditing(true)} className="min-h-12 flex-1 rounded-2xl px-3 text-left font-semibold" aria-label={`Rename ${item.name}`}>
        {item.emoji && <span aria-hidden>{item.emoji} </span>}
        {item.name}
        {item.hidden && <span className="ml-1 text-sm font-normal text-muted">(hidden)</span>}
      </button>
      <IconButton label={`Move ${item.name} up`} onClick={() => onMove(-1)} disabled={first} className="disabled:opacity-25">
        ↑
      </IconButton>
      <IconButton label={`Move ${item.name} down`} onClick={() => onMove(1)} disabled={last} className="disabled:opacity-25">
        ↓
      </IconButton>
      <IconButton
        label={item.hidden ? `Show ${item.name}` : `Hide ${item.name}`}
        aria-pressed={!item.hidden}
        onClick={() =>
          void updateSettings((s) => {
            const x = s.lists[kind].find((y) => y.id === item.id);
            if (x) x.hidden = !x.hidden;
          })
        }
        className="text-base"
      >
        {item.hidden ? '🙈' : '👁️'}
      </IconButton>
    </li>
  );
}

function AddItem({ kind, group, taken }: { kind: ListKind; group?: string; taken: string[] }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  async function add() {
    const n = name.trim();
    if (!n) return;
    if (taken.includes(n)) {
      toast('That one is already in the list');
      return;
    }
    await updateSettings((s) => {
      const item: ListItem = { id: 'c-' + uid(), name: n, ...(emoji.trim() ? { emoji: emoji.trim() } : {}), ...(group ? { group } : {}) };
      // Insert after the last item of the same group so it lands in the right section.
      const xs = s.lists[kind];
      const lastIdx = group ? xs.map((x) => x.group).lastIndexOf(group) : xs.length - 1;
      xs.splice(lastIdx + 1, 0, item);
    });
    setName('');
    setEmoji('');
  }
  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void add();
      }}
    >
      {kind === 'emotions' && (
        <label className="w-16">
          <span className="sr-only">Emoji (optional)</span>
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🙂" className={cx(inputCls, 'text-center')} />
        </label>
      )}
      <label className="flex-1">
        <span className="sr-only">New {group ? `${group} skill` : 'option'}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={group ? `Add to ${group}…` : 'Add your own…'} className={inputCls} />
      </label>
      <Primary type="submit" disabled={!name.trim()}>
        Add
      </Primary>
    </form>
  );
}
