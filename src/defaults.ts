import type { DistressCard, ListItem, Settings, Slot } from './types';

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const items = (names: string[], group?: string): ListItem[] =>
  names.map((name) => ({ id: slug((group ? group + '-' : '') + name), name, ...(group ? { group } : {}) }));

export const DEFAULT_EMOTIONS: ListItem[] = (
  [
    ['Happy', '😊'],
    ['Calm', '😌'],
    ['Hopeful', '🌱'],
    ['Proud', '🌟'],
    ['Sad', '😢'],
    ['Lonely', '🫥'],
    ['Anxious', '😰'],
    ['Scared', '😨'],
    ['Angry', '😠'],
    ['Frustrated', '😤'],
    ['Irritable', '😒'],
    ['Ashamed', '😳'],
    ['Guilty', '😔'],
    ['Overwhelmed', '🌪️'],
    ['Numb', '😶'],
    ['Empty', '🕳️'],
    ['Restless', '⚡'],
    ['Jealous', '💚'],
    ['Hurt', '💔'],
    ['Exhausted', '🥱'],
  ] as const
).map(([name, emoji]) => ({ id: slug(name), name, emoji }));

export const DEFAULT_TRIGGERS: ListItem[] = items([
  'Conflict',
  'Feeling rejected / left out',
  'Criticism',
  'Overwhelm / too much to do',
  'Tired',
  'Hungry',
  'Pain / unwell',
  'Loneliness',
  'Boredom / understimulated',
  'Noise / sensory overload',
  'Change of plans',
  'Memories',
  'Social media',
  'Ward / hospital environment',
  'Unknown / out of the blue',
  'Other',
]);

export const DEFAULT_URGES: ListItem[] = items([
  'Shut down / hide',
  'Yell / lash out',
  'Cry',
  'Run away / leave',
  'Self-harm',
  'Use substances',
  'Binge / restrict food',
  'Spend money',
  'Quit / give up',
  'Text someone impulsively',
  'Other',
]);

export const SKILL_GROUPS = [
  'Mindfulness',
  'Distress tolerance',
  'Emotion regulation',
  'Interpersonal effectiveness',
  'My own',
];

export const DEFAULT_SKILLS: ListItem[] = [
  ...items(['Wise mind', 'Observe', 'Describe', 'Participate', 'Non-judgemental stance', 'One-mindfully'], 'Mindfulness'),
  ...items(
    [
      'TIPP',
      'STOP',
      'Pros & cons',
      'ACCEPTS',
      'Self-soothe',
      'IMPROVE',
      'Radical acceptance',
      'Turning the mind',
      'Willingness',
    ],
    'Distress tolerance',
  ),
  ...items(
    ['Check the facts', 'Opposite action', 'Problem solving', 'ABC PLEASE', 'Build mastery', 'Cope ahead'],
    'Emotion regulation',
  ),
  ...items(['DEAR MAN', 'GIVE', 'FAST'], 'Interpersonal effectiveness'),
  ...items(['Music', 'Walk', 'Shower', 'Talk to staff', 'Fidget toy', 'Sleep'], 'My own'),
];

/** Shown first in the skills step before the user has any history. */
export const STARTER_SKILLS = ['TIPP', 'STOP', 'Self-soothe', 'Wise mind', 'Opposite action', 'Music', 'Walk', 'Talk to staff'];

export const DEFAULT_SLOTS: Slot[] = [
  { id: 'morning', name: 'Morning', time: '09:00' },
  { id: 'afternoon', name: 'Afternoon', time: '14:00' },
  { id: 'evening', name: 'Evening', time: '20:00' },
];

