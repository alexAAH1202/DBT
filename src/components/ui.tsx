import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { back } from '../router';

const cx = (...xs: (string | false | undefined | null)[]) => xs.filter(Boolean).join(' ');
export { cx };

/* ---------------- Buttons ---------------- */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { big?: boolean };

export function Primary({ className, big, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'min-h-12 rounded-2xl bg-peach px-5 font-bold text-on-fill shadow-sm transition active:scale-[0.98] disabled:opacity-50',
        big && 'min-h-14 text-lg',
        className,
      )}
    />
  );
}

export function Secondary({ className, big, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'min-h-12 rounded-2xl border-2 border-line bg-surface px-5 font-semibold text-ink transition active:scale-[0.98] disabled:opacity-50',
        big && 'min-h-14 text-lg',
        className,
      )}
    />
  );
}

export function LinkButton({ className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx('min-h-12 rounded-xl px-3 font-semibold text-accent underline decoration-2 underline-offset-4', className)}
    />
  );
}

export function IconButton({ className, label, children, ...p }: BtnProps & { label: string }) {
  return (
    <button
      {...p}
      aria-label={label}
      title={label}
      className={cx('grid h-12 w-12 place-items-center rounded-full text-xl text-ink active:bg-surface-2', className)}
    >
      {children}
    </button>
  );
}

/* ---------------- Screen layout ---------------- */

export function Screen({
  title,
  children,
  footer,
  right,
  onBack,
  hideBack,
}: {
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
  hideBack?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-1 bg-bg/95 px-2 pb-1 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
        {!hideBack && (
          <IconButton label="Back" onClick={onBack ?? (() => back())}>
            <span aria-hidden>←</span>
          </IconButton>
        )}
        <h1 className={cx('flex-1 truncate text-lg font-extrabold', hideBack && 'pl-3')}>{title}</h1>
        {right}
      </header>
      <main className="flex-1 px-4 pb-6">{children}</main>
      {footer && (
        <footer className="sticky bottom-0 z-20 border-t border-line bg-bg/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          {footer}
        </footer>
      )}
    </div>
  );
}

export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...p} className={cx('rounded-3xl border border-line bg-surface p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)]', className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cx('mb-2 mt-6 text-base font-extrabold', className)}>{children}</h2>;
}

/* ---------------- Chips ---------------- */

export function Chip({
  selected,
  emoji,
  label,
  onClick,
  className,
}: {
  selected: boolean;
  emoji?: string;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'flex min-h-12 items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left text-[0.95rem] font-semibold leading-tight transition active:scale-[0.97]',
        selected ? 'border-transparent bg-peach text-on-fill shadow-sm' : 'border-line bg-surface text-ink',
        className,
      )}
    >
      {emoji && (
        <span aria-hidden className="text-xl">
          {emoji}
        </span>
      )}
      <span className="flex-1">{label}</span>
      {selected && (
        <span aria-hidden className="text-sm font-black">
          ✓
        </span>
      )}
    </button>
  );
}

export interface ChipOption {
  name: string;
  emoji?: string;
}

