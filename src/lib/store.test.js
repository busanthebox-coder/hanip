import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import { markLastPlayed, progress } from './store.js';

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
});
