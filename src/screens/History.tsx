import { useMemo, useState } from 'react';
import { useApp } from '../context';
import { go } from '../router';
import { dayKey, fmtDay, fromDayKey } from '../lib/dates';
import { byDay, dayMood } from '../lib/insights';
import { EntryCard } from '../components/EntryCard';
import { Primary, Screen, Secondary } from '../components/ui';

const PAGE = 20; // days per page

export function History() {
  const { entries } = useApp();
  const [days, setDays] = useState(PAGE);
  const grouped = useMemo(() => [...byDay(entries)].sort(([a], [b]) => b.localeCompare(a)), [entries]);
  return (
    <Screen title="All entries">
      {grouped.length === 0 && (
        <div className="mt-12 text-center">
          <p className="text-muted">Nothing here yet. Your entries will show up here 🌱</p>
          <Primary className="mt-6" onClick={() => go('/quick')}>
            Do a quick log
          </Primary>
        </div>
      )}
      {grouped.slice(0, days).map(([k, es]) => (
        <DayGroup key={k} day={k} entries={es} />
      ))}
      {grouped.length > days && (
        <Secondary className="mt-6 w-full" onClick={() => setDays(days + PAGE)}>
          Show earlier days
        </Secondary>
      )}
    </Screen>
  );
}

export function DayView({ day }: { day: string }) {
  const { entries } = useApp();
  const es = entries.filter((e) => dayKey(e.createdAt) === day);
  return (
    <Screen title={fmtDay(fromDayKey(day))}>
      {es.length === 0 ? (
        <p className="mt-12 text-center text-muted">No entries on this day. That&rsquo;s okay 💛</p>
      ) : (
        <DayGroup day={day} entries={es} hideHeading />
      )}
    </Screen>
  );
}

function DayGroup({ day, entries, hideHeading }: { day: string; entries: import('../types').Entry[]; hideHeading?: boolean }) {
  const mood = dayMood(entries);
  const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <section className="mt-4">
      {!hideHeading && (
        <h2 className="mb-2 flex items-baseline justify-between font-extrabold">
          <span>{fmtDay(fromDayKey(day))}</span>
          {mood !== undefined && <span className="text-sm font-semibold text-muted">avg mood {mood.toFixed(1)}</span>}
        </h2>
      )}
      <div className="space-y-3">
        {sorted.map((e) => (
          <EntryCard key={e.id} entry={e} />
        ))}
      </div>
    </section>
  );
}
