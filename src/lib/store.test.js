import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  markBiteDone,
  markLastPlayed,
  migrateCollected,
  progress,
  resetProgress,
  toggleStarred,
  warmupCards,
} from './store.js';
import { srs } from './srs.js';

describe('last played progress', () => {
  beforeEach(() => {
    progress.set({ done: {}, learned: [], bowls: {}, lastPlayed: null, collected: [], starred: [] });
    srs.set({});
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
    srs.set({ 한글: { interval: 3, due: 123 } });

    resetProgress();

    expect(get(progress)).toEqual({
      done: {},
      learned: [],
      bowls: {},
      lastPlayed: { biteOrSnackId: 'chapter-01-b2', at: 456 },
      collected: [],
      starred: [],
    });
    expect(get(srs)).toEqual({});
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

  it('uses the oldest due words for warmups and alternates card direction', () => {
    const learned = ['가다', '먹다', '보다'].map((ko, index) => ({
      kind: 'guess',
      word: { ko, en: ['to go', 'to eat', 'to see'][index], pos: 'verb' },
      options: ['to go', 'to eat', 'to see'],
    }));
    progress.set({
      done: { earlier: 1 }, learned, bowls: {}, lastPlayed: null, collected: [], starred: [],
    });
    srs.set({
      가다: { interval: 1, due: 200 },
      먹다: { interval: 1, due: 100 },
      보다: { interval: 1, due: 300 },
    });

    const cards = warmupCards({ cards: [] }, 2, 400);
    expect(cards.map((card) => card.word.ko)).toEqual(['먹다', '가다']);
    expect(cards.map((card) => card.direction)).toEqual(['ko→en', 'en→ko']);
  });

  it('falls back to the learned pool when no scheduled word is due', () => {
    const learned = [{
      kind: 'guess', word: { ko: '가다', en: 'to go', pos: 'verb' }, options: ['to go', 'to eat', 'to see'],
    }];
    progress.set({
      done: { earlier: 1 }, learned, bowls: {}, lastPlayed: null, collected: [], starred: [],
    });
    srs.set({ 가다: { interval: 1, due: 1_000 } });
    vi.spyOn(Math, 'random').mockReturnValueOnce(0);

    expect(warmupCards({ cards: [] }, 1, 500)[0].word.ko).toBe('가다');
    vi.restoreAllMocks();
  });

  it('counts a completed runtime review bite as a bowl', () => {
    markBiteDone({ id: 'review-today', kind: 'review', cards: [] });

    expect(get(progress).done['review-today']).toBeTypeOf('number');
    expect(get(progress).bowls[Object.keys(get(progress).bowls)[0]]).toBe(1);
  });
});

describe('order 23 — warmup ratio', () => {
  it('gives thin bites one warmup and full bites two', async () => {
    const { warmupCountFor } = await import('./store.js');
    expect(warmupCountFor({ cards: [{}, {}, {}] })).toBe(1);
    expect(warmupCountFor({ cards: [{}, {}, {}, {}] })).toBe(2);
    expect(warmupCountFor({ cards: [] })).toBe(1);
  });
});
