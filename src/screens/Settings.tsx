import { useRef, useState } from 'react';
import { clearAllData, db, uid, updateSettings } from '../db';
import { toast, useApp } from '../context';
import { go } from '../router';
import { relativeDays } from '../lib/dates';
import { sortedSlots } from '../lib/slots';
import {
  BackupError,
  exportBackup,
  exportCSV,
  parseBackup,
  restoreMerge,
  restoreReplace,
  summariseBackup,
  type Backup,
} from '../lib/backup';
import { notificationsSupported, requestNotificationPermission, testNotification } from '../lib/reminders';
import { seedDemo } from '../lib/demo';
import { fmtShortDay } from '../lib/dates';
import { Card, Dialog, IconButton, LinkButton, Primary, Screen, Secondary, SectionTitle, Segmented, Toggle } from '../components/ui';
import type { ListKind, Theme } from '../types';

export const LIST_TITLES: Record<ListKind, string> = {
  emotions: 'Feelings',
  triggers: 'Triggers',
  urges: 'Urges',
  skills: 'Skills',
};

const showDev = () => {
  try {
    return import.meta.env.DEV || localStorage.getItem('steady-dev') === '1';
  } catch {
    return import.meta.env.DEV;
  }
};

export function Settings() {
  const { settings, entries } = useApp();
  return (
    <Screen title="Settings">
      <SectionTitle className="mt-2">Appearance</SectionTitle>
      <Segmented<Theme>
        label="Theme"
        options={[
          { value: 'system', label: 'Match phone' },
          { value: 'light', label: 'Light', emoji: '☀️' },
          { value: 'dark', label: 'Dark', emoji: '🌙' },
        ]}
        value={settings.theme}
        onChange={(v) => void updateSettings((s) => void (s.theme = v ?? 'system'))}
      />

      <SlotsEditor />

      <SectionTitle>Your lists</SectionTitle>
      <p className="-mt-1 mb-2 text-sm text-muted">Add, rename, hide or reorder options.</p>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(LIST_TITLES) as ListKind[]).map((k) => (
          <Secondary key={k} onClick={() => go(`/settings/list/${k}`)}>
            {LIST_TITLES[k]}
          </Secondary>
        ))}
      </div>
      <div className="mt-2 grid">
        <Toggle
          label="Float my most-used options to the top"
          on={settings.floatFavourites}
          onChange={(v) => void updateSettings((s) => void (s.floatFavourites = v))}
        />
      </div>
      <Secondary className="mt-2 w-full" onClick={() => go('/settings/cards')}>
        🌊 Riding-a-wave skill cards
      </Secondary>

      <Reminders />

      <BackupSection />

      <SectionTitle>Your data</SectionTitle>
      <ClearData count={entries.length} />

      {showDev() && <DevTools />}

      <SectionTitle>About</SectionTitle>
      <Card className="text-[0.95rem]">
        <p>
          <b>Steady</b> keeps everything on this phone. No accounts, no tracking, and nothing is sent anywhere.
        </p>
        <p className="mt-2 text-muted">Version {__APP_VERSION__}</p>
      </Card>
    </Screen>
  );
}

/* ---------------- Slots ---------------- */

function SlotsEditor() {
  const { settings } = useApp();
  const original = useRef<string>('');
  const setSlot = (id: string, p: { name?: string; time?: string }) =>
    void updateSettings((s) => void (s.slots = s.slots.map((x) => (x.id === id ? { ...x, ...p } : x))));

  async function renameHistory(from: string, to: string) {
    if (!from || !to || from === to) return;
    await db.entries.where('type').anyOf('checkin', 'quick', 'skill').modify((e) => {
      if (e.slot === from) e.slot = to;
    });
  }

  return (
    <>
      <SectionTitle>Check-in times</SectionTitle>
      <p className="-mt-1 mb-2 text-sm text-muted">Each check-in is tagged with the closest time. You can change it when you save.</p>
      <div className="space-y-2">
        {sortedSlots(settings.slots).map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <label className="flex-1">
              <span className="sr-only">Name</span>
              <input
                value={s.name}
                onFocus={() => (original.current = s.name)}
                onChange={(e) => setSlot(s.id, { name: e.target.value })}
                onBlur={(e) => void renameHistory(original.current, e.target.value.trim())}
                className="min-h-12 w-full rounded-2xl border-2 border-line bg-surface px-3 font-semibold text-ink"
              />
            </label>
            <label>
              <span className="sr-only">Time for {s.name}</span>
              <input
                type="time"
                value={s.time}
                onChange={(e) => e.target.value && setSlot(s.id, { time: e.target.value })}
                className="min-h-12 rounded-2xl border-2 border-line bg-surface px-2 font-semibold text-ink"
              />
            </label>
            <IconButton
              label={`Remove ${s.name}`}
              onClick={() => void updateSettings((x) => void (x.slots = x.slots.filter((y) => y.id !== s.id)))}
            >
              ✕
            </IconButton>
          </div>
        ))}
      </div>
      <Secondary
        className="mt-2 w-full"
        onClick={() =>
          void updateSettings((s) => {
            s.slots.push({ id: uid(), name: s.slots.some((x) => x.name === 'Night') ? 'New time' : 'Night', time: '22:00' });
          })
        }
      >
        + Add a check-in time
      </Secondary>
    </>
  );
}

