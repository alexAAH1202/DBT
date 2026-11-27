import { useMemo } from 'react';
import { clearDraft, setKV, updateSettings, useDraft, useKV } from '../db';
import { useApp, useNow } from '../context';
import { go } from '../router';
import { dayKey, daysBetween, greeting } from '../lib/dates';
import { doneSlotsToday, dueSlot, sortedSlots } from '../lib/slots';
import { streakInfo } from '../lib/streaks';
import { exportBackup } from '../lib/backup';
import { Banner, IconButton, LinkButton, Primary, cx } from '../components/ui';

export function Home() {
  const { settings, entries } = useApp();
  const now = useNow();
  const draft = useDraft();
  const dismissedSlot = useKV<string>('dismissedSlotBanner');

  const streak = useMemo(() => streakInfo(entries, now), [entries, now]);
  const done = doneSlotsToday(entries, now);
  const todaysQuick = entries.filter((e) => e.type !== 'checkin' && dayKey(e.createdAt) === dayKey(now)).length;
  const due = settings.reminderPrefs.inApp ? dueSlot(settings.slots, entries, now) : undefined;
  const dueKey = due ? `${dayKey(now)}:${due.name}` : '';
  const showDue = due && dismissedSlot !== dueKey && !draft;

  const backupDue = useMemo(() => {
    if (!entries.length) return false;
    const since = settings.lastBackupAt ?? entries[0].createdAt;
    if (daysBetween(new Date(since), now) < 7) return false;
    if (settings.backupReminderDismissedAt && daysBetween(new Date(settings.backupReminderDismissedAt), now) < 7) return false;
    return true;
  }, [entries, settings.lastBackupAt, settings.backupReminderDismissedAt, now]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="flex items-start justify-between">
        <div className="pt-2">
          <h1 className="text-2xl font-extrabold">{greeting(now)} 🌿</h1>
          <p className="mt-1 text-muted">How&rsquo;s it going right now?</p>
        </div>
        <IconButton label="Settings" onClick={() => go('/settings')} className="text-2xl">
          <span aria-hidden>⚙️</span>
        </IconButton>
      </header>

      <main className="flex flex-1 flex-col">
      {/* Today's check-ins */}
      <section aria-label="Today's check-ins" className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.95rem] font-semibold">
        {sortedSlots(settings.slots).map((s, i) => {
          const isDone = done.has(s.name);
          return (
            <span key={s.id} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className="text-muted">·</span>}
              <span className={cx('flex items-center gap-1.5', !isDone && 'text-muted')}>
                <span
                  aria-hidden
                  className={cx('inline-block h-2.5 w-2.5 rounded-full', isDone ? 'bg-sage' : 'border-2 border-line')}
                />
                {s.name}
                {isDone && <span aria-label="done">✓</span>}
              </span>
            </span>
          );
        })}
        {todaysQuick > 0 && (
          <span className="text-muted">
            · {todaysQuick} quick log{todaysQuick === 1 ? '' : 's'}
          </span>
        )}
      </section>

      {/* Gentle streak */}
      <section className="mt-3 rounded-3xl bg-sage-soft px-4 py-3">
        {entries.length === 0 ? (
          <p className="font-semibold">Welcome to Steady 🌱 Tap Quick log whenever you&rsquo;re ready.</p>
        ) : streak.returning ? (
          <>
            <p className="font-bold">Welcome back 💛</p>
            <p className="text-[0.95rem]">
              {streak.loggedToday ? 'Fresh start today. ' : 'Every day is a fresh start. '}
              You&rsquo;ve checked in on {streak.totalDays} day{streak.totalDays === 1 ? '' : 's'} total.
            </p>
          </>
        ) : (
          <>
            <p className="font-bold">
              🌿 {streak.current} day{streak.current === 1 ? '' : 's'} in a row
            </p>
            <p className="text-[0.95rem]">
              You&rsquo;ve checked in on {streak.totalDays} day{streak.totalDays === 1 ? '' : 's'} total.
            </p>
          </>
        )}
      </section>

      {/* Banners: at most one at a time, to keep decisions low */}
      <div className="mt-3 space-y-2">
        {draft && (
          <Banner
            emoji="📝"
            tone="peach"
            onDismiss={() => void clearDraft()}
            action={
              <Primary onClick={() => go('/checkin/resume')} className="w-full">
                Pick up where you left off
              </Primary>
            }
          >
            You have a check-in in progress.
          </Banner>
        )}
        {!draft && showDue && (
          <Banner
            emoji="🌤️"
            onDismiss={() => void setKV('dismissedSlotBanner', dueKey)}
            action={
              <Primary onClick={() => go('/checkin')} className="w-full">
                Start check-in
              </Primary>
            }
          >
            {due!.name} check-in is ready, whenever suits.
          </Banner>
        )}
        {!draft && !showDue && backupDue && (
          <Banner
            emoji="💾"
            tone="sage"
            onDismiss={() => void updateSettings((s) => void (s.backupReminderDismissedAt = new Date().toISOString()))}
            action={
              <LinkButton onClick={() => void exportBackup()}>
                Save a backup now
              </LinkButton>
            }
          >
            {settings.lastBackupAt
              ? `It’s been ${daysBetween(new Date(settings.lastBackupAt), now)} days since your last backup. Save one now?`
              : 'Your entries only live on this phone. Save a backup?'}
          </Banner>
        )}
      </div>

      {/* Tiles live in the thumb zone */}
      <nav aria-label="Main" className="mt-auto grid grid-cols-2 gap-3 pt-5">
        <button
          onClick={() => go('/quick')}
          className="col-span-2 flex min-h-32 flex-col items-start justify-end rounded-[2rem] bg-peach p-5 text-left text-on-fill shadow-md transition active:scale-[0.98]"
        >
          <span aria-hidden className="text-4xl">
            ⚡
          </span>
          <span className="mt-1 text-2xl font-extrabold">Quick log</span>
          <span className="font-semibold opacity-90">3 taps, done</span>
        </button>
        <Tile emoji="📝" title="Check-in" sub="Guided, ~2 min" className="bg-lav" onClick={() => go('/checkin')} />
        <Tile emoji="🌊" title="Riding a wave" sub="Skills for now" className="bg-sage" onClick={() => go('/wave')} />
        <Tile
          emoji="📈"
          title="My patterns"
          sub="Graphs & insights"
          className="col-span-2 bg-surface-2"
          onClick={() => go('/patterns')}
          row
        />
      </nav>
      </main>
    </div>
  );
}

function Tile({
  emoji,
  title,
  sub,
  onClick,
  className,
  row,
}: {
  emoji: string;
  title: string;
  sub: string;
  onClick: () => void;
  className?: string;
  row?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex rounded-[1.75rem] p-4 text-left shadow-sm transition active:scale-[0.98]',
        row ? 'min-h-16 items-center gap-3 text-ink' : 'min-h-28 flex-col items-start justify-end text-on-fill',
        className,
      )}
    >
      <span aria-hidden className="text-3xl">
        {emoji}
      </span>
      <span>
        <span className="block text-lg font-extrabold leading-tight">{title}</span>
        <span className="block text-sm font-semibold opacity-90">{sub}</span>
      </span>
    </button>
  );
}
