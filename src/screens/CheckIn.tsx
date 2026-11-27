import { useEffect, useMemo, useRef, useState } from 'react';
import { addEntry, clearDraft, emptyEntry, getDraft, saveDraft, updateEntry } from '../db';
import { useApp } from '../context';
import { back, go } from '../router';
import { closestSlot, sortedSlots } from '../lib/slots';
import { orderByUsage } from '../lib/usage';
import { milestoneHit, milestoneMessage, streakInfo } from '../lib/streaks';
import { MEAL_OPTIONS, MED_OPTIONS, SLEEP_OPTIONS, SLEEP_QUALITY, STARTER_SKILLS } from '../defaults';
import { Celebration } from '../components/Celebration';
import {
  Card,
  ChipPicker,
  IconButton,
  LinkButton,
  NoteField,
  Primary,
  ScalePicker,
  Screen,
  Secondary,
  Segmented,
  Toggle,
  cx,
  type ChipOption,
} from '../components/ui';
import type { Acted, Body, Draft, Entry, Helped, ListItem } from '../types';

const STEPS = ['Feelings', 'Triggers', 'Urges', 'Body', 'Skills', 'Overall'] as const;
const RATED = new Set([0, 2, 4]); // steps with a pick → rate phase
type Phase = 'pick' | 'rate';

const ACTED_OPTS: { value: Acted; label: string }[] = [
  { value: 'no', label: 'No' },
  { value: 'little', label: 'A little' },
  { value: 'yes', label: 'Yes' },
];
const HELPED_OPTS: { value: Helped; label: string }[] = [
  { value: 0, label: 'Didn’t help' },
  { value: 1, label: 'Helped a bit' },
  { value: 2, label: 'Helped a lot' },
];