/** Shows the first `initial` options, then "More…". Selected options always stay visible. */
export function ChipPicker({
  options,
  selected,
  onToggle,
  initial = 8,
  cols = 2,
}: {
  options: ChipOption[];
  selected: string[];
  onToggle: (name: string) => void;
  initial?: number;
  cols?: 1 | 2;
}) {
  const [open, setOpen] = useState(false);
  const shown = open
    ? options
    : options.filter((o, i) => i < initial || selected.includes(o.name));
  const hiddenCount = options.length - shown.length;
  return (
    <div>
      <div className={cx('grid gap-2', cols === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
        {shown.map((o) => (
          <Chip
            key={o.name}
            label={o.name}
            emoji={o.emoji}
            selected={selected.includes(o.name)}
            onClick={() => onToggle(o.name)}
          />
        ))}
      </div>
      {(hiddenCount > 0 || open) && options.length > initial && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="mt-2 min-h-12 w-full rounded-2xl border-2 border-dashed border-line font-semibold text-muted"
        >
          {open ? 'Show fewer' : `More… (${hiddenCount})`}
        </button>
      )}
    </div>
  );
}

/* ---------------- 0–10 scale ---------------- */

// Lavender → peach → apricot. Never red. Dark text on every step (WCAG AA).
export const SCALE_COLOURS = [
  '#ece8f4',
  '#e5ddf0',
  '#e1d4ea',
  '#e8d0de',
  '#efcfcc',
  '#f5d0b9',
  '#f6c3a4',
  '#f4b590',
  '#f0a77d',
  '#ec996c',
  '#e78e60',
];

export function ScalePicker({
  value,
  onChange,
  label,
  low = 'Barely',
  high = 'Very strong',
  disabled,
}: {
  value?: number;
  onChange: (n: number) => void;
  label: string;
  low?: string;
  high?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-labelledby={id} className={cx(disabled && 'opacity-50')}>
      <span id={id} className="sr-only">
        {label}
      </span>
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} out of 10`}
            disabled={disabled}
            onClick={() => onChange(n)}
            style={{ backgroundColor: SCALE_COLOURS[n] }}
            className={cx(
              'aspect-square min-h-12 rounded-full text-lg font-extrabold text-on-fill transition active:scale-95',
              value === n ? 'scale-105 ring-4 ring-ink ring-offset-2 ring-offset-bg' : 'ring-1 ring-black/5',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-sm text-muted">
        <span>0 · {low}</span>
        <span>{high} · 10</span>
      </div>
    </div>
  );
}

/* ---------------- Segmented options ---------------- */

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  cols,
}: {
  options: { value: T; label: string; emoji?: string }[];
  value?: T;
  onChange: (v: T | undefined) => void;
  label: string;
  cols?: number;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const sel = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={sel}
            onClick={() => onChange(sel ? undefined : o.value)}
            className={cx(
              'flex min-h-12 flex-col items-center justify-center rounded-2xl border-2 px-1 py-2 text-center text-[0.95rem] font-bold leading-tight transition active:scale-[0.97]',
              sel ? 'border-transparent bg-lav text-on-fill shadow-sm' : 'border-line bg-surface text-ink',
            )}
          >
            {o.emoji && (
              <span aria-hidden className="text-xl">
                {o.emoji}
              </span>
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ on, onChange, label, emoji }: { on: boolean; onChange: (v: boolean) => void; label: string; emoji?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={cx(
        'flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 px-3 font-bold transition active:scale-[0.97]',
        on ? 'border-transparent bg-sage text-on-fill' : 'border-line bg-surface text-ink',
      )}
    >
      {emoji && <span aria-hidden>{emoji}</span>}
      {label}
      {on && <span aria-hidden>✓</span>}
    </button>
  );
}

/* ---------------- Notes ---------------- */

export function NoteField({
  value,
  onChange,
  startOpen,
  label = 'Add a note',
}: {
  value?: string;
  onChange: (v: string) => void;
  startOpen?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(!!value || !!startOpen);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open && !value && !startOpen) ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!open)
    return (
      <LinkButton type="button" onClick={() => setOpen(true)}>
        ✏️ {label}
      </LinkButton>
    );
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-muted">Note (optional). Voice typing works here 🎙️</span>
      <textarea
        ref={ref}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        autoCapitalize="sentences"
        spellCheck
        className="w-full rounded-2xl border-2 border-line bg-surface p-3 text-base text-ink placeholder:text-muted focus:border-focus focus:outline-none"
        placeholder="Anything you want to remember…"
      />
    </label>
  );
}

/* ---------------- Dialog ---------------- */

export function Dialog({
  open,
  title,
  children,
  onClose,
  actions,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  onClose: () => void;
  actions: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      // Only user-initiated dismissal (Escape / back gesture) calls onClose.
      // The native 'close' event also fires when we close it from code, which
      // must not clear state that a follow-up dialog still needs.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-line bg-surface p-0 text-ink backdrop:bg-black/40"
    >
      {open && (
        <div className="p-5">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <div className="mt-2 text-muted">{children}</div>
          <div className="mt-5 grid gap-2">{actions}</div>
        </div>
      )}
    </dialog>
  );
}

/* ---------------- Banner ---------------- */

export function Banner({
  emoji,
  children,
  action,
  onDismiss,
  tone = 'lav',
}: {
  emoji: string;
  children: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  tone?: 'lav' | 'sage' | 'peach';
}) {
  const bg = tone === 'lav' ? 'bg-lav-soft' : tone === 'sage' ? 'bg-sage-soft' : 'bg-peach-soft';
  return (
    <div role="status" className={cx('anim-fade-up rounded-3xl p-3 pl-4', bg)}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="pt-2.5 text-xl">
          {emoji}
        </span>
        <div className="flex-1 pt-2.5 font-semibold">{children}</div>
        {onDismiss && (
          <IconButton label="Dismiss" onClick={onDismiss} className="text-base text-muted">
            ✕
          </IconButton>
        )}
      </div>
      {action && <div className="mt-2 grid">{action}</div>}
    </div>
  );
}
