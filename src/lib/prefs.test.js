import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFS, PREFS_KEY, prefs, setPref } from './prefs.js';

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
    setPref('unknown', true);

    expect(get(prefs)).toEqual(DEFAULT_PREFS);
  });
});
