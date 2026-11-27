# Steady 🌿

A gentle, private emotional-regulation tracker for one person, built for use during and after a DBT-informed inpatient program.

- **Tap, don't type.** A quick log is 3 taps from the home screen. A full check-in never needs the keyboard.
- **No shame.** No red, no "missed" days, no judgement around urges. Streaks quietly reset with a "Welcome back 💛".
- **Private.** No accounts, no server, no analytics. Everything lives in IndexedDB on the phone.
- **Offline.** Installable PWA that works fully in airplane mode.

## Features

| Area | What's there |
| --- | --- |
| Home | Greeting, today's slots as dots, gentle streak + total days, one soft banner at a time (resume draft / check-in ready / backup), four big tiles in the thumb zone |
| ⚡ Quick log | Pick feelings → tap a number (that tap saves) → celebration. Optional trigger and note afterwards, plus undo |
| 📝 Check-in | 6 skippable steps: feelings + intensity, triggers, urges (strength + "did you act on it?"), body basics, skills (+ helpfulness), overall mood + slot + note. Autosaved as a draft after every tap, with "Pick up where you left off?" |
| 🌊 Riding a wave | TIPP, STOP, ACCEPTS, Self-soothe, IMPROVE, Radical acceptance, Opposite action, Wise mind. Paced breathing circle (4 in / 6 out, adjustable, optional vibration). "Log this" with how much it helped. Custom cards, edit or hide the defaults. Quiet 000 / Lifeline footer |
| 📈 My patterns | 7d / 30d / 3m / All. Mood graph (each check-in plus daily average, optional feeling-strength overlay, separate sleep chart), mood calendar, plain-language insights after 7 entries, skills ranked by how much they helped, top feelings and triggers |
| History | Every entry by day, with edit (re-uses the check-in flow) and delete (with confirmation) |
| Settings | Theme (system / light / dark), check-in times, editable lists (add / rename / hide / reorder; renames update history), skill cards, reminders, backup and restore, CSV export, clear data |

Options you pick often float to the top (after 2+ uses), and the first 8 show before "More…".

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (streaks, slots, insights, CSV, backup round trip)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build (service worker active)
```

**Demo data:** dev tools appear in Settings when running `npm run dev`. On a production build, open the browser console once and run `localStorage.setItem('steady-dev', '1')`. "Developer: demo data" can then seed 0 / 1 / 7 / 120 entries (it replaces existing entries).

## Deploying

The build uses relative paths and hash routing, so `dist/` works on any static host and under any sub-path.

- **GitHub Pages:** `.github/workflows/deploy.yml` tests, builds and deploys on every push to `main`. In the repository go to *Settings → Pages → Build and deployment → Source* and choose **GitHub Actions**.
- **Netlify / Cloudflare Pages:** build command `npm run build`, output directory `dist`.

## Installing on Android

Open the site in Chrome, then tap ⋮ → **Add to Home screen** (or **Install app**). Long-pressing the icon gives shortcuts to Quick log, Check-in and Riding a wave.

## Reminders: what to expect

A server-less web app can't guarantee notifications at exact times while it's closed, so Steady layers:

1. **In-app banner:** "Afternoon check-in is ready" when you open the app during a slot that hasn't had a check-in.
2. **Best-effort notifications** (opt-in, with a friendly explanation first): timers while the app is open or in the background, plus Periodic Background Sync on installed Chrome/Android when the browser allows it.
3. **Phone alarms:** Settings includes step-by-step instructions for Android Clock alarms labelled "Steady check-in". These are the reliable option.

## Backups

Data only lives on the phone, so:

- **Save a backup** downloads `steady-backup-YYYY-MM-DD.json` (all entries, settings, lists, cards and any draft).
- **Restore** shows what's in the file, then offers **Merge** (keep everything here, add what's new) or **Replace** (with a second confirmation).
- A dismissible banner suggests a backup when it's been 7+ days. Settings shows "Last backup: X days ago".
- **CSV export** gives a spreadsheet of entries for your own use.

## Tech

Vite + React + TypeScript, Tailwind CSS v4, Dexie (IndexedDB), Recharts (lazy-loaded), vite-plugin-pwa with a custom Workbox service worker (`src/sw.ts`). The Nunito font is bundled, so there are no third-party requests at runtime. Australian English throughout.

```
src/
  defaults.ts        default emotions, triggers, urges, skills, slots, skill cards
  db.ts              Dexie schema, settings, drafts, hooks
  lib/               pure logic: streaks, slots, insights, usage ordering, backup/CSV, reminders, demo data
  components/        UI kit (chips, 0–10 picker, dialogs), celebration, breathing, entry card
  screens/           Home, QuickLog, CheckIn, Wave, Patterns, History, Settings, editors
  sw.ts              precaching + reminder checks + notification clicks
```

## Verification

- Unit tests cover streak edge cases, slot tagging and due logic, usage ordering, insights at 0/1/7/120+ entries (including a no-judgemental-words check), skill ranking, CSV escaping, and export → clear → import restoring settings, entries and draft exactly.
- Checked in headless Chromium at 360×740: quick log in 3 taps; a full check-in with no typing; a draft surviving a reload; offline reload and use with zero external requests; edit/delete; backup → clear → restore through the UI producing an identical database.
- Lighthouse (mobile): Accessibility 100, Best Practices 100. axe-core (WCAG 2.1 AA) is clean on all 16 screens in light and dark with 120 entries. All tap targets are ≥ 48 px.
- Note: Lighthouse removed its PWA category in v12. Installability was checked directly (manifest with 192/512/maskable icons, standalone display, a service worker controlling the page, and offline start).
