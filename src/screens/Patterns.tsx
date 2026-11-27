import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp, useIsDark } from '../context';
import { go } from '../router';
import { addDays, dayKey, fmtDay, fmtMonth, fmtShortDay, fmtTime, startOfDay } from '../lib/dates';
import {
  MIN_ENTRIES_FOR_INSIGHTS,
  RANGE_LABEL,
  byDay,
  dayMood,
  emotionFreq,
  inRange,
  insights,
  moodSeries,
  rangeStart,
  skillSentence,
  skillStats,
  triggerFreq,
  type Range,
} from '../lib/insights';
import { Card, IconButton, Primary, Screen, Secondary, SectionTitle, Segmented, Toggle, cx } from '../components/ui';
import { moodColour, moodRamp } from '../components/moodScale';
import type { Entry } from '../types';

// Validated (dataviz checks) series colours, light / dark.
const SERIES = {
  light: { mood: '#b85a2e', intensity: '#6f58ad', sleep: '#4f7d48', grid: '#ecdfd2', axis: '#6b5a52' },
  dark: { mood: '#dc8150', intensity: '#a48cdf', sleep: '#8fb886', grid: '#3d3337', axis: '#c7b9b1' },
};

export function Patterns() {
  const { entries } = useApp();
  const [range, setRange] = useState<Range>('30d');
  const ranged = useMemo(() => inRange(entries, range), [entries, range]);

  return (
    <Screen title="My patterns">
      <Segmented
        label="Time range"
        options={(Object.keys(RANGE_LABEL) as Range[]).map((r) => ({ value: r, label: RANGE_LABEL[r] }))}
        value={range}
        onChange={(v) => v && setRange(v)}
      />

      {entries.length === 0 ? (
        <Card className="mt-6 text-center">
          <div aria-hidden className="text-4xl">
            🌱
          </div>
          <p className="mt-2 font-bold">Your patterns will grow here.</p>
          <p className="mt-1 text-muted">Each log adds a little more to the picture.</p>
          <Primary className="mt-4" onClick={() => go('/quick')}>
            Do a quick log
          </Primary>
        </Card>
      ) : (
        <>
          <MoodGraph entries={ranged} range={range} allEntries={entries} />
          <InsightCards entries={entries} range={range} />
          <MoodCalendar entries={entries} />
          <SkillsRanking entries={ranged} />
          <FrequencyBars title="Top feelings" items={emotionFreq(ranged)} empty="No feelings logged in this range yet." />
          <FrequencyBars title="Top triggers" items={triggerFreq(ranged)} empty="No triggers logged in this range yet." />
          <Secondary className="mt-6 w-full" onClick={() => go('/history')}>
            See all entries
          </Secondary>
        </>
      )}
    </Screen>
  );
}

/* ---------------- Mood graph ---------------- */