export const DEFAULT_CARDS: DistressCard[] = [
  {
    id: 'tipp',
    title: 'TIPP',
    emoji: '🧊',
    skillName: 'TIPP',
    summary: 'Change your body chemistry fast when emotions are sky-high.',
    steps: [
      'Temperature: splash cold water on your face or hold something cold (ice pack, cold drink) for 30 seconds.',
      'Intense exercise: move hard for a minute or two. Star jumps, fast walking, stairs.',
      'Paced breathing: breathe out longer than you breathe in. Try the breathing circle above.',
      'Paired muscle relaxation: tense a muscle group as you breathe in, let it go as you breathe out.',
      'If you have a heart condition, check with your team before using cold water.',
    ],
  },
  {
    id: 'stop',
    title: 'STOP',
    emoji: '✋',
    skillName: 'STOP',
    summary: 'Pause before an urge takes the wheel.',
    steps: [
      'Stop. Freeze for a moment. Don’t move a muscle.',
      'Take a step back. Breathe. Give yourself a little space.',
      'Observe. What’s happening inside you and around you?',
      'Proceed mindfully. Ask: what will make this better, not worse?',
    ],
  },
  {
    id: 'accepts',
    title: 'ACCEPTS',
    emoji: '🧩',
    skillName: 'ACCEPTS',
    summary: 'Distract yourself until the wave passes.',
    steps: [
      'Activities: do something absorbing. A puzzle, colouring, a game, tidying.',
      'Contributing: do something kind for someone else.',
      'Comparisons: remember a time you got through something hard.',
      'Emotions: create a different feeling. Funny video, upbeat song.',
      'Pushing away: put the problem on a shelf for now. You can come back to it.',
      'Thoughts: count tiles, name colours, recite lyrics.',
      'Sensations: hold ice, have a warm shower, squeeze a stress ball.',
    ],
  },
  {
    id: 'self-soothe',
    title: 'Self-soothe with the 5 senses',
    emoji: '🕯️',
    skillName: 'Self-soothe',
    summary: 'Be kind to yourself through your senses.',
    steps: [
      'Sight: look at something calming. Sky, photos, a nature video.',
      'Sound: soft music, rain sounds, a familiar voice.',
      'Smell: hand cream, tea, a favourite scent.',
      'Taste: something warm to sip, a mint, a small treat. Go slowly.',
      'Touch: a soft blanket, warm water on your hands, a pet or fidget.',
    ],
  },
  {
    id: 'improve',
    title: 'IMPROVE the moment',
    emoji: '🌤️',
    skillName: 'IMPROVE',
    summary: 'Make this moment a little more bearable.',
    steps: [
      'Imagery: picture a safe, calm place in detail.',
      'Meaning: find any meaning or purpose, even a small one.',
      'Prayer or connection to something bigger than you.',
      'Relaxation: loosen your shoulders, jaw and hands.',
      'One thing in the moment: focus fully on just what you’re doing.',
      'Vacation: take a brief break. Five minutes off.',
      'Encouragement: talk to yourself like a good friend. “I can get through this.”',
    ],
  },
  {
    id: 'radical-acceptance',
    title: 'Radical acceptance',
    emoji: '🌊',
    skillName: 'Radical acceptance',
    summary: 'Stop fighting what you can’t change right now.',
    steps: [
      'Notice you’re fighting reality (“This shouldn’t be happening”).',
      'Remind yourself: this is how it is right now.',
      'Remember there are causes, even if you don’t like them.',
      'Accept with your body too: open hands, soft face, slow breath.',
      'Let the feelings come. Acceptance can sit alongside sadness.',
      'Turn your mind back to acceptance as many times as you need.',
    ],
  },
  {
    id: 'opposite-action',
    title: 'Opposite action',
    emoji: '🔄',
    skillName: 'Opposite action',
    summary: 'When an emotion doesn’t fit the facts, act the opposite way.',
    steps: [
      'Name the emotion and the urge that comes with it.',
      'Ask: does this emotion fit the facts? Would acting on it help?',
      'If not, work out the opposite action. (Want to hide? Reach out. Want to yell? Speak gently.)',
      'Do the opposite action all the way, including your face and posture.',
      'Keep going until the emotion eases a little.',
    ],
  },
  {
    id: 'wise-mind',
    title: 'Wise mind',
    emoji: '🦉',
    skillName: 'Wise mind',
    summary: 'Find the middle ground between feeling and thinking.',
    steps: [
      'Sit comfortably and take a few slow breaths.',
      'Notice your emotion mind: what are your feelings saying?',
      'Notice your reasonable mind: what are the facts?',
      'Breathe in thinking “wise”, breathe out thinking “mind”.',
      'Ask yourself: what does my wise mind know here? Wait for an answer.',
    ],
  },
];

export const defaultSettings = (): Settings => ({
  version: 1,
  slots: structuredClone(DEFAULT_SLOTS),
  lists: {
    emotions: structuredClone(DEFAULT_EMOTIONS),
    triggers: structuredClone(DEFAULT_TRIGGERS),
    urges: structuredClone(DEFAULT_URGES),
    skills: structuredClone(DEFAULT_SKILLS),
  },
  skillGroups: [...SKILL_GROUPS],
  cards: structuredClone(DEFAULT_CARDS),
  theme: 'system',
  reminderPrefs: { inApp: true, notifications: false },
  breathing: { inhale: 4, exhale: 6, vibrate: false },
  floatFavourites: true,
});

export const SLEEP_OPTIONS = ['<4', '4–5', '6–7', '8–9', '10+'];
export const SLEEP_HOURS_VALUE: Record<string, number> = { '<4': 3, '4–5': 4.5, '6–7': 6.5, '8–9': 8.5, '10+': 10 };
export const SLEEP_QUALITY = [
  { value: 'poor', label: 'Poor', emoji: '😴' },
  { value: 'okay', label: 'Okay', emoji: '🙂' },
  { value: 'good', label: 'Good', emoji: '😊' },
];
export const MEAL_OPTIONS = ['0', '1', '2', '3+'];
export const MED_OPTIONS = ['Taken', 'Partly', 'Not yet', 'N/A'];
export const MILESTONES = [3, 7, 14, 30];
