import { useEffect, useRef, useState } from 'react';
import { updateSettings } from '../db';
import { useApp } from '../context';
import { IconButton, Primary, Toggle } from './ui';

/** Paced breathing: animated circle, inhale 4 / exhale 6 by default (adjustable). */
export function Breathing() {
  const { settings } = useApp();
  const { inhale, exhale, vibrate } = settings.breathing;
  const [running, setRunning] = useState(false);
  const st = useRef({ phase: 'in' as 'in' | 'out', left: inhale, rounds: 0 });
  const [view, setView] = useState(st.current);
  const { phase, left, rounds } = view;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const s = st.current;
      if (s.left > 1) {
        s.left -= 1;
      } else {
        s.phase = s.phase === 'in' ? 'out' : 'in';
        s.left = s.phase === 'in' ? inhale : exhale;
        if (s.phase === 'in') s.rounds += 1;
        if (vibrate && 'vibrate' in navigator) navigator.vibrate(s.phase === 'in' ? 60 : [30, 60, 30]);
      }
      setView({ ...s });
    }, 1000);
    return () => clearInterval(id);
  }, [running, inhale, exhale, vibrate]);

  function toggle() {
    if (running) {
      setRunning(false);
      return;
    }
    st.current = { phase: 'in', left: inhale, rounds: 0 };
    setView({ ...st.current });
    // Let the circle settle small before it starts to grow.
    requestAnimationFrame(() => requestAnimationFrame(() => setRunning(true)));
  }

  const setB = (p: Partial<typeof settings.breathing>) =>
    void updateSettings((s) => void (s.breathing = { ...s.breathing, ...p }));

  const big = running && phase === 'in';
  const dur = running ? (phase === 'in' ? inhale : exhale) : 0.6;

  return (
    <div className="text-center">
      <div className="relative mx-auto grid h-56 w-56 place-items-center">
        <div
          aria-hidden
          className="breath-circle absolute inset-0 rounded-full bg-sage"
          style={{
            transform: `scale(${big ? 1 : 0.55})`,
            transitionDuration: `${dur}s`,
            opacity: running ? (big ? 0.95 : 0.6) : 0.6,
          }}
        />
        <div className="relative" aria-live="polite">
          <div className="text-xl font-extrabold text-on-fill">
            {running ? (phase === 'in' ? 'Breathe in' : 'Breathe out') : 'Ready'}
          </div>
          <div className="text-4xl font-black text-on-fill" aria-hidden>
            {running ? left : ''}
          </div>
        </div>
      </div>
      {rounds > 0 && <p className="text-sm text-muted">{rounds} breath{rounds === 1 ? '' : 's'}. Nice and slow.</p>}

      <Primary big className="mt-3 w-full" onClick={toggle}>
        {running ? 'Pause' : 'Start breathing'}
      </Primary>

      <div className="mt-4 grid gap-2">
        <Stepper label="In" value={inhale} min={2} max={8} onChange={(v) => setB({ inhale: v })} />
        <Stepper label="Out" value={exhale} min={2} max={10} onChange={(v) => setB({ exhale: v })} />
      </div>
      <div className="mt-2 grid">
        <Toggle label="Gentle buzz on each change" emoji="📳" on={vibrate} onChange={(v) => setB({ vibrate: v })} />
      </div>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border-2 border-line bg-surface px-1">
      <IconButton label={`Shorter breath ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
        −
      </IconButton>
      <span className="font-bold whitespace-nowrap">
        Breathe {label.toLowerCase()} for {value}s
      </span>
      <IconButton label={`Longer breath ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
        +
      </IconButton>
    </div>
  );
}