/* ---------------- Reminders ---------------- */

function Reminders() {
  const { settings } = useApp();
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(
    notificationsSupported() ? Notification.permission : 'unsupported',
  );
  const [explain, setExplain] = useState(false);
  const setPrefs = (p: Partial<typeof settings.reminderPrefs>) =>
    void updateSettings((s) => void (s.reminderPrefs = { ...s.reminderPrefs, ...p }));

  async function enable() {
    setExplain(false);
    const r = await requestNotificationPermission();
    setPerm(r);
    if (r === 'granted') {
      setPrefs({ notifications: true });
      await testNotification().catch(() => {});
    }
  }

  return (
    <>
      <SectionTitle>Reminders</SectionTitle>
      <div className="grid gap-2">
        <Toggle
          label="Show a gentle banner when a check-in is ready"
          on={settings.reminderPrefs.inApp}
          onChange={(v) => setPrefs({ inApp: v })}
        />
        {perm === 'unsupported' ? (
          <p className="text-sm text-muted">This browser can&rsquo;t show notifications. The banner and phone alarms below still work.</p>
        ) : perm === 'granted' ? (
          <>
            <Toggle
              label="Phone notifications (best effort)"
              on={settings.reminderPrefs.notifications}
              onChange={(v) => setPrefs({ notifications: v })}
            />
            {settings.reminderPrefs.notifications && (
              <LinkButton onClick={() => void testNotification()}>Send a test notification</LinkButton>
            )}
          </>
        ) : perm === 'denied' ? (
          <p className="text-sm text-muted">
            Notifications are switched off for Steady. If you&rsquo;d like them, allow them in Android Settings → Apps → Steady →
            Notifications.
          </p>
        ) : (
          <Secondary onClick={() => setExplain(true)}>🔔 Turn on phone notifications</Secondary>
        )}
      </div>

      <details className="mt-3 rounded-3xl border border-line bg-surface p-4">
        <summary className="min-h-12 cursor-pointer content-center font-bold">⏰ Want reminders you can rely on? Use phone alarms</summary>
        <div className="mt-2 space-y-2 text-[0.95rem]">
          <p className="text-muted">
            Web apps can&rsquo;t always wake up on time when closed, so Android may delay or skip notifications. Phone alarms always
            work:
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Open the <b>Clock</b> app and go to <b>Alarm</b>.</li>
            <li>Tap <b>+</b> and set the time for your first check-in.</li>
            <li>Tap <b>Label</b> and type <b>Steady check-in</b>.</li>
            <li>Choose the days you want, and a soft sound or vibrate only.</li>
            <li>Repeat for each check-in time{settings.slots.length ? ` (${sortedSlots(settings.slots).map((s) => s.time).join(', ')})` : ''}.</li>
          </ol>
          <p className="text-muted">When it goes off, open Steady from your home screen.</p>
        </div>
      </details>

      <Dialog
        open={explain}
        title="Gentle reminders 🔔"
        onClose={() => setExplain(false)}
        actions={
          <>
            <Primary onClick={() => void enable()}>Sounds good</Primary>
            <Secondary onClick={() => setExplain(false)}>Not now</Secondary>
          </>
        }
      >
        <p>
          Steady can send a soft nudge at your check-in times. Nothing leaves your phone. Android will ask you to allow it next.
        </p>
        <p className="mt-2">They&rsquo;re best effort: if the phone is very sleepy they might be late. You can switch them off any time.</p>
      </Dialog>
    </>
  );
}

/* ---------------- Backup ---------------- */

