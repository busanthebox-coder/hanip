import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFS, PREFS_KEY, prefs, recordPwaVisit, setPref } from './prefs.js';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

describe('preferences', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    prefs.set({ ...DEFAULT_PREFS });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with the phase-2 defaults', () => {
    expect(get(prefs)).toEqual({
      romaja: 'hidden',
      autoSpeak: true,
      sound: true,
      haptics: true,
      theme: 'auto',
      dailyGoal: 1,
      startChapter: 1,
      onboardingDone: false,
      pwaVisitCount: 0,
      installPromptDismissed: false,
    });
  });

  it('updates and persists a single preference without replacing the others', () => {
    setPref('romaja', 'shown');

    expect(get(prefs)).toEqual({ ...DEFAULT_PREFS, romaja: 'shown' });
    expect(JSON.parse(localStorage.getItem(PREFS_KEY))).toEqual({ ...DEFAULT_PREFS, romaja: 'shown' });
  });

  it('rejects unknown keys and values outside the preference contract', () => {
    setPref('dailyGoal', 4);
    setPref('theme', 'sepia');
    setPref('startChapter', 3);
    setPref('unknown', true);

    expect(get(prefs)).toEqual(DEFAULT_PREFS);
  });

  it('persists the selected starting chapter and onboarding completion', () => {
    setPref('startChapter', 12);
    setPref('onboardingDone', true);

    expect(get(prefs)).toMatchObject({ startChapter: 12, onboardingDone: true });
    expect(JSON.parse(localStorage.getItem(PREFS_KEY))).toMatchObject({ startChapter: 12, onboardingDone: true });
  });

  it('records at most two production visits for the one-time install offer', () => {
    recordPwaVisit();
    recordPwaVisit();
    recordPwaVisit();
    setPref('installPromptDismissed', true);

    expect(get(prefs)).toMatchObject({ pwaVisitCount: 2, installPromptDismissed: true });
    expect(JSON.parse(localStorage.getItem(PREFS_KEY))).toMatchObject({ pwaVisitCount: 2, installPromptDismissed: true });
  });
});