export function CheckIn({ mode, editId }: { mode: 'new' | 'resume' | 'edit'; editId?: string }) {
  const { settings, entries, usage } = useApp();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('pick');
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(null);
  const [done, setDone] = useState<{ entry: Entry; milestone?: number } | null>(null);
  const loaded = useRef(false);

  // ----- Load: edit an entry, resume a draft, or start fresh -----
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    if (mode === 'edit') {
      const e = entries.find((x) => x.id === editId);
      if (e) setEntry(structuredClone(e));
      return;
    }
    void getDraft().then((d) => {
      if (d && mode === 'resume') {
        setEntry(d.entry);
        setStep(d.step);
        setPhase(d.phase);
      } else if (d) {
        setPendingDraft(d);
      } else {
        setEntry({ ...emptyEntry('checkin'), slot: closestSlot(settings.slots)?.name });
      }
    });
  }, [mode, editId, entries, settings.slots]);

  // ----- Autosave every change as a draft (not when editing history) -----
  useEffect(() => {
    if (!entry || mode === 'edit' || done) return;
    void saveDraft({ entry, step, phase, updatedAt: new Date().toISOString() });
  }, [entry, step, phase, mode, done]);

  // Freeze option order for this session so chips don't move under a finger.
  const opts = useMemo(
    () => ({
      emotions: orderByUsage(settings.lists.emotions, usage.emotions, settings.floatFavourites),
      triggers: orderByUsage(settings.lists.triggers, usage.triggers, settings.floatFavourites),
      urges: orderByUsage(settings.lists.urges, usage.urges, settings.floatFavourites),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.lists],
  );

  if (mode === 'edit' && !entry)
    return (
      <Screen title="Edit entry">
        <p className="mt-8 text-center text-muted">That entry couldn&rsquo;t be found. It may have been deleted.</p>
      </Screen>
    );

  if (pendingDraft)
    return (
      <Screen title="Check-in">
        <div className="mt-10 text-center">
          <div aria-hidden className="text-5xl">
            📝
          </div>
          <h2 className="mt-4 text-2xl font-extrabold">Pick up where you left off?</h2>
          <p className="mt-2 text-muted">
            You got to step {pendingDraft.step + 1} of {STEPS.length}. It&rsquo;s all saved.
          </p>
        </div>
        <div className="mt-10 grid gap-3">
          <Primary
            big
            onClick={() => {
              setEntry(pendingDraft.entry);
              setStep(pendingDraft.step);
              setPhase(pendingDraft.phase);
              setPendingDraft(null);
            }}
          >
            Yes, carry on
          </Primary>
          <Secondary
            big
            onClick={() => {
              void clearDraft();
              setEntry({ ...emptyEntry('checkin'), slot: closestSlot(settings.slots)?.name });
              setPendingDraft(null);
            }}
          >
            Start fresh
          </Secondary>
        </div>
      </Screen>
    );

  if (done) return <Done entry={done.entry} milestone={done.milestone} />;
  if (!entry) return <div className="min-h-dvh" aria-busy="true" />;

  const set = (p: Partial<Entry>) => setEntry((e) => (e ? { ...e, ...p } : e));
  const setBody = (p: Partial<Body>) => setEntry((e) => (e ? { ...e, body: { ...e.body, ...p } } : e));

  const selectedCount = step === 0 ? entry.emotions.length : step === 2 ? entry.urges.length : step === 4 ? entry.skills.length : 0;

  function goTo(s: number, p: Phase = 'pick') {
    setStep(Math.max(0, Math.min(STEPS.length - 1, s)));
    setPhase(p);
    window.scrollTo(0, 0);
  }

  function next() {
    if (RATED.has(step) && phase === 'pick' && selectedCount > 0) return goTo(step, 'rate');
    if (step === STEPS.length - 1) return void finish();
    goTo(step + 1);
  }

  function prev() {
    if (phase === 'rate') return goTo(step, 'pick');
    if (step === 0) return back();
    const p = step - 1;
    const hasSel = p === 0 ? entry!.emotions.length : p === 2 ? entry!.urges.length : p === 4 ? entry!.skills.length : 0;
    goTo(p, RATED.has(p) && hasSel ? 'rate' : 'pick');
  }

  async function finish() {
    const e = entry!;
    if (mode === 'edit') {
      await updateEntry(e);
      back('/history');
      return;
    }
    const before = streakInfo(entries).current;
    await addEntry(e);
    await clearDraft();
    setDone({ entry: e, milestone: milestoneHit(before, streakInfo([...entries, e]).current) });
  }

  const toggleIn = <T extends { name: string }>(list: T[], name: string, make: () => T) =>
    list.some((x) => x.name === name) ? list.filter((x) => x.name !== name) : [...list, make()];

  const isLast = step === STEPS.length - 1;

  return (
    <Screen
      title={mode === 'edit' ? 'Edit entry' : 'Check-in'}
      onBack={prev}
      right={
        <IconButton label={mode === 'edit' ? 'Close without saving' : 'Close (your progress is saved)'} onClick={() => back()}>
          <span aria-hidden>✕</span>
        </IconButton>
      }
      footer={
        <div className={cx('grid gap-3', isLast ? 'grid-cols-2' : 'grid-cols-[1fr_2fr]')}>
          <Secondary big onClick={isLast ? () => void finish() : () => goTo(step + 1)}>
            {isLast ? 'Skip & save' : 'Skip'}
          </Secondary>
          <Primary big onClick={next}>
            {isLast ? (mode === 'edit' ? 'Save changes' : 'Save') : 'Next'}
          </Primary>
        </div>
      }
    >
      <Progress step={step} onJump={(s) => goTo(s)} />

      {step === 0 && phase === 'pick' && (
        <StepPick title="What are you feeling?" hint="Pick as many as fit.">
          <ChipPicker
            options={opts.emotions}
            selected={entry.emotions.map((x) => x.name)}
            onToggle={(n) => set({ emotions: toggleIn(entry.emotions, n, () => ({ name: n })) })}
          />
        </StepPick>
      )}
      {step === 0 && phase === 'rate' && (
        <StepPick title="How strong is each one?" hint="Rough is fine.">
          <div className="space-y-5">
            {entry.emotions.map((em) => (
              <div key={em.name}>
                <h3 className="mb-2 font-bold">
                  {settings.lists.emotions.find((x) => x.name === em.name)?.emoji} {em.name}
                </h3>
                <ScalePicker
                  label={`How strong is ${em.name}?`}
                  value={em.intensity}
                  onChange={(n) =>
                    set({ emotions: entry.emotions.map((x) => (x.name === em.name ? { ...x, intensity: n } : x)) })
                  }
                />
              </div>
            ))}
          </div>
        </StepPick>
      )}

      {step === 1 && (
        <StepPick title="Anything set it off?" hint="Triggers are just information. Pick any that fit, or skip.">
          <ChipPicker
            options={opts.triggers}
            selected={entry.triggers}
            onToggle={(n) =>
              set({ triggers: entry.triggers.includes(n) ? entry.triggers.filter((x) => x !== n) : [...entry.triggers, n] })
            }
          />
        </StepPick>
      )}

      {step === 2 && phase === 'pick' && (
        <StepPick title="Any urges right now?" hint="Noticing urges is a skill. There are no wrong answers.">
          <ChipPicker
            options={opts.urges}
            selected={entry.urges.map((x) => x.name)}
            onToggle={(n) => set({ urges: toggleIn(entry.urges, n, () => ({ name: n })) })}
          />
        </StepPick>
      )}
      {step === 2 && phase === 'rate' && (
        <StepPick title="About those urges" hint="Just noticing. Whatever happened is okay to note here.">
          <div className="space-y-4">
            {entry.urges.map((u) => {
              const upd = (p: Partial<typeof u>) =>
                set({ urges: entry.urges.map((x) => (x.name === u.name ? { ...x, ...p } : x)) });
              return (
                <Card key={u.name}>
                  <h3 className="mb-2 font-extrabold">{u.name}</h3>
                  <p className="mb-2 text-sm font-semibold text-muted">How strong?</p>
                  <ScalePicker label={`How strong is the urge to ${u.name}?`} value={u.strength} onChange={(n) => upd({ strength: n })} />
                  <p className="mb-2 mt-4 text-sm font-semibold text-muted">Did you act on it?</p>
                  <Segmented label={`Did you act on ${u.name}?`} options={ACTED_OPTS} value={u.acted} onChange={(v) => upd({ acted: v })} />
                </Card>
              );
            })}
          </div>
        </StepPick>
      )}

      {step === 3 && <BodyStep body={entry.body ?? {}} setBody={setBody} />}

      {step === 4 && phase === 'pick' && (
        <StepPick title="Any skills you used?" hint="Anything counts, including your own.">
          <SkillPicker
            skills={settings.lists.skills}
            groups={settings.skillGroups}
            usage={usage.skills}
            selected={entry.skills.map((s) => s.name)}
            onToggle={(n) => set({ skills: toggleIn(entry.skills, n, () => ({ name: n })) })}
          />
        </StepPick>
      )}
      {step === 4 && phase === 'rate' && (
        <StepPick title="Did they help?" hint="All useful to know. Even “didn’t help” teaches you something.">
          <div className="space-y-4">
            {entry.skills.map((s) => (
              <div key={s.name}>
                <h3 className="mb-2 font-bold">{s.name}</h3>
                <Segmented
                  label={`Did ${s.name} help?`}
                  options={HELPED_OPTS}
                  value={s.helped}
                  onChange={(v) => set({ skills: entry.skills.map((x) => (x.name === s.name ? { ...x, helped: v } : x)) })}
                />
              </div>
            ))}
          </div>
        </StepPick>
      )}

      {step === 5 && (
        <StepPick title="Overall, how are you right now?" hint="0 is really hard, 10 is really good.">
          <ScalePicker
            label="Overall mood, 0 to 10"
            value={entry.overallMood}
            onChange={(n) => set({ overallMood: n })}
            low="Really hard"
            high="Really good"
          />
          {settings.slots.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-muted">This check-in is for</h3>
              <Segmented
                label="Check-in time"
                options={sortedSlots(settings.slots).map((s) => ({ value: s.name, label: s.name }))}
                value={entry.slot}
                onChange={(v) => set({ slot: v })}
                cols={Math.min(3, settings.slots.length)}
              />
            </div>
          )}
          <div className="mt-6">
            <NoteField value={entry.note} onChange={(note) => set({ note })} />
          </div>
        </StepPick>
      )}
    </Screen>
  );
}