function BackupSection() {
  const { settings, entries } = useApp();
  const file = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<Backup | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    try {
      setIncoming(parseBackup(await f.text()));
    } catch (e) {
      setError(e instanceof BackupError ? e.message : 'That file couldn’t be read.');
    } finally {
      if (file.current) file.current.value = '';
    }
  }

  const sum = incoming ? summariseBackup(incoming) : null;

  return (
    <>
      <SectionTitle>Backup &amp; restore</SectionTitle>
      <Card>
        <p className="font-semibold">
          Last backup: {settings.lastBackupAt ? relativeDays(settings.lastBackupAt) : 'not yet'}
        </p>
        <p className="mt-1 text-sm text-muted">
          Your entries only live on this phone. A backup file lets you keep them safe or move to a new phone.
        </p>
        <div className="mt-3 grid gap-2">
          <Primary onClick={() => void exportBackup().then(() => toast('Backup saved to Downloads 💾'))}>💾 Save a backup</Primary>
          <Secondary onClick={() => file.current?.click()}>📂 Restore from a backup</Secondary>
          <Secondary onClick={() => void exportCSV()} disabled={!entries.length}>
            📄 Export entries as CSV
          </Secondary>
        </div>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </Card>

      <Dialog
        open={!!incoming && !confirmReplace}
        title="Restore this backup?"
        onClose={() => setIncoming(null)}
        actions={
          <>
            <Primary
              onClick={async () => {
                await restoreMerge(incoming!);
                setIncoming(null);
                toast('Backup merged 💛');
              }}
            >
              Merge with what&rsquo;s here
            </Primary>
            <Secondary onClick={() => setConfirmReplace(true)}>Replace everything</Secondary>
            <LinkButton onClick={() => setIncoming(null)}>Cancel</LinkButton>
          </>
        }
      >
        {sum && (
          <>
            <p>
              This backup has <b>{sum.count}</b> entr{sum.count === 1 ? 'y' : 'ies'}
              {sum.first ? ` from ${fmtShortDay(sum.first)} to ${fmtShortDay(sum.last!)}` : ''}, saved {fmtShortDay(sum.exportedAt)}.
            </p>
            <p className="mt-2">
              <b>Merge</b> keeps everything on this phone and adds anything new. <b>Replace</b> swaps what&rsquo;s here for the backup.
            </p>
          </>
        )}
      </Dialog>

      <Dialog
        open={confirmReplace}
        title="Replace everything?"
        onClose={() => setConfirmReplace(false)}
        actions={
          <>
            <Primary onClick={() => setConfirmReplace(false)}>Go back</Primary>
            <Secondary
              onClick={async () => {
                await restoreReplace(incoming!);
                setConfirmReplace(false);
                setIncoming(null);
                toast('Backup restored 💛');
              }}
            >
              Yes, replace
            </Secondary>
          </>
        }
      >
        The {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} and settings on this phone will be replaced by the{' '}
        {sum?.count ?? 0} in the backup.
      </Dialog>

      <Dialog
        open={!!error}
        title="Hmm, that didn't work"
        onClose={() => setError(null)}
        actions={<Primary onClick={() => setError(null)}>Okay</Primary>}
      >
        {error} Nothing on your phone was changed.
      </Dialog>
    </>
  );
}

/* ---------------- Clear data ---------------- */

function ClearData({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Secondary className="w-full" onClick={() => setOpen(true)}>
        Clear all data
      </Secondary>
      <Dialog
        open={open}
        title="Clear everything?"
        onClose={() => setOpen(false)}
        actions={
          <>
            <Primary
              onClick={async () => {
                await exportBackup();
                toast('Backup saved first 💾');
              }}
            >
              Save a backup first
            </Primary>
            <Secondary
              onClick={async () => {
                await clearAllData();
                setOpen(false);
                toast('All cleared. Fresh start 🌱');
                go('/', { replace: true });
              }}
            >
              Yes, clear {count} entr{count === 1 ? 'y' : 'ies'} and settings
            </Secondary>
            <LinkButton onClick={() => setOpen(false)}>Cancel</LinkButton>
          </>
        }
      >
        This removes all entries and settings from this phone. It can&rsquo;t be undone unless you have a backup.
      </Dialog>
    </>
  );
}

/* ---------------- Dev tools ---------------- */

function DevTools() {
  return (
    <>
      <SectionTitle>Developer: demo data</SectionTitle>
      <p className="-mt-1 mb-2 text-sm text-muted">Replaces all entries with generated ones (settings kept).</p>
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 7, 120].map((n) => (
          <Secondary
            key={n}
            onClick={async () => {
              await seedDemo(n);
              toast(`Seeded ${n} entries`);
            }}
          >
            {n}
          </Secondary>
        ))}
      </div>
    </>
  );
}
