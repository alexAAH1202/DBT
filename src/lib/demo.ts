/** Dev-only demo data, for testing graphs and insights at different sizes. */
import { db, uid } from '../db';
import { DEFAULT_EMOTIONS, DEFAULT_SKILLS, DEFAULT_TRIGGERS, DEFAULT_URGES, MEAL_OPTIONS, MED_OPTIONS, SLEEP_OPTIONS } from '../defaults';
import type { Entry, Helped } from '../types';
import { addDays, startOfDay } from './dates';

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export function makeDemoEntries(count: number, now = new Date(), seed = 42): Entry[] {
  const r = rng(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const some = <T,>(xs: T[], max: number) => {
    const n = 1 + Math.floor(r() * max);
    return [...new Set(Array.from({ length: n }, () => pick(xs)))];
  };
  const emotions = DEFAULT_EMOTIONS.slice(0, 14).map((e) => e.name);
  const triggers = DEFAULT_TRIGGERS.map((e) => e.name);
  const urges = DEFAULT_URGES.filter((u) => u.name !== 'Other').map((e) => e.name);
  const skills = DEFAULT_SKILLS.map((e) => e.name);
  const favSkills = ['TIPP', 'Music', 'Walk', 'Self-soothe', 'Wise mind', 'Talk to staff'];
  const slots: [string, number][] = [
    ['Morning', 9],
    ['Afternoon', 14],
    ['Evening', 20],
  ];

  const out: Entry[] = [];
  // Spread entries over roughly count/2 days, ending today.
  const spanDays = Math.max(0, Math.ceil(count / 2) - 1);
  for (let i = 0; i < count; i++) {
    const dayOffset = count === 1 ? 0 : Math.round((i / (count - 1)) * spanDays);
    const day = addDays(startOfDay(now), -spanDays + dayOffset);
    const [slot, hour] = slots[i % 3];
    const d = new Date(day);
    d.setHours(hour, Math.floor(r() * 50), 0, 0);
    if (d > now) d.setTime(now.getTime() - (count - i) * 60_000);
    const sleep = pick(SLEEP_OPTIONS);
    const tired = sleep === '<4' || sleep === '4–5';
    const evening = slot === 'Evening';
    const trend = i / Math.max(1, count); // gently improving over time
    const base = 4 + trend * 2.5 + (tired ? -1.8 : 0.6) + (evening ? -1 : 0) + (r() - 0.5) * 2.5;
    const mood = Math.max(0, Math.min(10, Math.round(base)));
    const isQuick = r() < 0.25;
    const emo = some(emotions, 3).map((name) => ({ name, intensity: Math.min(10, Math.max(1, Math.round(10 - mood + (r() - 0.5) * 4))) }));
    const e: Entry = {
      id: uid(),
      createdAt: d.toISOString(),
      type: isQuick ? 'quick' : 'checkin',
      slot,
      emotions: emo,
      triggers: tired && r() < 0.7 ? ['Tired', ...some(triggers, 1)] : r() < 0.6 ? some(triggers, 2) : [],
      urges: [],
      skills: [],
    };
    if (!isQuick) {
      e.overallMood = mood;
      if (r() < 0.55)
        e.urges = some(urges, 2).map((name) => ({
          name,
          strength: Math.max(0, Math.min(10, Math.round(7 - trend * 4 + (r() - 0.5) * 3))),
          acted: r() < 0.7 ? 'no' : r() < 0.6 ? 'little' : 'yes',
        }));
      if (r() < 0.7)
        e.skills = some(r() < 0.7 ? favSkills : skills, 2).map((name) => ({
          name,
          helped: (name === 'TIPP' || name === 'Music' ? (r() < 0.8 ? 2 : 1) : Math.floor(r() * 3)) as Helped,
        }));
      e.body = {
        sleepHours: sleep,
        sleepQuality: tired ? 'poor' : pick(['okay', 'good']),
        meals: pick(MEAL_OPTIONS),
        meds: pick(MED_OPTIONS),
        water: r() < 0.6,
        movement: r() < 0.5,
      };
      if (r() < 0.15) e.note = pick(['Group was hard today.', 'Visit from mum 💛', 'Couldn’t settle after lunch.', 'Felt proud of using a skill.']);
    }
    out.push(e);
  }
  return out;
}

export async function seedDemo(count: number) {
  await db.entries.clear();
  if (count > 0) await db.entries.bulkPut(makeDemoEntries(count));
}
