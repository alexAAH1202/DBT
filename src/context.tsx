import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useEntries, useSettings } from './db';
import type { Entry, Settings, Theme } from './types';
import { usageCounts, type UsageCounts } from './lib/usage';

interface AppData {
  settings: Settings;
  entries: Entry[];
  usage: UsageCounts;
}

const Ctx = createContext<AppData | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const entries = useEntries();
  const usage = useMemo(() => usageCounts(entries ?? []), [entries]);
  useTheme(settings?.theme);
  if (!settings || !entries) return <div className="min-h-dvh bg-bg" aria-busy="true" />;
  return <Ctx.Provider value={{ settings, entries, usage }}>{children}</Ctx.Provider>;
}

export function useApp(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}

export function useTheme(theme: Theme | undefined) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const t = theme ?? (localStorage.getItem('steady-theme') as Theme | null) ?? 'system';
      const dark = t === 'dark' || (t === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1d191b' : '#fbf5ee');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

export function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/** Re-render every `ms` so time-based banners stay current. */
export function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    const vis = () => document.visibilityState === 'visible' && setNow(new Date());
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [ms]);
  return now;
}

/* ---------------- Toast ---------------- */

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent('steady-toast', { detail: message }));
}

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: number | undefined;
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), 3200);
    };
    window.addEventListener('steady-toast', on);
    return () => window.removeEventListener('steady-toast', on);
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      {msg && (
        <div className="anim-fade-up rounded-2xl bg-ink px-4 py-3 font-semibold text-bg shadow-lg">{msg}</div>
      )}
    </div>
  );
}