function Progress({ step, onJump }: { step: number; onJump: (s: number) => void }) {
  return (
    <div className="mb-2">
      <p className="text-center text-sm font-bold text-muted" aria-live="polite">
        {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>
      <div className="flex justify-center">
        {STEPS.map((name, i) => (
          <button
            key={name}
            type="button"
            onClick={() => onJump(i)}
            aria-label={`Go to step ${i + 1}: ${name}`}
            aria-current={i === step ? 'step' : undefined}
            className="grid h-12 w-12 place-items-center"
          >
            <span
              className={cx(
                'block rounded-full transition-all',
                i === step ? 'h-3 w-8 bg-peach' : i < step ? 'h-3 w-3 bg-sage' : 'h-3 w-3 border-2 border-line',
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function StepPick({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="anim-fade-up">
      <h2 className="text-xl font-extrabold">{title}</h2>
      {hint && <p className="mb-4 mt-1 text-[0.95rem] text-muted">{hint}</p>}
      {children}
    </section>
  );
}

function BodyStep({ body, setBody }: { body: Body; setBody: (p: Partial<Body>) => void }) {
  const [showPain, setShowPain] = useState(body.pain !== undefined);
  return (
    <StepPick title="Body basics" hint="Tap what you know. Skip the rest.">
      <h3 className="mb-2 font-bold">😴 Sleep last night <span className="font-semibold text-muted">(hours)</span></h3>
      <Segmented
        label="Hours of sleep last night"
        options={SLEEP_OPTIONS.map((v) => ({ value: v, label: v }))}
        value={body.sleepHours}
        onChange={(v) => setBody({ sleepHours: v })}
      />
      <div className="mt-2">
        <Segmented
          label="Sleep quality"
          options={SLEEP_QUALITY.map((q) => ({ value: q.value, label: q.label, emoji: q.emoji }))}
          value={body.sleepQuality}
          onChange={(v) => setBody({ sleepQuality: v })}
        />
      </div>

      <h3 className="mb-2 mt-6 font-bold">🍽️ Meals today</h3>
      <Segmented label="Meals today" options={MEAL_OPTIONS.map((v) => ({ value: v, label: v }))} value={body.meals} onChange={(v) => setBody({ meals: v })} />

      <h3 className="mb-2 mt-6 font-bold">💊 Meds</h3>
      <Segmented label="Meds" options={MED_OPTIONS.map((v) => ({ value: v, label: v }))} value={body.meds} onChange={(v) => setBody({ meds: v })} />

      <h3 className="mb-2 mt-6 font-bold">Extras <span className="font-semibold text-muted">(optional)</span></h3>
      <div className="grid grid-cols-2 gap-2">
        <Toggle emoji="💧" label="Water" on={!!body.water} onChange={(v) => setBody({ water: v })} />
        <Toggle emoji="🚶" label="Movement" on={!!body.movement} onChange={(v) => setBody({ movement: v })} />
      </div>
      <div className="mt-3">
        {showPain ? (
          <>
            <h3 className="mb-2 font-bold">Pain</h3>
            <ScalePicker label="Pain, 0 to 10" value={body.pain} onChange={(n) => setBody({ pain: n })} low="None" high="Severe" />
          </>
        ) : (
          <LinkButton onClick={() => setShowPain(true)}>+ Add pain level</LinkButton>
        )}
      </div>
    </StepPick>
  );
}

function SkillPicker({
  skills,
  groups,
  usage,
  selected,
  onToggle,
}: {
  skills: ListItem[];
  groups: string[];
  usage: Map<string, number>;
  selected: string[];
  onToggle: (n: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const visible = skills.filter((s) => !s.hidden);
  // "Go-tos": most used, else a gentle starter set.
  const goTos = useMemo(() => {
    const used = orderByUsage(visible, usage).filter((s) => (usage.get(s.name) ?? 0) > 0);
    const starter = STARTER_SKILLS.map((n) => visible.find((s) => s.name === n)).filter((s): s is ListItem => !!s);
    const merged = [...used, ...starter.filter((s) => !used.includes(s)), ...visible];
    return [...new Map(merged.map((s) => [s.name, s])).values()].slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills]);
  const goToNames = new Set(goTos.map((s) => s.name));
  const extraSelected = visible.filter((s) => selected.includes(s.name) && !goToNames.has(s.name));
  const asOpts = (xs: ListItem[]): ChipOption[] => xs.map((s) => ({ name: s.name, emoji: s.emoji }));

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold text-muted">Your go-tos</h3>
      <ChipPicker options={asOpts([...goTos, ...(open ? [] : extraSelected)])} selected={selected} onToggle={onToggle} initial={99} />
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="mt-3 min-h-12 w-full rounded-2xl border-2 border-dashed border-line font-semibold text-muted"
      >
        {open ? 'Show fewer' : 'More skills, by module…'}
      </button>
      {open &&
        groups.map((g) => {
          const inGroup = visible.filter((s) => (s.group ?? 'My own') === g && !goToNames.has(s.name));
          if (!inGroup.length) return null;
          return (
            <div key={g} className="mt-4">
              <h3 className="mb-2 text-sm font-bold text-muted">{g}</h3>
              <ChipPicker options={asOpts(inGroup)} selected={selected} onToggle={onToggle} initial={99} />
            </div>
          );
        })}
    </div>
  );
}

function summary(e: Entry): string {
  const n = (k: number, w: string) => `${k} ${w}${k === 1 ? '' : 's'}`;
  const noticed = [e.emotions.length && n(e.emotions.length, 'emotion'), e.urges.length && n(e.urges.length, 'urge')].filter(
    Boolean,
  ) as string[];
  const parts: string[] = [];
  if (noticed.length) parts.push(`noticed ${noticed.join(' and ')}`);
  if (e.skills.length) parts.push(`used ${n(e.skills.length, 'skill')}`);
  if (!parts.length) return 'You took a moment to check in with yourself. That counts.';
  return `You ${parts.join(parts.length > 1 && noticed.length > 1 ? ', and ' : ' and ')}. Nice work tuning in.`;
}

function Done({ entry, milestone }: { entry: Entry; milestone?: number }) {
  return (
    <Screen
      title="Check-in"
      onBack={() => go('/', { replace: true })}
      footer={
        <Primary big className="w-full" onClick={() => go('/', { replace: true })}>
          Back home
        </Primary>
      }
    >
      <Celebration title="Check-in saved 💛" />
      <Card className="anim-fade-up mt-8 bg-sage-soft text-center">
        <p className="text-lg font-bold">{summary(entry)}</p>
        {milestone && <p className="mt-2 font-semibold">{milestoneMessage(milestone)}</p>}
      </Card>
    </Screen>
  );
}
