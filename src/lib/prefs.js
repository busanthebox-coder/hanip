import { writable } from 'svelte/store';

export const PREFS_KEY = 'hanip.prefs-v1';
export const DEFAULT_PREFS = Object.freeze({
  romaja: 'hidden',
  autoSpeak: true,
  sound: true,
  haptics: true,
  theme: 'auto',
  dailyGoal: 1,
});

const VALID_VALUES = {
  romaja: new Set(['hidden', 'shown']),
  autoSpeak: new Set([true, false]),
  sound: new Set([true, false]),
  haptics: new Set([true, false]),
  theme: new Set(['auto', 'light', 'dark']),
  dailyGoal: new Set([1, 2, 3]),
};

function valid(key, value) {
  return Object.hasOwn(VALID_VALUES, key) && VALID_VALUES[key].has(value);
}

function normalize(raw) {
  const next = { ...DEFAULT_PREFS };
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') return next;
  for (const [key, value] of Object.entries(raw)) {
    if (valid(key, value)) next[key] = value;
  }
  return next;
}

function loadPrefs() {
  try {
    return normalize(JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export const prefs = writable(loadPrefs());
prefs.subscribe((state) => {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(normalize(state))); } catch { /* private mode */ }
});

export function setPref(key, value) {
  if (!valid(key, value)) return;
  prefs.update((state) => ({ ...state, [key]: value }));
}
