import { useMemo, type ReactNode } from 'react';

const COLOURS = ['var(--peach)', 'var(--sage)', 'var(--lav)', '#f7d58b', '#f3c1c9'];

/** Gentle confetti + glowing check. Confetti is hidden under prefers-reduced-motion. */
export function Celebration({ title, children }: { title: string; children?: ReactNode }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        bg: COLOURS[i % COLOURS.length],
        dx: `${((i * 53) % 80) - 40}px`,
        rot: `${((i * 97) % 540) - 270}deg`,
        dur: `${1.6 + ((i * 13) % 10) / 10}s`,
        delay: `${((i * 7) % 10) / 25}s`,
      })),
    [],
  );
  return (
    <div className="relative overflow-hidden pt-6 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {bits.map((b, i) => (
          <span
            key={i}
            className="confetti"
            style={
              {
                left: b.left,
                background: b.bg,
                '--dx': b.dx,
                '--rot': b.rot,
                '--dur': b.dur,
                '--delay': b.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="anim-pop anim-glow mx-auto grid h-24 w-24 place-items-center rounded-full bg-peach text-5xl font-black text-on-fill">
        <span aria-hidden>✓</span>
      </div>
      <h2 className="anim-fade-up mt-5 text-2xl font-extrabold" role="status">
        {title}
      </h2>
      {children && <div className="anim-fade-up mt-2 text-muted">{children}</div>}
    </div>
  );
}