function MoodGraph({ entries, range, allEntries }: { entries: Entry[]; range: Range; allEntries: Entry[] }) {
  const dark = useIsDark();
  const c = dark ? SERIES.dark : SERIES.light;
  const [showSleep, setShowSleep] = useState(false);
  const [showIntensity, setShowIntensity] = useState(false);
  const { points, daily } = useMemo(() => moodSeries(entries), [entries]);

  const now = new Date();
  const start = (rangeStart(range, now) ?? startOfDay(new Date(allEntries[0].createdAt))).getTime();
  const end = addDays(startOfDay(now), 1).getTime();
  const data = useMemo(() => [...points, ...daily].sort((a, b) => a.t - b.t), [points, daily]);
  const ticks = useMemo(() => {
    const n = 4;
    const span = end - start;
    return Array.from({ length: n + 1 }, (_, i) => start + (span * i) / n);
  }, [start, end]);
  const hasSleep = daily.some((d) => d.sleep !== undefined);

  return (
    <>
      <SectionTitle>Mood over time</SectionTitle>
      <Card className="px-2 pb-2">
        {points.length === 0 ? (
          <p className="px-2 py-6 text-center text-muted">
            Mood points come from the last step of a full check-in. Try one when you&rsquo;re ready 📝
          </p>
        ) : (
          <>
            <Legend
              items={[
                { label: 'Each check-in', swatch: <Dot colour={c.mood} /> },
                { label: 'Daily average', swatch: <LineSwatch colour={c.mood} /> },
                ...(showIntensity ? [{ label: 'Strongest feeling', swatch: <LineSwatch colour={c.intensity} dashed /> }] : []),
              ]}
            />
            <div className="h-56" role="img" aria-label={`Mood graph with ${points.length} check-ins. A list of entries is available under See all entries.`}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid stroke={c.grid} vertical={false} />
                  <XAxis
                    dataKey="t"
                    type="number"
                    scale="time"
                    domain={[start, end]}
                    ticks={ticks}
                    tickFormatter={(t) => fmtShortDay(new Date(t))}
                    stroke={c.axis}
                    tick={{ fill: c.axis, fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis domain={[0, 10]} ticks={[0, 5, 10]} stroke={c.axis} tick={{ fill: c.axis, fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<MoodTip />} cursor={{ stroke: c.axis, strokeDasharray: '3 3' }} />
                  <Line dataKey="dayAvg" stroke={c.mood} strokeWidth={2} dot={false} activeDot={false} connectNulls isAnimationActive={false} />
                  {showIntensity && (
                    <Line
                      dataKey="intensity"
                      stroke={c.intensity}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      connectNulls
                      isAnimationActive={false}
                    />
                  )}
                  <Line
                    dataKey="mood"
                    stroke="none"
                    dot={{ r: 4, fill: c.mood, stroke: dark ? '#292326' : '#fffdfa', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2 px-1">
          <Toggle label="Sleep" emoji="😴" on={showSleep} onChange={setShowSleep} />
          <Toggle label="Feeling strength" on={showIntensity} onChange={setShowIntensity} />
        </div>
      </Card>

      {showSleep && (
        <Card className="mt-3 px-2 pb-2">
          <h3 className="px-2 pt-1 text-sm font-bold">😴 Sleep (hours, approx.)</h3>
          {hasSleep ? (
            <div className="h-32" role="img" aria-label="Sleep hours per day">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily.filter((d) => d.sleep !== undefined)} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                  <CartesianGrid stroke={c.grid} vertical={false} />
                  <XAxis
                    dataKey="t"
                    type="number"
                    scale="time"
                    domain={[start, end]}
                    ticks={ticks}
                    tickFormatter={(t) => fmtShortDay(new Date(t))}
                    stroke={c.axis}
                    tick={{ fill: c.axis, fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis domain={[0, 12]} ticks={[0, 6, 12]} stroke={c.axis} tick={{ fill: c.axis, fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: c.grid }}
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <TipBox>
                          <b>{fmtShortDay(new Date(payload[0].payload.t))}</b>
                          <div>About {payload[0].payload.sleep} hours</div>
                        </TipBox>
                      ) : null
                    }
                  />
                  <Bar dataKey="sleep" fill={c.sleep} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="px-2 py-4 text-muted">No sleep logged in this range yet.</p>
          )}
        </Card>
      )}
    </>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink shadow-md">{children}</div>;
}

function MoodTip({ active, payload }: { active?: boolean; payload?: { payload: { t: number; mood?: number; dayAvg?: number; intensity?: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const d = new Date(p.t);
  return (
    <TipBox>
      <b>{p.mood !== undefined ? `${fmtShortDay(d)}, ${fmtTime(d.toISOString())}` : fmtShortDay(d)}</b>
      {p.mood !== undefined && <div>Mood {p.mood}</div>}
      {p.dayAvg !== undefined && <div>Day average {p.dayAvg.toFixed(1)}</div>}
      {p.intensity !== undefined && <div>Strongest feeling {p.intensity.toFixed(1)}</div>}
    </TipBox>
  );
}

function Legend({ items }: { items: { label: string; swatch: React.ReactNode }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 px-2 pb-1 pt-1 text-sm text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {i.swatch}
          {i.label}
        </li>
      ))}
    </ul>
  );
}
const Dot = ({ colour }: { colour: string }) => <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colour }} />;
const LineSwatch = ({ colour, dashed }: { colour: string; dashed?: boolean }) => (
  <span aria-hidden className="inline-block w-5 border-t-2" style={{ borderColor: colour, borderStyle: dashed ? 'dashed' : 'solid' }} />
);

/* ---------------- Insights ---------------- */

function InsightCards({ entries, range }: { entries: Entry[]; range: Range }) {
  const list = useMemo(() => insights(entries, range), [entries, range]);
  return (
    <>
      <SectionTitle>Things you might notice</SectionTitle>
      {entries.length < MIN_ENTRIES_FOR_INSIGHTS ? (
        <Card className="bg-lav-soft">
          <p className="font-semibold">Keep logging. Patterns appear after about a week 🌱</p>
          <p className="mt-1 text-sm text-muted">
            {entries.length} of {MIN_ENTRIES_FOR_INSIGHTS} entries so far.
          </p>
        </Card>
      ) : list.length === 0 ? (
        <Card className="bg-lav-soft">
          <p className="font-semibold">Nothing stands out in this range yet. That&rsquo;s okay. Try a longer range 🔭</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((i) => (
            <Card key={i.id} className="flex gap-3 bg-lav-soft">
              <span aria-hidden className="text-2xl">
                {i.emoji}
              </span>
              <p className="font-semibold">{i.text}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- Calendar ---------------- */

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function MoodCalendar({ entries }: { entries: Entry[] }) {
  const dark = useIsDark();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const days = useMemo(() => byDay(entries), [entries]);
  const todayK = dayKey(new Date());
  const lead = (month.getDay() + 6) % 7; // Monday-first
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const isCurrentMonth = month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth();

  return (
    <>
      <SectionTitle>Mood calendar</SectionTitle>
      <Card className="px-1.5 py-3">
        <div className="mb-1 flex items-center justify-between px-1">
          <IconButton label="Previous month" onClick={() => shift(-1)}>
            ‹
          </IconButton>
          <h3 className="font-extrabold" aria-live="polite">
            {fmtMonth(month)}
          </h3>
          <IconButton label="Next month" onClick={() => shift(1)} disabled={isCurrentMonth} className="disabled:opacity-30">
            ›
          </IconButton>
        </div>
        <div className="grid grid-cols-7 text-center text-xs font-bold text-muted" aria-hidden>
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="pb-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const k = dayKey(d);
            const es = days.get(k);
            const mood = es ? dayMood(es) : undefined;
            const col = mood !== undefined ? moodColour(mood, dark) : undefined;
            const label = `${fmtDay(d)}: ${es ? `${es.length} entr${es.length === 1 ? 'y' : 'ies'}` : 'no entries'}${
              mood !== undefined ? `, average mood ${mood.toFixed(1)}` : ''
            }`;
            return (
              <button
                key={i}
                aria-label={label}
                onClick={() => go(`/day/${k}`)}
                className="grid aspect-square min-h-12 place-items-center p-0.5"
              >
                <span
                  className={cx(
                    'relative grid h-full w-full place-items-center rounded-xl text-sm font-bold',
                    !col && 'text-muted',
                    k === todayK && 'ring-2 ring-ink',
                  )}
                  style={col ? { background: col.bg, color: col.fg } : undefined}
                >
                  {d.getDate()}
                  {es && mood === undefined && (
                    <span aria-hidden className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-muted" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 px-2">
          <div className="flex h-3 overflow-hidden rounded-full" aria-hidden>
            {moodRamp(dark).map((s) => (
              <span key={s.bg} className="flex-1" style={{ background: s.bg }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>Tougher days</span>
            <span>Brighter days</span>
          </div>
          <p className="mt-1 text-xs text-muted">A small dot means quick logs only. Tap any day to see it.</p>
        </div>
      </Card>
    </>
  );
}

/* ---------------- Skills ranking ---------------- */

function SkillsRanking({ entries }: { entries: Entry[] }) {
  const stats = useMemo(() => skillStats(entries), [entries]);
  return (
    <>
      <SectionTitle>Skills that helped</SectionTitle>
      <Card>
        {stats.length === 0 ? (
          <p className="text-muted">When you log skills, the ones that help most will show up here 🧰</p>
        ) : (
          <ol className="space-y-3">
            {stats.slice(0, 10).map((s) => (
              <li key={s.name}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold">{s.name}</span>
                  <span className="text-sm text-muted">
                    used {s.uses}×
                  </span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <div className="h-full rounded-full bg-sage" style={{ width: `${Math.max(4, (s.avg / 2) * 100)}%` }} />
                </div>
                <p className="mt-1 text-sm text-muted">{skillSentence(s)}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}

/* ---------------- Frequency bars ---------------- */

function FrequencyBars({ title, items, empty }: { title: string; items: { name: string; count: number }[]; empty: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <Card>
        {items.length === 0 ? (
          <p className="text-muted">{empty}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.name} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-2 text-[0.95rem]">
                <span className="truncate font-semibold" title={i.name}>
                  {i.name}
                </span>
                <span className="h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <span className="block h-full rounded-full bg-peach" style={{ width: `${(i.count / max) * 100}%` }} />
                </span>
                <span className="text-right font-bold">{i.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
