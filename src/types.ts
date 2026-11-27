export type EntryType = 'quick' | 'checkin' | 'skill';
export type Acted = 'no' | 'little' | 'yes';
export type Helped = 0 | 1 | 2;

export interface EmotionRating {
  name: string;
  intensity?: number; // 0–10 (absent if the rating was skipped)
}

export interface UrgeRating {
  name: string;
  strength?: number; // 0–10 (absent if the rating was skipped)
  acted?: Acted;
}

export interface SkillRating {
  name: string;
  helped?: Helped; // 0 didn't help, 1 helped a bit, 2 helped a lot
}

export interface Body {
  sleepHours?: string; // '<4' | '4–5' | '6–7' | '8–9' | '10+'
  sleepQuality?: string; // 'poor' | 'okay' | 'good'
  meals?: string; // '0' | '1' | '2' | '3+'
  meds?: string; // 'Taken' | 'Partly' | 'Not yet' | 'N/A'
  water?: boolean;
  movement?: boolean;
  pain?: number; // 0–10
}

export interface Entry {
  id: string;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
  type: EntryType;
  slot?: string;
  emotions: EmotionRating[];
  triggers: string[];
  urges: UrgeRating[];
  body?: Body;
  skills: SkillRating[];
  overallMood?: number; // 0–10
  note?: string;
}

export type ListKind = 'emotions' | 'triggers' | 'urges' | 'skills';

export interface ListItem {
  id: string;
  name: string;
  emoji?: string;
  hidden?: boolean;
  group?: string; // skills only: module name
}

export interface Slot {
  id: string;
  name: string;
  time: string; // 'HH:MM'
}

export interface DistressCard {
  id: string;
  title: string;
  emoji: string;
  summary: string;
  steps: string[];
  skillName: string; // name recorded when "Log this" is used
  hidden?: boolean;
  custom?: boolean;
}

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  version: 1;
  slots: Slot[];
  lists: Record<ListKind, ListItem[]>;
  skillGroups: string[];
  cards: DistressCard[];
  theme: Theme;
  lastBackupAt?: string;
  backupReminderDismissedAt?: string;
  reminderPrefs: {
    inApp: boolean;
    notifications: boolean;
  };
  breathing: { inhale: number; exhale: number; vibrate: boolean };
  floatFavourites: boolean;
}

export interface Draft {
  entry: Entry;
  step: number;
  phase: 'pick' | 'rate';
  updatedAt: string;
}
