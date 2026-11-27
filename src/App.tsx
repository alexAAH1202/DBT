import { Suspense, lazy, useEffect } from 'react';
import { AppProvider, Toaster, useApp } from './context';
import { useRoute } from './router';
import { syncReminders } from './lib/reminders';
import { Home } from './screens/Home';
import { QuickLog } from './screens/QuickLog';
import { CheckIn } from './screens/CheckIn';
import { Wave, WaveCard } from './screens/Wave';
import { DayView, History } from './screens/History';
import { Settings } from './screens/Settings';
import { ListEditor } from './screens/ListEditor';
import { CardEdit, CardsEditor } from './screens/CardsEditor';
import type { ListKind } from './types';

// Charts are the heaviest part of the app, so they load on demand (still precached for offline).
const Patterns = lazy(() => import('./screens/Patterns').then((m) => ({ default: m.Patterns })));

const LIST_KINDS: ListKind[] = ['emotions', 'triggers', 'urges', 'skills'];

function Routes() {
  const [a, b, c] = useRoute();
  const { settings, entries } = useApp();

  // Keep best-effort reminders in step with settings and today's check-ins.
  useEffect(() => {
    void syncReminders(settings, entries).catch(() => {});
  }, [settings, entries]);

  switch (a) {
    case 'quick':
      return <QuickLog />;
    case 'checkin':
      return <CheckIn key={b ?? 'new'} mode={b === 'resume' ? 'resume' : 'new'} />;
    case 'edit':
      return <CheckIn key={b} mode="edit" editId={b} />;
    case 'wave':
      return b ? <WaveCard id={b} /> : <Wave />;
    case 'patterns':
      return (
        <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
          <Patterns />
        </Suspense>
      );
    case 'history':
      return <History />;
    case 'day':
      return <DayView day={b} />;
    case 'settings':
      if (b === 'list' && LIST_KINDS.includes(c as ListKind)) return <ListEditor kind={c as ListKind} />;
      if (b === 'cards') return <CardsEditor />;
      if (b === 'card' && c) return <CardEdit key={c} id={c} />;
      return <Settings />;
    default:
      return <Home />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <Routes />
      <Toaster />
    </AppProvider>
  );
}
