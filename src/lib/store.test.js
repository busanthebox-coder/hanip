import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import { markLastPlayed, progress, resetProgress } from './store.js';

describe('last played progress', () => {
  beforeEach(() => {
    progress.set({ done: {}, learned: [], bowls: {}, lastPlayed: null });
  });

  it('records the bite or snack id and timestamp without changing completion state', () => {
    markLastPlayed('snack-one', 1234);
    expect(get(progress)).toEqual({
      done: {},
      learned: [],
      bowls: {},
      lastPlayed: { biteOrSnackId: 'snack-one', at: 1234 },
    });
  });

  it('resets only learning progress and keeps the last played pointer', () => {
    progress.set({
      done: { 'chapter-01-b1': 123 },
      learned: [{ word: { ko: '한글' } }],
      bowls: { '2026-08-03': 2 },
      lastPlayed: { biteOrSnackId: 'chapter-01-b2', at: 456 },
    });

    resetProgress();

    expect(get(progress)).toEqual({
      done: {},
      learned: [],
      bowls: {},
      lastPlayed: { biteOrSnackId: 'chapter-01-b2', at: 456 },
    });
  });
});
