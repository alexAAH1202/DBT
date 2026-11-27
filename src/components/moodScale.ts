/**
 * Sequential one-hue (peach/amber) ramp for average mood: light → deep in light
 * mode, dark → bright in dark mode. Never red/green. Each step carries its own
 * text colour chosen for WCAG AA contrast.
 */
const LIGHT = [
  { bg: '#f8ece2', fg: '#3a2e2a' },
  { bg: '#f6dcc7', fg: '#3a2e2a' },
  { bg: '#f2c7a6', fg: '#3a2e2a' },
  { bg: '#eeb085', fg: '#2b201c' },
  { bg: '#e89865', fg: '#2b201c' },
  { bg: '#de8350', fg: '#1f1512' },
];
const DARK = [
  { bg: '#3d3134', fg: '#f5ede7' },
  { bg: '#5a4038', fg: '#f5ede7' },
  { bg: '#7d5340', fg: '#ffffff' },
  { bg: '#b8774f', fg: '#1f1512' },
  { bg: '#d98b5e', fg: '#1f1512' },
  { bg: '#f4ab7f', fg: '#1f1512' },
];

export const MOOD_STEPS = LIGHT.length;

export function moodStep(mood: number): number {
  return Math.max(0, Math.min(MOOD_STEPS - 1, Math.floor((mood / 10) * MOOD_STEPS - 1e-9)));
}

export function moodColour(mood: number, dark = document.documentElement.classList.contains('dark')) {
  return (dark ? DARK : LIGHT)[moodStep(mood)];
}

export const moodRamp = (dark: boolean) => (dark ? DARK : LIGHT);
