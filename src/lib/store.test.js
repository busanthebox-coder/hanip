import { get } from 'svelte/store';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  markBiteDone,
  markLastPlayed,
  migrateCollected,
  progress,
  resetProgress,
  toggleStarred,
  warmupCards,
} from './store.js';

describe('last played progress', () => {
  beforeEach(() => {
    progress.set({ done: {}, learned: [], bowls: {}, lastPlayed: null, collected: [], starred: [] });
  });

  it('records the bite or snack id and timestamp without changing completion state', () => {
    markLastPlayed('snack-one', 1234);
    expect(get(progress)).toEqual({
      done: {},
      learned: [],
      bowls: {},
      lastPlayed: { biteOrSnackId: 'snack-one', at: 1234 },
      collected: [],
      starred: [],
    });
  });

  it('resets only learning progress and keeps the last played pointer', () => {
    progress.set({
      done: { 'chapter-01-b1': 123 },
      learned: [{ word: { ko: '한글' } }],
      bowls: { '2026-08-03': 2 },
      lastPlayed: { biteOrSnackId: 'chapter-01-b2', at: 456 },
      collected: ['chapter-01-b2'],
      starred: ['한글'],
    });

    resetProgress();

    expect(get(progress)).toEqual({
      done: {},
      learned: [],
      bowls: {},
      lastPlayed: { biteOrSnackId: 'chapter-01-b2', at: 456 },
      collected: [],
      starred: [],
    });
  });

  it('returns no warmups when a learner starts above A1 with an empty recall pool', () => {
    expect(warmupCards({
      cards: [{ kind: 'guess', word: { ko: '부탁하다' } }],
    })).toEqual([]);
  });

  it('collects a completed grammar bite and toggles a saved word without duplicates', () => {
    markBiteDone({ id: 'chapter-02-b2', kind: 'pattern', cards: [] });
    markBiteDone({ id: 'chapter-02-b2', kind: 'pattern', cards: [] });
    toggleStarred('한글');
    toggleStarred('한글');
    toggleStarred('문법');

    expect(get(progress).collected).toEqual(['chapter-02-b2']);
    expect(get(progress).starred).toEqual(['문법']);
  });

  it('backfills collected grammar cards from existing completion records', () => {
    progress.set({
      done: { 'chapter-02-b2': 1, 'chapter-02-b1': 1 },
      learned: [], bowls: {}, lastPlayed: null, collected: [], starred: [],
    });
    migrateCollected({
      chapters: [{ bites: [
        { id: 'chapter-02-b1', kind: 'words' },
        { id: 'chapter-02-b2', kind: 'pattern' },
      ] }],
    });

    expect(get(progress).collected).toEqual(['chapter-02-b2']);
  });
});
